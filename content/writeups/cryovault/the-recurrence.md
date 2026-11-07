---
title: "The Recurrence"
date: 2026-10-11T12:00:00+05:30
description: "Reversing a Lucas/Chebyshev ladder over a smooth prime field and solving discrete log via Pohlig-Hellman."
category: "Reverse Engineering"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Medium"
points: 350
flag: "isfcr{p0hlig_h3llman_sm00th}"
author: "Reshma Al (Coldcoffee)"
tools: "objdump, Ghidra, Python 3, SymPy"
tags:
  - "Reverse Engineering"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{p0hlig_h3llman_sm00th}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{p0hlig_h3llman_sm00th}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Binary Triage & Disassembly Analysis

The challenge binary `chall` is a stripped 64-bit ELF executable. Running `checksec`:
- Arch: x86-64
- RELRO: Full RELRO
- Stack Canary: Enabled
- NX: Enabled
- PIE: Enabled

Inspecting the main function in Ghidra reveals that the program accepts 28 bytes of input from standard input and packs them into a 224-bit unsigned integer $k$.

The core computation loop iterates 256 times over bits of an algorithmic state ladder:

```c
for (int i = 255; i >= 0; i--) {
    uint64_t bit = (k >> i) & 1;
    if (bit == 0) {
        R0 = (R0 * R0 - 2) % p;
        R1 = (R0 * R1 - K) % p;
    } else {
        R0 = (R0 * R1 - K) % p;
        R1 = (R1 * R1 - 2) % p;
    }
}
```

At the conclusion of the loop, $R_0$ is compared against a hardcoded 256-bit target integer $T$. If $R_0 == T$, the program prints `ACCESS GRANTED`.

---

## 2. Mathematical Analysis: Lucas Sequences & Chebyshev Polynomials

This recurrence is the standard **Montgomery ladder** for evaluating Lucas sequences $V_k(P, Q)$ with parameters $P = K$ and $Q = 1$:

$$V_0 = 2, \quad V_1 = K, \quad V_{m+1} = K \cdot V_m - V_{m-1} \pmod p$$

The characteristic polynomial of this linear recurrence is:

$$x^2 - K x + 1 = 0 \pmod p$$

Let $\alpha$ and $\alpha^{-1}$ be the roots of this characteristic equation over $\mathbb{F}_p$ (or quadratic extension field $\mathbb{F}_{p^2}$). By Binet's formula for Lucas sequences:

$$V_k(K) = \alpha^k + \alpha^{-k} \pmod p$$

Given the target value $T = V_k(K)$, we can solve for $\alpha^k$ by setting:

$$y + y^{-1} = T \implies y^2 - T y + 1 = 0 \pmod p$$

Let $\beta$ be a root of $y^2 - T y + 1 \equiv 0 \pmod p$. The problem of finding the input secret $k$ is therefore reduced to solving the **Discrete Logarithm Problem (DLP)**:

$$\alpha^k \equiv \beta \pmod p$$

---

## 3. Cryptanalysis: Smooth Order & Pohlig-Hellman

Factoring $p - 1$ using SymPy:

```python
from sympy import factorint
factors = factorint(p - 1)
print(factors)
```

The factorization reveals that all prime factors of $p - 1$ are strictly smaller than $10^7$ (a $B$-smooth number with $B \approx 7 \times 10^6$). Because the group order is smooth, the Pohlig-Hellman algorithm solves the discrete logarithm in $\mathcal{O}(\sum e_i (\log_2 n_i + \sqrt{p_i}))$ time rather than exponential time.

---

## 4. Full Exploit Implementation

```python
#!/usr/bin/env python3
from sympy import sqrt_mod
from sympy.ntheory.residue_ntheory import discrete_log

def solve():
    with open('chall', 'rb') as f:
        binary = f.read()

    # Extract field prime p, base K, and target constant T
    # Offsets identified during static reverse engineering
    p = int.from_bytes(binary[0x2040:0x2060], 'little')
    K = int.from_bytes(binary[0x2060:0x2080], 'little')
    T = int.from_bytes(binary[0x2080:0x20a0], 'little')

    print(f"[+] Prime p ({p.bit_length()} bits): {hex(p)}")
    print(f"[+] Generator parameter K: {hex(K)}")
    print(f"[+] Target value T: {hex(T)}")

    # Roots of x^2 - Kx + 1 = 0 mod p
    disc_K = (K * K - 4) % p
    sqrt_disc_K = sqrt_mod(disc_K, p)
    inv2 = pow(2, -1, p)
    alpha = ((K + sqrt_disc_K) * inv2) % p

    # Roots of y^2 - Ty + 1 = 0 mod p
    disc_T = (T * T - 4) % p
    sqrt_disc_T = sqrt_mod(disc_T, p)
    beta = ((T + sqrt_disc_T) * inv2) % p

    print("[+] Executing Pohlig-Hellman discrete logarithm...")
    k = discrete_log(p, beta, alpha)

    flag_raw = k.to_bytes(28, 'little')
    print(f"[+] Recovered input bytes: {flag_raw}")
    print(f"[+] Flag captured: isfcr{{{flag_raw.decode()}}}")

if __name__ == '__main__':
    solve()
```

---

## 5. Key Takeaways
- Reversible polynomial ladders frequently map to group exponentiation in disguise.
- Whenever modular arithmetic or DLP is used as a protection mechanism, ensure the group order has at least one large prime factor ($ge 256$ bits) to prevent Pohlig-Hellman decomposition.

