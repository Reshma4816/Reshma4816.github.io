---
title: "implicit-twins"
date: 2026-10-11T12:00:00+05:30
description: "Factoring two 1024-bit RSA moduli sharing 530 low-order prime bits via 2D lattice Gauss reduction."
category: "Cryptography"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 400
flag: "isfcr{1mpl1c1t_f4ct0r1ng_0f_tw1ns}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, Gauss / Lagrange 2D Lattice Reduction"
tags:
  - "Cryptography"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{1mpl1c1t_f4ct0r1ng_0f_tw1ns}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{1mpl1c1t_f4ct0r1ng_0f_tw1ns}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Challenge Overview & Problem Formulation

The target oracle publishes two RSA public moduli $N_1$ and $N_2$ along with a ciphertext $C = M^e \pmod{N_1}$ where $e = 65537$:

$$N_1 = p_1 q_1, \quad N_2 = p_2 q_2$$

Both moduli are unbalanced composite integers:
- Prime factors $p_1$ and $p_2$ are 1024-bit primes.
- Prime factors $q_1$ and $q_2$ are small 256-bit primes.
- Most critically, $p_1$ and $p_2$ are generated using a flawed PRNG that causes them to share their lowest $T = 530$ bits:

$$p_1 \equiv p_2 \pmod{2^{530}}$$

Since $N_1$ and $N_2$ are 1280 bits each, standard Fermat factorization, Pollard's $p-1$, and ECM fail. However, the shared lower bits induce a hidden algebraic dependency known as **Implicit Factoring** (May & Ritzenhofen).

---

## 2. Mathematical Modeling: 2D Lattice Formulation

Let $M = 2^T = 2^{530}$. By assumption:

$$p_1 \equiv p_2 \pmod M$$

Multiplying both sides by the small prime products $q_1 q_2$:

$$q_2 (p_1 q_1) \equiv q_1 (p_2 q_2) \pmod M \implies q_2 N_1 \equiv q_1 N_2 \pmod M$$

Since $\gcd(N_2, M) = 1$, we can invert $N_2$ modulo $M$:

$$q_1 \equiv q_2 (N_1 N_2^{-1}) \pmod M$$

Define the multiplier constant:

$$u = N_1 N_2^{-1} \pmod{2^{530}}$$

The pair $(q_1, q_2)$ satisfies the modular relation:

$$q_1 - u q_2 \equiv 0 \pmod M$$

This defines a 2-dimensional integer lattice $\mathcal{L}$ spanned by the row vectors:

$$B = \begin{pmatrix} M & 0 \\ u & 1 \end{pmatrix}$$

Any integer linear combination of these basis vectors forms a vector $(x, y)$ such that $x \equiv u y \pmod M$. The volume (determinant) of this lattice is:

$$\det(\mathcal{L}) = M = 2^{530}$$

According to Minkowski's bound and the Gaussian heuristic, the shortest vector in a 2D lattice typically has Euclidean norm:

$$\|v_1\| \approx \sqrt{\det(\mathcal{L})} = 2^{265}$$

Since $q_1, q_2 \approx 2^{256}$, the target vector $(q_1, q_2)$ has norm:

$$\|(q_1, q_2)\| = \sqrt{q_1^2 + q_2^2} \approx \sqrt{2} \cdot 2^{256} \approx 2^{256.5}$$

Because $2^{256.5} < 2^{265}$, the target vector is **the shortest non-zero vector in the lattice**! Standard 2-dimensional Gauss reduction (Lagrange's algorithm) is guaranteed to find it in $\mathcal{O}(\log M)$ steps.

---

## 3. Exploit Implementation

```python
#!/usr/bin/env python3
import json

def gauss_reduction(v1, v2):
    dot = lambda a, b: a[0]*b[0] + a[1]*b[1]
    while True:
        if dot(v1, v1) < dot(v2, v2):
            v1, v2 = v2, v1
        mu = (2 * dot(v1, v2) + dot(v2, v2)) // (2 * dot(v2, v2))
        if mu == 0:
            break
        v1 = (v1[0] - mu * v2[0], v1[1] - mu * v2[1])
    return v1, v2

def solve():
    with open('output.json', 'r') as f:
        data = json.load(f)

    N1 = data['N1']
    N2 = data['N2']
    e = data['e']
    ct = data['ct']

    T = 530
    M = 1 << T
    u = (N1 * pow(N2, -1, M)) % M

    # Basis vectors for 2D lattice
    v1 = (M, 0)
    v2 = (u, 1)

    # Run Gauss reduction to discover shortest vector (q1, q2)
    s1, s2 = gauss_reduction(v1, v2)

    candidates = [abs(s1[0]), abs(s1[1]), abs(s2[0]), abs(s2[1])]
    q1 = None
    for cand in candidates:
        if cand > 1 and N1 % cand == 0:
            q1 = cand
            break

    assert q1 is not None, "Failed to factor N1"
    p1 = N1 // q1
    print(f"[+] Found factor q1 ({q1.bit_length()} bits): {q1}")
    print(f"[+] Found factor p1 ({p1.bit_length()} bits): {p1}")

    # Decrypt RSA ciphertext
    phi = (p1 - 1) * (q1 - 1)
    d = pow(e, -1, phi)
    pt = pow(ct, d, N1)

    flag_bytes = pt.to_bytes((pt.bit_length() + 7) // 8, 'big')
    print(f"[+] Flag captured: {flag_bytes.decode()}")

if __name__ == '__main__':
    solve()
```

---

## 4. Key Takeaways
- When generating independent RSA keys, state entropy must never leak across key pairs.
- Sharing even partial lower or upper bits allows lattice basis reduction to reconstruct full prime factorizations in fractions of a second.

