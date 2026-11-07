---
title: "Jambavan - The Forgotten Strength"
date: 2026-11-01T09:59:00+05:30
description: "Reverse engineering an obfuscated state-machine binary with runtime anti-debugging hooks."
category: "Reverse Engineering"
ctf: "Pinaka CTF 2026"
difficulty: "Medium"
points: 300
flag: "PINAKA{jambavan_forgotten_strength_learned_from_the_oracle}"
author: "Reshma Al (Coldcoffee)"
tools: "Ghidra, GDB-GEF, Python 3"
tags:
  - "Reverse Engineering"
  - "Pinaka CTF"
  - "Pinaka 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>PINAKA{jambavan_forgotten_strength_learned_from_the_oracle}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('PINAKA{jambavan_forgotten_strength_learned_from_the_oracle}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


**Category:** Rev · **Points:** 300 · **CTF:** PINAKA / Narayanastra
**Flag:** `PINAKA{jambavan_forgotten_strength_learned_from_the_oracle}`

## Challenge

The player zip contains `jambavan_seal`, an ELF binary, and `seal_target.json`. The JSON gives n = 128, the target `awakened_sigil = 5e0d6ee1d2c86176c52d690679648156`, and two hints:

- The perturbing mudra (input bit 1) strikes the last register coordinate.
- Each output is the parity of the state under a fixed tap-set.

The goal is to submit exactly 128 bits that drive the seal from its hidden resting state to the sigil. The remote exposes `/seal/observe` (the oracle) and `/seal/awaken` (the checker).

## Recon

The binary is a stripped, ~14 KB, tiny loop. It reads `0`/`1` characters from stdin and prints one bit per input. There are no strings and no crypto, only 64-bit constants and a popcount helper. Running it locally already works as an oracle, so I disassembled it rather than black-box learning the remote.

## Reversing

The state is 128 bits in two registers, `lo` (r12) and `hi` (rbp). The initial values are immediates in the code:

```
lo0 = 0xb43f4db6aefb5271    hi0 = 0x2d54ac7aec3fd6fd
A = 0xca504c4a84c21f09   B = 0x7f78bc91aa80f7ef      (feedback taps)
C = 0x49fbc9fedff08584   D = 0x53b71036898edaf9      (readout taps)
```

Per input bit `u`:

1. `f = par(lo&A)`
2. `lo = (lo>>1) | (hi&1)<<63` (the 128-bit right shift, low half; `shrd r12,rbp,1`)
3. `fb = f ^ par(hi&B) ^ u`
4. `hi = (hi>>1) | fb<<63` (high half, with `fb` entering the top bit)
5. output = `par(lo&C) ^ par(hi&D)`

I first mis-modelled step 3 by also XORing in `par(lo'&C)`. That popcount is the readout term, not feedback. My emulator disagreed with the binary on random input until I removed it. After that it matched on 300 random bits.

## Solving

The system is linear over GF(2), and the input only enters through the feedback bit at position 127. A bit injected at step t is shifted right once per later step, so after 128 steps the feedback bit from step t sits at bit position t. The final state is therefore exactly the 128 feedback bits, with step 127 at the top.

So no matrix inversion is needed. For t = 0..127, I pick `u_t` so that `fb_t` equals bit t of the target:

```
u_t = (par(lo&A) ^ par(hi&B)) ^ target_bit_t
```

This gives a unique chant, as the description says. I confirmed in the emulator that it lands on the target. The only ambiguity was whether the sigil hex maps as `hi:lo` big-endian or with the halves swapped, so I generated both. The big-endian one was accepted.

## Solver

```python
p=lambda x:bin(x).count('1')&1
A,B=0xca504c4a84c21f09,0x7f78bc91aa80f7ef
lo,hi=0xb43f4db6aefb5271,0x2d54ac7aec3fd6fd
T=int("5e0d6ee1d2c86176c52d690679648156",16)
chant=''
for t in range(128):
    f=p(lo&A); lo=(lo>>1)|((hi&1)<<63)
    b=f^p(hi&B); u=b^((T>>t)&1)
    hi=(hi>>1)|((b^u)<<63); chant+=str(u)
print(chant)
```

The chant for this target is:

```
10001011100001101100100101001101010100111111010010010011000101110011110010101001011101101110101000100001111111011100011111000010
```

POSTing it to `/seal/awaken` returned `"status":"awakened"` and the flag.

![Terminal: /seal/awaken returns the flag](images/awaken_output.png)

