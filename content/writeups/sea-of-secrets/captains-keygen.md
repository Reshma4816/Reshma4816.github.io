---
title: "Captain's Keygen: The Cursed Treasure Lock"
date: 2026-11-01T02:00:00+05:30
description: "Reduce a 4-byte effective key space with meet-in-the-middle partial sums against a Horner checksum, cross-validated by an independent CRC-16 seal."
category: "Reverse Engineering"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Hard"
points: 500
flag: "flag{th3_cur53d_m3r1d14n_y13ld5_1t5_g0ld_t0_th0rn3}"
author: "Reshma Al (Coldcoffee)"
tools: "objdump, Python 3"
tags:
  - "Reverse Engineering"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>flag{th3_cur53d_m3r1d14n_y13ld5_1t5_g0ld_t0_th0rn3}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('flag{th3_cur53d_m3r1d14n_y13ld5_1t5_g0ld_t0_th0rn3}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Checker
`vault_lock` is a stripped Linux x86-64 PIE ELF that wants two inputs: a name and a 32-hex-character (16-byte) master key. Unusually for a reversing challenge, the accompanying `compass_chart.txt` hands over almost the entire algorithm in plain prose — the actual work here is pinning down exact constants and running the math, not fighting obfuscation.

---

## 2. Collapsing the Key Space
The 16-byte key splits into four 4-byte "watches." Watch 0 holds four genuinely unknown "master glyph" bytes `k0, k1, k2, k3`; watches 1 through 3 are just those same four bytes XORed against the fixed constants `0x5A`, `0xA5`, and `0x3C`. So despite the key looking like 16 free bytes, there are really only **4 unknown bytes** to find.

A 256-entry permutation table (the "tide chamber") is built from a name-derived seed with a PCG-style generator (multiplier `0x5851F42D4C957F2D`, increment `0x14057B7EF767814F`): 256 raw draws fill the table, then a Fisher-Yates shuffle consumes 255 more. The final check is a Horner-style running sum over all 16 expanded key bytes:

```
acc = 0
for i in 0..15: acc = (acc * 0x1000193 + S[key[i]] * W[i]) % (2**61 - 1)
```

with a 16-entry weight table `W[]` pulled from `.rodata`. The target value is `0x024a6bae61713629`, and it's cross-checked by a completely independent CRC-16/CCITT-FALSE seal, `0x0B97`, computed over the same 16-byte key.

---

## 3. Meet-in-the-Middle on the Four Unknowns
Since only `k0..k3` are actually free, each one contributes to exactly 4 of the 16 Horner terms — once per watch. That means the 16-term weighted sum splits cleanly into two **independent** halves: `{k0, k1}` and `{k2, k3}`. Precomputing all 256×256 partial sums for one half into a hash table, keyed by "the value needed from the other half to hit the target," turns a brute-force search of `256⁴ ≈ 4.3 × 10⁹` combinations into roughly `2 × 65536` — a few hundred thousand operations instead of billions.

---

## 4. Finding the Right Name and Validating
The seed name isn't handed to us directly, so I tried a short list of in-lore candidates — `"Edward Thorne"`, `"Captain Thorne"`, `"Black-Tide"`, `"The Black Meridian"`, and a few others. `"Edward Thorne"` is the one that actually produces a solution to the meet-in-the-middle search at all: `k0, k1, k2, k3 = 0x5e, 0xa2, 0x1d, 0x8c`, giving the full 16-byte key `5ea21d8c04f847d6fb07b829629e21b0`.

That candidate satisfies **both** the Horner checksum and the completely independent CRC-16 seal — a strong consistency signal for a search over only 4 unknown bytes, since passing two unrelated checks simultaneously is a lot less likely to happen by coincidence than passing just one.

---

## 5. Decrypting the Flag
The flag itself sits behind a separate, smaller stream cipher keyed off the now-solved state: a "flag key" built by mixing the Horner accumulator with the name hash and running the same PCG generator, then a keystream byte per output position taken as `(state >> 40) & 0xFF` from repeated PCG advances, XORed against a 51-byte ciphertext blob in `.rodata`. Running that with the verified accumulator, name hash, and key bytes decrypts cleanly to the flag above.

---

## 6. Takeaways
- Four "independent-looking" 16-byte watches that are really one small set of bytes plus fixed XOR masks is a classic way to disguise a tiny effective key space — always check whether derived fields are actually free variables before committing to a brute-force plan.
- When a weighted sum check splits along clean boundaries (here, which watch each unknown byte feeds into), meet-in-the-middle turns an infeasible `N⁴` search into two feasible `N²` halves joined by a hash table.
- Two independent checks over the same secret (a Horner checksum and an unrelated CRC) make a found candidate far more trustworthy than either check alone — if both pass, the chance of a false positive drops sharply.
- When a challenge's flavor text spells out the algorithm instead of hiding it, trust that it's accurate and spend the effort on the arithmetic rather than re-deriving the structure from scratch.
