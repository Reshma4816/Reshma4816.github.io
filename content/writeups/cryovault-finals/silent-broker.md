---
title: "Silent Broker"
date: 2026-10-12T09:00:00+05:30
description: "Rebuild an MQTT broker's exact delivery behavior from its log file to separate what a packet tap merely overheard from what the archive actually received, then decrypt the surviving instruction."
category: "Digital Forensics"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{d3l1v3r3d_n07_53n7_3e52ba22199f3d65bd896972}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, custom MQTT broker emulator, AES-256-GCM, HKDF, RFC3394 key unwrap"
tags:
  - "Digital Forensics"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{d3l1v3r3d_n07_53n7_3e52ba22199f3d65bd896972}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{d3l1v3r3d_n07_53n7_3e52ba22199f3d65bd896972}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. What the Tap Saw vs. What the Archive Got
The core trap in this challenge is right there in the title: a packet tap (`plant.pcap`) recorded everything the broker was ever sent, but that's not the same thing as what the archive (`hist-cold-2`) actually received. The task is to figure out which frames survived the broker's own delivery rules, reassemble them, and decrypt what's left.

Telemetry sits inside MQTT payloads as CB3 frames: a fixed header (`A7 31 | rev | lane | epoch(4) | counter(2) | block count(2) | data len(2)`), then data, then a 16-byte HMAC tag. Two candidate publish routes show up in the capture — `b7/41` and `b7/14` — but `b7/41`'s frames carry mismatched epochs and counters that never verify under any key combination. That's the decoy; `b7/14` is the real route.

---

## 2. Deriving the Key Material
`service-bulletin.txt` lays out the derivation chain. A binding hash, `sha256(serial|rev|ticket)[:16]`, maps ACL identities to physical boards — one binding matches the real board `MX-0B17` rev 4, a second matches a superseded rev 2 relay, and a third matches a visually similar but wrong board (`MX-OB17`, letter O instead of zero). The KEK comes from `HKDF(ticket, plant_salt, "KEK|MX-0B17|4")`, and RFC3394-unwrapping gateway slot 11 with that KEK gives the commissioning root — it only unwraps successfully for this exact ticket/slot pair, which is a built-in confirmation that the right board was identified.

From there, `mosquitto-pre.db` supplies the lease salt, epoch, and origin for the route owner (`edge-b7-14`). Building `context = "CB3|edge-b7-14|b7/14|<epoch>"` and running `HKDF(root, lease_salt, context)` for 64 bytes splits cleanly into 32 bytes of cipher material and 32 bytes of MAC material. The HMAC tag only verifies against topic `plant/l3/b7/14/telemetry` — not the similar-looking `telemetry/` topic that other frames use, which is another decoy filtered out for free.

---

## 3. The Real Trap: Too Many Valid Blocks
Even after narrowing to the right route and key, every one of the 48 frame counters has *multiple* validly-tagged blocks with different data — assembling all of them fails the final AEAD check immediately. The archive only ever stores what the broker actually delivered to it, so the fix is modeling the broker's delivery behavior precisely rather than trusting the capture at face value.

I wrote a small MQTT broker emulator over the pcap that enforces:

- **Subscription filtering** — the archive only subscribes to `plant/l3/+/+/telemetry` and `factory/line-03/+/telemetry` (QoS 1); anything published to a bare `telemetry/` topic never reaches it at all.
- **ACL enforcement** — only the binding matching `edge-b7-14`/`svc-b7-14` may publish to `b7/14`; publishes from the relay or an unrelated cart identity are dropped.
- **QoS2 message-ID reuse** — a message is delivered only on PUBREL, and a later PUBLISH reusing an already-stored message ID (duplicate flag or not) silently replaces the stored message. This reproduces all 40 "Reused message ID" lines in `broker.log` exactly, which is the validation check that confirms the emulator's logic is right.
- **Offline queueing and v5 message expiry** — the archive drops offline for roughly ten seconds in the log; only QoS ≥ 1 gets queued for it, that queue survives a broker restart via `mosquitto-recovery.db`, and any offline-queued message carrying a 1-second MQTT v5 expiry dies before the archive reconnects (confirmed by the expiry timestamps recorded in that same recovery file).

Running every captured frame through this model leaves exactly one surviving, correctly-ordered block per counter — ordered as `(counter − origin) mod 65536`.

---

## 4. Decrypting the Assembled Instruction
Per `service-bulletin.txt` page 9, the assembled bytes split as `S || M` with a 32-byte `M`. The real key is `K = M XOR SHA256(cipher_material || S)`, and `S` itself unpacks into a 12-byte nonce, the AES-256-GCM ciphertext, and a 16-byte tag, with AAD built from the context string plus the origin as a big-endian u16. The GCM tag verifies cleanly, and the plaintext is a JSON commissioning instruction carrying the receipt directly:

```json
{"activation":"next controlled cold start","batch":"d94ba350eb92d5aef86ef30170f73","cell":"L3",
 "operation":"stage_calibration_recipe","parameters":[...],
 "receipt":"isfcr{d3l1v3r3d_n07_53n7_3e52ba22199f3d65bd896972}",
 "route":"b7/14","schema":"commissioning-instruction/4","work_order":"WO-7316"}
```

**Flag:** `isfcr{d3l1v3r3d_n07_53n7_3e52ba22199f3d65bd896972}`

---

## 5. Takeaways
- A packet capture records what was *sent toward* a broker, not what any particular subscriber actually *received* — subscription filters, ACLs, QoS semantics, and message expiry all sit between the two, and skipping any of them produces plausible-looking but wrong assembled data.
- QoS2's message-ID reuse behavior (a later PUBLISH silently replacing an unacknowledged one at the same ID) is exactly the kind of protocol-level subtlety that turns "multiple valid blocks per slot" from a dead end into a solvable ordering problem.
- A broker's own log file can double as a validation oracle for a reconstructed delivery model — matching every logged event (here, all 40 "Reused message ID" lines) is strong independent confirmation the emulator's rules are correct, rather than just internally consistent.
- When several binding hashes map to visually similar identifiers (`MX-0B17` vs. `MX-OB17`), treat that similarity as a deliberately placed trap rather than a typo in the challenge data.
