---
title: "Ghost Ship Unloaded"
date: 2026-11-01T04:30:00+05:30
description: "Decode a Java loader's obfuscated master key, decrypt its runtime-loaded class file, and recover a token-and-seal pair scattered across three separate artifacts to finally open the vault."
category: "Reverse Engineering"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Hard"
points: 300
flag: "flag{gh0st_sh1p_j4v4_d3c0d3d_q4z4gn3_unm4sk3d_9f4c8a}"
author: "Reshma Al (Coldcoffee)"
tools: "javap/jar, Python 3, AES-CBC, SHA-256"
tags:
  - "Reverse Engineering"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>flag{gh0st_sh1p_j4v4_d3c0d3d_q4z4gn3_unm4sk3d_9f4c8a}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('flag{gh0st_sh1p_j4v4_d3c0d3d_q4z4gn3_unm4sk3d_9f4c8a}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. What's Provided
Three files: `Remittance_Manifest.jar`, `captains_log.enc`, and `ship_manifest.json`. The jar holds three encrypted blobs under `assets/`, and notably **no** `QaZagne` class anywhere in it, despite the loader clearly expecting to use one — which means it has to be loaded and decrypted at runtime from one of those encrypted blobs. Every key the loader needs turns out to be recoverable statically, without ever running the jar.

---

## 2. Recovering the Master Key
`Header.RAW_CHART` is an int array obfuscated with a simple two-step transform: each element is XORed with 90, then with `(i*17+3) & 255`. Reversing that transform decodes it into:

```
KEY:BlackMeridian171|IV:SargassoSea2026!|SEED:9942
```

Both the key and IV strings are exactly 16 bytes, which points straight at AES-128-CBC.

---

## 3. Decrypting the Runtime Class
With the master key and IV in hand, `assets/manifest.idx` decrypts cleanly and names the log's salt as `C4PT41N_V4N3_SALT_1718`, with a derivation of `SHA256(MasterKey + Salt)[:16]`. `assets/payload_alpha.bin` decrypts into a file starting with `CAFEBABE` — a Java class file, and specifically the missing `QaZagne` class that the jar never shipped directly. Its `unlockTreasureVault(vault, token, seal)` method defines its own key schedule:

- key = `SHA256(token + ":" + seal)[:16]`
- iv = `SHA256(seal + ":" + token)[:16]`

So the remaining work is finding the right `token` and `seal` values to feed into it.

---

## 4. Recovering the Token
`captains_log.enc` is AES-128-CBC again, keyed with `SHA256("BlackMeridian171" + salt)[:16]` — unlike the jar's internal assets, this file prefixes its own 16-byte IV directly at the start rather than reusing a fixed one. Decrypting it reveals the log text, which contains `NAV-TOKEN-CAPTAIN-VANE-7701` — the token `unlockTreasureVault` is waiting for.

---

## 5. Recovering the Seal
The seal sits in plain sight in `ship_manifest.json`, under `manifest_seal`: `MERIDIAN-SEAL-1718-X99`. The same JSON file also has a `verification_hash` field sitting right next to it, which looks like it should matter — but it's a decoy; plugging it in where the seal belongs just produces garbage.

---

## 6. Opening the Vault
Feeding the recovered token and seal into `unlockTreasureVault`'s key schedule successfully decrypts `assets/vault.dat` into the treasure manifest and the flag.

**Flag:** `flag{gh0st_sh1p_j4v4_d3c0d3d_q4z4gn3_unm4sk3d_9f4c8a}` (the vault itself prints it lowercase)

---

## 7. Takeaways
- A class that's absent from a jar's visible contents but clearly referenced by loader code is almost always decrypted or decompressed at runtime from somewhere else in the archive — go looking for it in the encrypted assets rather than assuming the jar is incomplete.
- `CAFEBABE` is worth recognizing on sight in any decrypted blob — it's the Java class-file magic number, and seeing it appear is immediate confirmation a decryption step succeeded correctly.
- When a key schedule swaps the order of two values between the key and the IV derivation (`token:seal` vs. `seal:token`), copy it exactly — a key/IV transposition error produces plausible-looking garbage rather than an obvious failure.
- A field that looks like it should be the answer (a "verification hash" sitting next to the real seal) is exactly the kind of thing worth testing and discarding quickly, rather than assuming it must be relevant because of its name.
