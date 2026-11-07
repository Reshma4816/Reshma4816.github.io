---
title: "leaky-eval"
date: 2026-10-11T12:00:00+05:30
description: "Recovering a ternary Ring-LWE secret from exact unmasked noise leakage via Gaussian elimination over Z_Q."
category: "Cryptography"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{n3g4cycl1c_n01s3_l34k}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, pycryptodome (AES-GCM), NumPy"
tags:
  - "Cryptography"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{n3g4cycl1c_n01s3_l34k}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{n3g4cycl1c_n01s3_l34k}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Challenge Overview & System Setup

In standard post-quantum Ring-LWE (Learning With Errors over Rings) cryptography, security relies on the hardness of finding a small secret polynomial $s(x)$ given noisy inner products. Here, the target service runs in the polynomial quotient ring:

$$R_Q = \mathbb{Z}_Q[X] / (X^N + 1)$$

with polynomial degree $N = 64$, prime modulus $Q = 2^{61} - 1$ (the 9th Mersenne prime), and ternary secret coefficients $s \in \{-1, 0, 1\}^N$.

Each sample published by the verification oracle computes:

$$b = a \cdot s + e \pmod Q$$

where $a \in R_Q$ is uniformly random and $e$ is sampled from a discrete Gaussian noise distribution. However, the system includes a diagnostic logging mechanism that inadvertently leaks:
1. The public polynomial $a$.
2. The evaluated vector $b$.
3. A random evaluation index $idx \in [0, N-1]$.
4. The **exact unmasked error coefficient** at that coordinate: $leak = e[idx]$.

The final flag is encrypted using AES-256-GCM under key $K = \text{SHA256}(s)$.

---

## 2. Vulnerability Discovery: Algebraic Noise Cancellation

Standard LWE becomes intractable because solving for $s$ requires finding short vectors in high-dimensional lattices (via BKZ / LLL reduction) when the noise $e$ is unknown. 

With $leak = e[idx]$ exposed directly, the non-linear noise perturbation is eliminated:

$$(a \cdot s)[idx] = b[idx] - leak \pmod Q$$

This collapses the problem from an approximate lattice vector problem into an **exact linear system** over the finite field $\text{GF}(Q)$.

The ring multiplication $a \cdot s \pmod{X^N + 1}$ corresponds to negacyclic polynomial convolution. Specifically, the $k$-th coefficient is given by:

$$(a \cdot s)[k] = \sum_{j=0}^{k} s[j] a[k - j] - \sum_{j=k+1}^{N-1} s[j] a[k - j + N] \pmod Q$$

Across $M = 72$ intercepted samples, we obtain $72$ linear equations in $64$ unknown variables. Since $72 > 64$, the system is strictly overdetermined and solvable in polynomial time via standard Gaussian elimination over $\mathbb{Z}_Q$.

---

## 3. Step-by-Step Exploitation Walkthrough

### Step 1: Parsing the Sample Stream
We extract the coefficients of $a$, the target index $idx$, the output value $b[idx]$, and the leaked noise value $leak$ from the JSON transmission:

```python
rows = []
for sm in samples:
    a, idx = sm['a'], sm['idx']
    # Build the negacyclic row vector for index 'idx'
    row = [(a[idx - j] if idx - j >= 0 else -a[idx - j + N]) % Q for j in range(N)]
    # Target value: (b[idx] - leak) mod Q
    row.append((sm['b'][idx] - sm['leak']) % Q)
    rows.append(row)
```

### Step 2: Gaussian Elimination over GF(Q)
Because $Q = 2^{61} - 1$ is prime, every non-zero pivot has a unique modular inverse $\text{inv} = p^{\text{piv}} = (\text{pivot})^{Q - 2} \pmod Q$. We reduce the augmented $72 \times 65$ matrix to reduced row echelon form (RREF) to recover each secret coordinate $s[j]$.

### Step 3: Key Derivation and Flag Decryption
Because the original secret coefficients are strictly ternary ($s[j] \in \{-1, 0, 1\}$), any coordinate value $v > 1$ represents a negative coefficient in modular arithmetic ($v = Q - 1 \implies -1$). We normalize the recovered coordinates, format the key string, compute $\text{SHA256}(s)$, and initialize AES-GCM decryption.

---

## 4. Complete Automated Exploit Script

```python
#!/usr/bin/env python3
import json
from hashlib import sha256
from Crypto.Cipher import AES

def solve():
    with open('output.json', 'r') as f:
        data = json.load(f)

    N = data['N']
    Q = data['Q']
    samples = data['samples']

    rows = []
    for sm in samples:
        a = sm['a']
        idx = sm['idx']
        # Construct negacyclic convolution row
        row = [(a[idx - j] if idx - j >= 0 else -a[idx - j + N]) % Q for j in range(N)]
        rhs = (sm['b'][idx] - sm['leak']) % Q
        row.append(rhs)
        rows.append(row)

    # Perform Gaussian elimination mod Q
    m = len(rows)
    piv = 0
    piv_cols = []
    for col in range(N):
        # Locate pivot row
        pivot_idx = None
        for r in range(piv, m):
            if rows[r][col] != 0:
                pivot_idx = r
                break
        if pivot_idx is None:
            continue

        # Swap rows
        rows[piv], rows[pivot_idx] = rows[pivot_idx], rows[piv]
        inv = pow(rows[piv][col], -1, Q)
        rows[piv] = [(x * inv) % Q for x in rows[piv]]

        for r in range(m):
            if r != piv and rows[r][col] != 0:
                factor = rows[r][col]
                rows[r] = [(x - factor * y) % Q for x, y in zip(rows[r], rows[piv])]

        piv_cols.append(col)
        piv += 1

    # Extract ternary secret vector
    secret = [0] * N
    for i, col in enumerate(piv_cols):
        val = rows[i][N]
        secret[col] = val if val <= 1 else val - Q

    print(f"[+] Recovered secret polynomial: {secret[:8]}... (len={len(secret)})")

    # Derive AES key and decrypt flag
    key_str = ",".join(map(str, secret)).encode()
    aes_key = sha256(key_str).digest()

    cipher = AES.new(aes_key, AES.MODE_GCM, nonce=bytes.fromhex(data['nonce']))
    flag = cipher.decrypt_and_verify(
        bytes.fromhex(data['flag_ct']),
        bytes.fromhex(data['tag'])
    )
    print(f"[+] Flag captured: {flag.decode()}")

if __name__ == '__main__':
    solve()
```

---

## 5. Key Takeaways & Defense
- **Noise Integrity:** In lattice-based cryptosystems, exposing partial or unmasked error values breaks the underlying learning-with-errors hardness guarantee, allowing efficient algebraic resolution.
- **Diagnostic Hygiene:** Internal debug metrics (such as intermediate error values or sampler states) must never be emitted alongside public evaluation results.

