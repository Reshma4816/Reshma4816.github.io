---
title: "Silent Session"
date: 2026-10-12T15:00:00+05:30
description: "Exploit a mutable PendingIntent that lets a caller fill in the one security-relevant extra a bound Android service forgot to set itself, then recover the rest of the key chain from static constants alone."
category: "Mobile Security"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Medium"
points: 350
flag: "isfcr{h4nd0ff_tr4nscr1pt_s3al3d_by_th3_s1gn3r}"
author: "Reshma Al (Coldcoffee)"
tools: "jadx, openssl, Python 3"
tags:
  - "Mobile Security"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{h4nd0ff_tr4nscr1pt_s3al3d_by_th3_s1gn3r}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{h4nd0ff_tr4nscr1pt_s3al3d_by_th3_s1gn3r}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. A Deliberately Tiny App
`SILENTSESSION.apk` ("Sentinel Recovery") is only about 26 KB of DEX across ten classes — small enough that `jadx` exposes essentially the whole attack surface at a glance. The entire exploit boils down to driving the app's own internal "session" channel exactly the way its own relay component was designed to be driven, but supplying the one field the service itself never actually sets.

---

## 2. The Permission Boundary That Matters
The manifest defines two custom permissions: one protection-level `normal` (meaning any installed app gets it automatically, no user prompt at all) and one protection-level `signature` (meaning only an app signed with the same key can hold it). The service that matters — `SessionService` — is bound using the **normal** permission. A signature-protected console activity looks like the "real" privileged surface, but it's a dead end; the actual exploitable component sits behind the permission anyone can get.

---

## 3. The Session Channel's Design Flaw
The service's AIDL interface lets a bound client subscribe, open a new session (which generates three random per-slot tokens and returns three `PendingIntent`s, each wrapped around an explicit intent targeting an internal, non-exported "relay" activity), advance a session by one step given a token and a matching "proof" value, and finally fetch the session's sealed result once every step has succeeded.

The step function itself checks that the caller's UID equals the service's own process UID — which looks like a same-process-only restriction, but isn't a real security boundary at all: the relay activity, which runs *inside* the app's own process, calls that exact step function on the app's behalf, reading the token and the "proof" value straight out of its launching Intent's extras. Critically, the service's own code that constructs those PendingIntents never populates the proof extra — and the three PendingIntents are built with `FLAG_MUTABLE`. Since a mutable PendingIntent merges whatever extras the *sender* supplies into the base intent when it's triggered, any caller holding one of these intents can fill in exactly the "proof" field the service forgot to set.

---

## 4. Deriving What the Proof Should Be
The correct proof value per slot isn't random at all — it's a static constant, obfuscated with a SHA-256-label-derived XOR mask baked right into the app. Decoding each masked constant with its corresponding label directly recovers the three real proof tokens. With all three correct token/proof pairs now known, triggering the three PendingIntents (supplying only the proof extra on each, since the token itself is simply read back from the intent the service already built) drives the session to completion.

---

## 5. The Final Key Material
Completing all three steps makes the service compute a "grant" value by folding a seed through HMAC-SHA256 with each of the three proof tokens in turn, then one final time with a hash of the app's own APK signing certificate (extracted directly from the APK's signature block). That grant, XORed against two other static app secrets, becomes the input keying material for an HKDF-SHA256 derivation, which produces the AES-256-GCM key that decrypts a small sealed asset shipped inside the APK — the flag itself. None of this chain depends on any runtime secret the service holds exclusively; every single input is either a static constant inside the APK or derivable from the APK's own signing certificate, which means the entire grant/seal chain can be computed completely offline, with no device or emulator needed at all.

**Flag:** `isfcr{h4nd0ff_tr4nscr1pt_s3al3d_by_th3_s1gn3r}`, confirmed by the AES-GCM tag verifying against the shipped sealed asset.

---

## 6. Takeaways
- A `PendingIntent` built with `FLAG_MUTABLE` hands real control to whoever eventually triggers it — if the launched component reads a security-relevant field from its own launching Intent, the *sender* of that PendingIntent effectively gets to decide that field's value, not the component that originally built the intent.
- Checking that a caller's UID matches your own process's UID is not an authorization boundary on its own; it only proves the call arrived through one of your own app's components, and if any of those components can be triggered by an external, attacker-controlled PendingIntent, that "same-process" check provides no real protection.
- Obfuscating static constants with a simple label-derived XOR mask doesn't create secrecy against someone willing to read the obfuscation routine itself — it just adds one extra, mechanical decoding step before the real values are available.
- A signature-protected component sitting prominently in a manifest is often exactly the kind of decoy worth walking past quickly — the real exploitable surface is frequently the permission everyone already has, not the one that looks locked down.
