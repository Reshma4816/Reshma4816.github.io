---
title: "The Cursed APK"
date: 2026-11-01T08:00:00+05:30
description: "Reverse an Android app's passphrase construction and environment-dependent token derivation to reproduce the clean-device AES key entirely offline, skipping the root/emulator gate altogether."
category: "Mobile Security"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Hard"
points: 300
flag: "FLAG{d34d_m3n_t3ll_n0_t4l35_fr1d4_unl0ck5_th3_cur53d_v4ult}"
author: "Reshma Al (Coldcoffee)"
tools: "jadx, Python 3, SHA-256, AES-CBC"
tags:
  - "Mobile Security"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>FLAG{d34d_m3n_t3ll_n0_t4l35_fr1d4_unl0ck5_th3_cur53d_v4ult}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('FLAG{d34d_m3n_t3ll_n0_t4l35_fr1d4_unl0ck5_th3_cur53d_v4ult}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Environment Checks Are a Red Herring
Everything about this challenge's setup — the presence of Frida hooks, an emulator-hiding configuration — pushes toward actually running the app on a rooted or emulated device and patching around its detection logic. That's unnecessary work. The root/emulator checks aren't a gate that blocks execution; they just change a numeric constant that feeds into the final key. Run it on a "wrong" device, and you simply get garbage output instead of the flag — there's no reason to touch a device at all when the clean-device key can be computed entirely offline.

Decompiling the APK also turns up a class called `Honeypot`, which holds a decoy flag string (`y0u_f0und_f00ls_g0ld_matey`). The real logic that actually matters lives in a different class, `VaultCore`.

---

## 2. Reconstructing the Oath
`VaultCore.getSeaOath()` builds its passphrase in three separate pieces: a byte array `[30,31,27,30,5,23,31,20,5]` XORed against 90, which decodes to `DEAD_MEN_`; a literal hardcoded string, `TELL_NO_`; and an integer array that, after subtracting 50 from each value, decodes to `TALES_1718`. Concatenated together, the full oath string is `DEAD_MEN_TELL_NO_TALES_1718`.

---

## 3. Deriving the Clean-Device Token
`calculateTideToken()` returns `322420958` when running on a genuinely clean device — no root, no emulator. The function branches to a different constant entirely if `Sentry.isRooted` is true, and separately XORs the result against `48879` if `Sentry.isEmulator` is true. Converting the clean-device decimal value to hex gives `1337c0de` — a value clearly chosen on purpose, which is a good sign the clean-device branch is indeed the intended path.

---

## 4. Reproducing the Key Derivation
With the oath and the clean token both known, the AES key and IV follow directly:

- `key = SHA-256(oath + ":" + tokenHex)`, used as AES-256
- `iv = first 16 bytes of SHA-256("SALT_CARIBBEAN_TIDES_1718:" + tokenHex)`
- mode: CBC with PKCS5 padding

To make sure the clean-device branch really was the right one rather than assuming it, I computed all four combinations of the root/emulator flags and ran the decryption under each. Only the clean value (`1337c0de`) produces plaintext that actually starts with `FLAG{`; the other three combinations all decrypt to random-looking bytes — which is exactly the "curse" the challenge's storyline is describing.

**Flag:** `FLAG{d34d_m3n_t3ll_n0_t4l35_fr1d4_unl0ck5_th3_cur53d_v4ult}`

---

## 5. Takeaways
- Anti-tamper and anti-emulator checks in mobile apps don't always gate execution outright — sometimes they feed directly into a key derivation, which means the "correct" environment state can often be computed and tried offline rather than physically spoofed on a device.
- A class literally named `Honeypot` holding a plausible-looking flag is about as direct a signal as a challenge can give that the string is fake — verify the actual logic that's supposed to produce the real flag before trusting anything that reads too easily.
- When a derivation depends on several boolean environment flags, it's often faster to compute every combination and test each one than to try to prove analytically which branch is correct — four decryption attempts is cheap compared to debugging a device setup.
- A result that decodes to a suspiciously round or deliberate-looking hex value (`1337c0de`) is usually a strong hint you've found the intended path, especially when the alternative branches don't produce anything similarly clean.
