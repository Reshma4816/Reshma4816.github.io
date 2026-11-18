---
title: "Project Black Pearl: The Cursed Engine of Elias Blackthorn"
date: 2026-11-01T06:30:00+05:30
description: "Separate a Windows checker's dead-end decoy prefix from its real four-stage token chain, then crack it with FNV-1a cryptanalysis, a custom VM, Feistel inversion, and a meet-in-the-middle search."
category: "Reverse Engineering"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Hard"
points: 300
flag: "FLAG{black_pearl_c4pt_7b9d_2e4f_8a1c_6d30_5f81_e92a_b}"
author: "Reshma Al (Coldcoffee)"
tools: "objdump, Python 3, C (brute-force helpers)"
tags:
  - "Reverse Engineering"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>FLAG{black_pearl_c4pt_7b9d_2e4f_8a1c_6d30_5f81_e92a_b}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('FLAG{black_pearl_c4pt_7b9d_2e4f_8a1c_6d30_5f81_e92a_b}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. First Look and the Decoy Flavor Text
`black_pearl.exe` is a stripped PE32+ console binary built with MinGW GCC, with no packing tricks — `objdump -d -M intel` is all that's needed to read it. A bundled `sea_chart_fragment.txt` openly admits it plants wrong keys to punish naive guessing, listing several fake-looking strings like `d34d_m4n5_ch35...` and `KEY=d34d_b33f_...`. None of them are real; they exist purely to catch anyone who stops at the first plausible-looking string.

`main` reads `argv[1]`, trims it, and compares the first 17 bytes against an XOR-0x5d obfuscated constant, which decodes to `FLAG{black_pearl_`.

---

## 2. The Real Trap: Matching the Obvious Prefix
Here's the twist — matching that decoded `FLAG{black_pearl_` prefix exactly is itself the trap. It diverts into a dead buffer that can never actually pass the check. The real validation path requires the trimmed input to **not** match that prefix and to be exactly 36 characters long, split into three 12-byte tokens chained through four stages: `stage1(token1) → key1`, `stage2(token2, key1) → vmres`, `stage3(token3, vmres) → fres`, `stage4(key1, vmres, fres) → pass/fail`.

---

## 3. Stage 1 — FNV-1a Cryptanalysis
Stage 1 hashes `token1` as three 4-byte blocks using 64-bit FNV-1a, with each byte pre-XORed against `0x5a`. The comparison happens against the hash accumulator **before** the final multiply step, which turns each 4-byte block into a 3-byte brute force plus one directly solvable byte rather than a full 4-byte search. The unique solution is `token1 = "c4pt_7b9d_2e"`, which produces a fixed `key1 = 0x21cb4b798cfbc229` on the genuine branch. (A second branch matching a different pair of hash targets turns out to be the "Meridian 1 & 2 verified" decoy message, and it dead-ends.)

---

## 4. Stage 2 — The Embedded VM
Stage 2 decrypts a 218-byte blob using only `key1` (`code[i] = blob[i] ^ (i*0x73 mod 256) ^ key1_byte[i mod 8]`), producing bytecode for a small 6-register VM. The program runs `token2` through an S-box mix and a rotate/add chain for its first 6 bytes, a different mix/rotate/XOR chain for the last 6, then two `mulmod` operations (moduli 65521 and 65511) that collapse the result down to roughly 32 bits of real entropy. That collapse is exactly why `token2` turns out not to be unique — the VM's transform is non-injective, so a ~40-bit hex token can have many valid pre-images under it.

---

## 5. Stage 3 — Feistel Inversion
Stage 3 reads `token3` as three little-endian dwords and runs them through an 8-round Feistel network, keyed by round constants derived from `key1` XORed against the first 8 Blowfish π constants. A Feistel network is trivially invertible regardless of its round function, and since `vmres` only carries about 32 bits of real freedom (thanks to stage 2's collapse), every `(x, y)` pair was brute-forced, the Feistel inverted for each, and the results filtered down to printable `[0-9a-z_]` characters. Exactly one inverse matches the decoy-consistent `_xxxx_xxxx_x` shape: `token3 = "_5f81_e92a_b"`.

---

## 6. Recovering Token2 With Meet-in-the-Middle
`token2` needed a different approach: against the fixed `vmres`, the first 6 input bytes only ever affect register `r0`, and the last 6 only affect `r1` (with `r0` just XORing in `r1`'s updates along the way). Since the per-byte update step is invertible (`7⁻¹ mod 256 = 183`), that clean split turns a brute-force search of roughly `16^10` combinations into about `2^40` of feasible meet-in-the-middle work.

That search surfaces **32 different `token2` values that are all equally valid** against the VM — a genuine design quirk, since stage 4 (the final combiner) only ever consumes `key1`, `vmres`, and `fres`, all identical across every one of the 32 candidates, so nothing downstream can distinguish between them. Only one, `token2 = "4f_8a1c_6d30"`, turns out to be the intended string — confirmed correct against the platform rather than derivable from the binary's logic alone.

---

## 7. Assembling the Key
Putting all three tokens together in their 4-character, underscore-separated groups gives the full 36-character key:

```
c4pt_7b9d_2e4f_8a1c_6d30_5f81_e92a_b
```

Stage 4 itself — a Blowfish-like block cipher keyed off `key1`/`vmres`/`fres` against a fixed 16-byte target — was never fully reverse engineered down to its internals, and it didn't need to be: since it only consumes values already pinned down by the earlier stages, it can't tell the 32 `token2` candidates apart from each other anyway.

**Flag:** `FLAG{black_pearl_c4pt_7b9d_2e4f_8a1c_6d30_5f81_e92a_b}`

---

## 8. Takeaways
- A prefix that decodes cleanly from an obfuscated constant isn't automatically the answer — check whether matching it actually satisfies the rest of the program's logic, or whether it's a deliberately placed dead end.
- FNV-1a's final multiply step is reversible when the comparison happens against the accumulator's value *before* that multiply — recognize where in a hash's pipeline a check actually occurs before assuming the whole hash needs brute-forcing.
- A VM stage that collapses its output through modular multiplication against two different moduli is a strong signal of a many-to-one transform — expect multiple valid inputs rather than a single unique answer once you see that pattern.
- When a meet-in-the-middle split produces several equally valid candidates and nothing downstream can distinguish them, that's not a solving failure — it's sometimes just how the challenge was built, and the only way forward is testing candidates against the live platform.
