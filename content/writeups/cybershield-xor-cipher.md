---
title: "Flag in the Noise: XOR Layered Cipher"
date: 2024-06-10
description: "Multi-layer XOR encryption with a rotating key recovered through frequency analysis and known-plaintext attack."
category: "Cryptography"
ctf: "CyberShield CTF"
difficulty: "Hard"
points: 500
tags: ["xor", "frequency-analysis", "known-plaintext", "python"]
---

## Challenge Overview

**Flag in the Noise** gave us a ciphertext that appeared random. The hint said "layers protect secrets" — suggesting multiple passes of encryption.

## Solution

### Step 1: Identify the encryption scheme

```python
with open('cipher.bin', 'rb') as f:
    data = f.read()

# Check byte frequency distribution
from collections import Counter
freq = Counter(data)
print(sorted(freq.items(), key=lambda x: -x[1])[:10])
```

Output showed a non-uniform distribution — not true random, but multi-XOR.

### Step 2: Recover the key length

Using the Index of Coincidence method:

```python
def ic(data):
    n = len(data)
    counts = Counter(data)
    return sum(c*(c-1) for c in counts.values()) / (n*(n-1))

for keylen in range(1, 40):
    chunks = [data[i::keylen] for i in range(keylen)]
    avg_ic = sum(ic(c) for c in chunks) / keylen
    print(f"keylen={keylen}  IC={avg_ic:.4f}")
```

Key length 12 gave IC ≈ 0.065 (close to English text IC).

### Step 3: Brute-force each key byte

```python
key = []
for i in range(12):
    chunk = data[i::12]
    best_score, best_byte = 0, 0
    for b in range(256):
        candidate = bytes(x ^ b for x in chunk)
        score = sum(candidate.count(c) for c in b'etaoin ')
        if score > best_score:
            best_score, best_byte = score, b
    key.append(best_byte)

plaintext = bytes(data[i] ^ key[i % 12] for i in range(len(data)))
print(plaintext.decode())
```

## Flag

`FLAG{x0r_l4y3rs_n0_m4tch_4_fr3qu3ncy}`

## Key Takeaways

Multi-layer XOR with a short repeating key is completely broken by frequency analysis. The Index of Coincidence quickly reveals the key period, and byte-by-byte brute force recovers each key segment.
