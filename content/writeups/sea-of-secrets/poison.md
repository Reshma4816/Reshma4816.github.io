---
title: "Poison"
date: 2026-11-01T06:00:00+05:30
description: "Exploit a per-sample single-bit fault in a faulty ElGamal-over-P192 decryption oracle to recover the private key one bit at a time, with no discrete log required."
category: "Cryptography"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Medium"
points: 200
flag: "flag{p01s0n3d_3cc_f4u1t_4tt4ck_succ3ss!}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, elliptic-curve point arithmetic"
tags:
  - "Cryptography"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>flag{p01s0n3d_3cc_f4u1t_4tt4ck_succ3ss!}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('flag{p01s0n3d_3cc_f4u1t_4tt4ck_succ3ss!}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Setup
We get `chall.py` (plus a Sage port, `chall.sage`) and `out.txt`. The scheme is ElGamal over P-192 (`secp192r1`), where the flag itself, read as a big integer, *is* the private key `d`, and the public key is `Q = d·G`. A plaintext point `M` is encrypted as `C1 = k·G`, `C2 = M + k·Q`. `out.txt` records the plaintexts `ms`, the ciphertexts `C1s`/`C2s`, and `decs` — the outputs of a deliberately "faulty hardware" decryption routine.

---

## 2. What the Fault Actually Does
Reading `chall.py`'s fault-injection logic: sample number `count` flips string index `total_bits - 1 - count` of the private key's MSB-first binary representation — which, counting from the LSB instead, is simply bit `count`. So sample `i` decrypts using a corrupted key `d_i = d ± 2^i`: it's `d + 2^i` if bit `i` of the real `d` is 0, and `d - 2^i` if bit `i` is 1.

Since `Q = d·G` and `C1 = k·G`, the faulty decryption works out as:

```
dec = C2 - d_i·C1 = M + (d - d_i)·C1
dec - M = +2^i · C1   if bit i is 1
dec - M = -2^i · C1   if bit i is 0
```

---

## 3. Recovering the Key Bit by Bit
Because `M`, `C1`, and `dec` are all known for every sample, each one directly reveals one bit of `d` just by comparing `dec - M` against `2^i · C1` — there's no discrete logarithm to solve anywhere in this process, just elliptic-curve point arithmetic and a comparison:

```python
bits = [0] * L
for i in range(L):
    D = sub(decs[i], ms[i])
    T = mul(1 << i, C1s[i])
    if D == T:
        bits[i] = 1
    elif D == neg(T):
        bits[i] = 0
    else:
        raise ValueError(f"bit {i} did not match")

s = "".join(str(bits[i]) for i in range(L - 1, -1, -1))
d = int(s, 2)
flag = d.to_bytes((d.bit_length() + 7) // 8, "big")
```

(The full script implements standard short-Weierstrass point `add`/`neg`/`mul` over the P-192 field first, then runs this loop.)

---

## 4. Validating
This prints `b'flag{p01s0n3d_3cc_f4u1t_4tt4ck_succ3ss!}'` directly. As a sanity check beyond just trusting the bit recovery, the recovered `d` correctly decrypts every single ciphertext in the sample set back to its matching `ms[i]` — a full round-trip confirmation, not just a one-off printable string.

**Flag:** `flag{p01s0n3d_3cc_f4u1t_4tt4ck_succ3ss!}`

---

## 5. Takeaways
- A "faulty hardware" decryption framing is usually a direct invitation to a bit-flipping fault attack — check exactly which bit gets corrupted per sample before assuming you need a harder cryptanalytic approach.
- This attack needs **zero** discrete-log solving: once you know which bit was flipped and have the corresponding plaintext, the comparison `dec - M` against `±2^i·C1` reveals the bit directly through simple point arithmetic.
- Always validate a recovered key against the full dataset, not just the flag string it happens to produce — a key that decrypts every sample correctly is confirmed, while one that merely produces one readable string could still be subtly wrong.
- Reading the challenge's own fault-injection code line by line (rather than guessing at the fault model) is what pins down the exact bit-index relationship — MSB-first vs. LSB-first indexing is an easy place to get the sign backwards.
