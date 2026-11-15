---
title: "Abyss"
date: 2026-09-20T18:17:00+05:30
description: "Ten stacked ciphers collapse once Fermat factorization breaks a deliberately close-prime RSA layer buried in the middle, since every other layer's key is just derived from constants in the source."
category: "Cryptography"
ctf: "Lunar CTF Quals"
difficulty: "Medium"
points: 150
flag: "Lun4R{7h3_m00n_n3v3r_l13s_bu7_y0u_d0}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, hashlib, hmac, cryptography (AES-GCM), hand-written ChaCha20"
tags:
  - "Cryptography"
  - "Lunar CTF Quals"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>Lun4R{7h3_m00n_n3v3r_l13s_bu7_y0u_d0}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('Lun4R{7h3_m00n_n3v3r_l13s_bu7_y0u_d0}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Recon — Read the Source Before Anything Else
`abyss.zip` contains a single file, `challenge.py`, no remote service and no binary. It's a pure source-review challenge: the encrypt/decrypt routine for all ten layers is right there, along with every symmetric key and constant (`LFSR_SEED`, `MATRIX_8x8`, `SPN_KEY`, `FEISTEL_MASTER`), the RSA modulus `RSA_N` and exponent `RSA_E = 65537`, and the final ciphertext as an 800-byte hex blob. The only things set to `None` are `RSA_P`, `RSA_Q`, and `RSA_D` — with a comment pointing straight at Fermat factorization, and a startup banner asking whether the two primes are close. The later-layer keys (`POLY_STREAM_KEY`, `HMAC_KEY_L8`, `CHACHA_KEY`, `AES_KEY_GCM`) aren't stored either, but they're all derived at import time from constants we already have, via BLAKE2b, SHA3, and an iterated SHA-512 KDF — so they're fully recomputable.

---

## 2. Mapping the Ten Layers
`full_encrypt()` pushes the flag through ten layers in order; `full_decrypt()` undoes them in reverse. Writing the chain out makes the plan obvious — nine of the ten layers are keyed by values we can recompute from constants in the file, and RSA is the one layer that needs real work:

| Layer | Primitive | To undo it |
|---|---|---|
| L1 | 128-bit Galois LFSR stream | Regenerate the keystream, XOR |
| L2 | 8×8 matrix cipher mod 257 | Multiply by the inverse matrix mod 257 |
| L3 | 6-round SPN | Run rounds backwards with inverse S-boxes |
| L4 | 64-round Feistel | Run rounds backwards |
| L5 | Textbook RSA-2048 | Factor `N`, compute `d`, decrypt each block |
| L6 | BLAKE2s keystream XOR | Self-inverse, XOR again |
| L7 | Per-chunk shuffle + XOR | Undo XOR first, then invert each shuffle |
| L8 | HMAC-SHA3-512 chained XOR | Recompute each chunk's MAC, XOR back |
| L9 | ChaCha20 | Same keystream, XOR |
| L10 | AES-256-GCM (tag prepended) | Split tag, decrypt, verify |

Two details matter for implementing a solver: padding stacks up across L1–L4 (the 37-byte flag grows to 40, 48, 64, then 72 bytes before L5 prefixes a 4-byte length and pads to 96 bytes), and every inner layer is invertible using only information already printed in the file — RSA is the single layer that hides something real.

---

## 3. Spotting the RSA Weakness
A 2048-bit modulus with `e = 65537` looks completely normal on its own. The risk is in how `p` and `q` were generated, and the source gives two signals: a comment saying `N` can be factored with Fermat's method (which only works when the primes are close), and a startup banner asking the same question. Secure RSA picks `p` and `q` independently, so their difference sits around `2^1023`; here they were deliberately placed near each other, making `N` close to a perfect square. The challenge description says the same thing in riddle form — "they called the primes random, look closer."

---

## 4. Fermat Factorization
Any product of two odd primes can be written as a difference of squares, `N = a² - b²` where `a = (p+q)/2` and `b = (q-p)/2`. If `p` and `q` are close, `b` is small and `a` sits just above `√N`, so the search is a simple increasing loop:

```python
import math

def fermat_factor(n):
    a = math.isqrt(n)
    if a * a < n:
        a += 1
    b2 = a * a - n
    while True:
        b = math.isqrt(b2)
        if b * b == b2:
            return a - b, a + b
        a += 1
        b2 = a * a - n
```

This returns almost immediately — the two primes differ by only 268,990,122, a 29-bit gap between two 1024-bit numbers. From the factors, the private exponent follows directly: `phi = (p-1)*(q-1)`, `RSA_D = pow(RSA_E, -1, phi)`.

---

## 5. Rebuilding the Derived Keys
Every later-layer key is derived from constants already in the file, so the key schedule can just be copied over, in order, since later keys depend on earlier ones:

```python
POLY_STREAM_KEY = blake2b(data=SPN_KEY, key=FEISTEL_MASTER[:32], digest_bits=512)
PLAYFAIR_SEED   = sha3_224(SPN_KEY + FEISTEL_MASTER + POLY_STREAM_KEY[:16])
HMAC_KEY_L8     = sha3_512(FEISTEL_MASTER + SPN_KEY + POLY_STREAM_KEY[:32])[:32]

L9_KDF_OUT  = kdf_sha512(POLY_STREAM_KEY[:32] + HMAC_KEY_L8,
                          sha3_256(FEISTEL_MASTER + SPN_KEY), 0x2A3B, 44)
CHACHA_KEY, CHACHA_NONCE = L9_KDF_OUT[:32], L9_KDF_OUT[32:44]

L10_KDF_OUT = kdf_sha512(HMAC_KEY_L8 + CHACHA_KEY,
                          sha3_512(POLY_STREAM_KEY + L9_KDF_SALT)[:32], 0x539F, 44)
AES_KEY_GCM, AES_NONCE_GCM = L10_KDF_OUT[:32], L10_KDF_OUT[32:44]
```

The KDF iteration counts only slow a brute-force guess — they do nothing against someone who already holds the inputs.

---

## 6. Peeling Layers 10 Down to 6
With every key in hand, the outer layers come off one at a time: **L10 (AES-GCM)** — split the prepended 16-byte tag, decrypt, verify (a successful tag check is the first confirmation the key derivation is correct); **L9 (ChaCha20)** — decrypting is the same operation as encrypting; **L8 (HMAC chain)** — recompute each chunk's HMAC-SHA3-512 over the previous MAC and the ciphertext prefix, XOR back; **L7 (shuffle + XOR)** — undo the XOR first, then invert each chunk's BLAKE2b-seeded permutation; **L6 (BLAKE2s stream)** — XOR again, since the construction is self-inverse. After L6, exactly 768 bytes remain: three 256-byte RSA blocks.

---

## 7. RSA and the Inner Layers
Raising each 256-byte ciphertext block to the private exponent recovers the original 32-byte blocks:

```python
raw = bytearray()
for i in range(0, len(data), 256):
    c = int.from_bytes(data[i:i+256], 'big')
    m = pow(c, RSA_D, RSA_N)
    raw += m.to_bytes(32, 'big')
orig_len = struct.unpack('>I', bytes(raw[:4]))[0]
c4 = bytes(raw[4:4 + orig_len])
```

A clean length prefix here is a strong sign the factoring was correct — a wrong `d` produces garbage that rarely decodes to a sane length. From there, **L4 (Feistel)** inverts the standard way regardless of how the round function itself is built; **L3 (SPN)** undoes each of the six rounds by XOR-ing the round key, then applying the inverse permutation and inverse S-box; **L2 (GF(257) matrix)** multiplies by the matrix inverse the source already provides; and **L1 (LFSR)** just regenerates the same keystream and XORs it off, leaving the plaintext.

---

## 8. Running the Full Chain
```python
c9  = layer10_decrypt(CIPHERTEXT)
c8  = layer9_decrypt(c9)
c7  = layer8_decrypt(c8)
c6  = layer7_decrypt(c7)
c5  = layer6_decrypt(c6)
c4  = layer5_decrypt(c5, RSA_D)
c3  = layer4_decrypt(c4)
c2  = layer3_decrypt(c3)
c1  = layer2_decrypt(c2)
flag = layer1_decrypt(c1)
```

```text
[+] Factored N: p and q differ by 268990122
[+] Decrypted flag: b'Lun4R{7h3_m00n_n3v3r_l13s_bu7_y0u_d0}'
[+] Matches embedded FLAG constant: True
```

The decrypted bytes match the author's own `FLAG` constant in the source exactly, confirming the chain from both ends.

**Flag:** `Lun4R{7h3_m00n_n3v3r_l13s_bu7_y0u_d0}`

---

## 9. Takeaways
- Stacking ciphers doesn't add security — a chain is only as strong as the one layer that needs a secret the attacker can't compute, and nine of these ten layers used keys derivable from constants in the same file.
- Close primes break RSA: if `p` and `q` sit within roughly `N^(1/4)` of each other, Fermat's method factors the modulus almost instantly, which is why real key generation picks primes independently.
- Read the hints — the source comment, the startup banner, and the challenge description all pointed at the same weakness before any code needed writing.
- Validate early: the AES-GCM tag and the RSA length prefix both act as checkpoints that confirm correctness long before reaching the flag.
