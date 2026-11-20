---
title: "Phantom Mesh"
date: 2026-10-12T16:00:00+05:30
description: "Repair corrupted Reed-Solomon install codes to unlock a Zigbee network key, then catch a counter-cloning impostor device by predicting its heartbeat keystream and unmasking the audit slack only its stolen identity could write."
category: "IoT"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{c0un73r_cl0n3_wh15p3r5_1n_7h3_5l4ck}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, Wireshark, Berlekamp-Massey / Chien search, AES-CCM*"
tags:
  - "IoT"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{c0un73r_cl0n3_wh15p3r5_1n_7h3_5l4ck}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{c0un73r_cl0n3_wh15p3r5_1n_7h3_5l4ck}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Story the Gateway Log Tells
A cold-storage archive accepted a maintenance instruction, and every device on the official work order denies sending it. The gateway's own event log narrates the whole incident: the real relay device commissions normally, gets a routine audit accepted, then rejoins under a brand-new short address due to an address conflict — and immediately after, a key rotation happens, a legacy "alias override" policy quietly admits traffic still claiming the relay's *old* address, and an unexplained instruction gets accepted under that old address. Something is still talking as the relay, using an identity it no longer owns.

---

## 2. Repairing the Install Codes With Reed-Solomon
Getting anywhere in this capture starts with the link-layer keys, and those come from each device's install code, stored in aged flash alongside Reed-Solomon check bytes — but with no record of exactly which RS configuration was used. Since the codeword structure (18 data symbols, 6 check symbols) is known, I searched the parameter space directly: every primitive polynomial, generator step, and first-consecutive-root value, with and without byte reversal, keeping only the configuration under which every record decodes with few enough errors to make sense. Exactly one configuration works consistently, and applying Berlekamp-Massey decoding with a Chien search under it corrects every install code so that each one passes its own standard Zigbee CRC-16 check — giving real, usable link keys for every device on the work order.

---

## 3. Getting the Network Key
Two captured frames are standard Zigbee key-transport commands, each encrypted under a key derived directly from one device's now-recovered link key. Decrypting either one hands over the active network key, which immediately unlocks every network-layer frame recorded before the later key rotation.

---

## 4. Learning the Archive's Own Protocol From Honest Traffic
Two genuinely honest archive sessions sit inside that newly decrypted traffic, and since the manufacturer's own protocol notes leave several details unstated, those two clean sessions serve as a reference: they reveal the storage layout's byte transpose, the exact compressed record stream format, a compact custom string encoding, how a completion digest is computed, and how "slack" bytes (storage left unused by a record) get masked by each writer's own per-device audit key. Both of these honest sessions decode to exactly what the gateway log already describes — confirming the reconstructed protocol details are correct before trusting them on anything adversarial.

---

## 5. The Key Rotation Doesn't Stop the Attack
The actual incident happens *after* a key rotation, and that later key is never transported anywhere in the capture — so none of the post-rotation traffic decrypts directly. The weakness is structural, not cryptographic: the genuine relay device, now on its new address, keeps sending regular heartbeat messages whose frame counters increment by exactly one each time. The impostor, still broadcasting under the relay's *old* address, reuses the **same EUI and the same frame counter sequence** as the real device's heartbeats. Since the encryption nonce is built directly from EUI and frame counter, any impostor frame sharing a counter value with a genuine heartbeat reuses that exact same keystream — meaning XOR-ing the impostor's ciphertext against a heartbeat's ciphertext and known plaintext recovers the impostor's own plaintext directly, with no key needed at all.

---

## 6. Predicting the Heartbeat Keystream Exactly
Every field inside a heartbeat message is predictable: counters that simply increment, a constant identifying string, an uptime value that also increments steadily — and one field that looks like noise but is actually a plain xorshift32 pseudo-random generator, verified by checking that every decryptable pre-rotation heartbeat's "random" value is exactly the generator's output applied to the previous one. Running that same generator forward from its last known pre-rotation value predicts every post-rotation heartbeat's plaintext exactly, with zero unknown bytes left anywhere — which in turn fully recovers every impostor frame that shares a counter with one of those heartbeats.

---

## 7. The Cover Story, and the Real Message Hidden in the Slack
The impostor runs the same archive session twice, at two different points, with an identical visible record both times — an "override" entry with no attached note, naming the real relay's identity and the accepted receipt number. That's the cover story. The genuinely interesting content sits in each page's unused "slack" bytes, which only unmask correctly under the audit key belonging to *one specific device* — a vent damper that inventory records say was long since decommissioned and returned to stores. Its real hardware identity differs from the relay's by a single bit. The impostor is that decommissioned board, physically reused, broadcasting under the relay's old network address and cloned frame counters.

Unmasking and decoding the slack from both impostor sessions reveals a first, earlier message about a pending alias-table override, and a second message — attached to the exact session the gateway log records as accepted — spelling out the instruction that was actually smuggled in.

**Flag:** `isfcr{c0un73r_cl0n3_wh15p3r5_1n_7h3_5l4ck}`

---

## 8. Takeaways
- A missing Reed-Solomon configuration doesn't have to be a dead end — if the data layout and check-symbol count are known, brute-forcing the handful of standard parameter choices (primitive polynomial, generator, first consecutive root, byte order) usually narrows to exactly one consistent configuration quickly.
- A legacy "alias override" or backward-compatibility policy sitting in an access-control system is exactly the kind of thing worth treating with suspicion — anything designed to admit traffic under an identity that should no longer be valid is a standing invitation for impersonation.
- Reusing a nonce (here, by cloning both EUI and frame counter) breaks stream-cipher-style encryption completely: any two messages sharing a nonce leak their XOR directly, and if one side's plaintext is predictable, the other side's plaintext falls out for free.
- A "random-looking" field is worth testing against common lightweight PRNGs before assuming it's a true unknown — many embedded devices use something as simple as xorshift32, and once identified, its entire future output sequence becomes fully predictable.
- Validate any reconstructed protocol against known-honest traffic before trusting it against adversarial traffic — two legitimate sessions decoding to exactly their logged description is strong confirmation a format reconstruction is correct.
