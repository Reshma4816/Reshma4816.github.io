---
title: "Chronos in the Octet Cage"
date: 2026-11-01T03:00:00+05:30
description: "Identify a 4-dimensional matrix algebra's hidden reduced norm, exploit it to leak small residues of a hidden prime across eight telemetry records, then recover it with a Cohn-Heninger lattice."
category: "Cryptography"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Medium"
points: 250
flag: "FLAG{ab3l1an_n0rm_unr4v3ls_scr4mbl3d_qu4t3rn10n_t3ns0r_9f2a}"
author: "Reshma Al (Coldcoffee)"
tools: "SageMath, LLL lattice reduction"
tags:
  - "Cryptography"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>FLAG{ab3l1an_n0rm_unr4v3ls_scr4mbl3d_qu4t3rn10n_t3ns0r_9f2a}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('FLAG{ab3l1an_n0rm_unr4v3ls_scr4mbl3d_qu4t3rn10n_t3ns0r_9f2a}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Setup
`chall.py` defines a 4-dimensional algebra over `Z_N`, with a structure tensor `GAMMA[k][a][b]` defining a product `mix(X, Y)_k = Σ GAMMA[k][a][b] · X[a] · Y[b] mod N`, and `N = p·q` with 512-bit primes. The output gives us `N`, `e = 65537`, a partial-key-exposure "hint" (`e_aux`, `hint_d`), eight telemetry records each shaped `{W1, W2, Z}`, and `C_flag = F^e` computed inside the algebra. The flag itself is split into four 15-byte chunks, each padded as `chunk | rand << 128`.

For telemetry record `i` (indices taken mod 8), with `U_i = p·R_i + E_i` and `E_i` roughly 60 bits:

```
W1 = A_i * B_i
W2 = B_i * C_i
Z  = B_{i+1} * U_i * A_i * C_{i+1} * B_i
```

The `e_aux`/`hint_d` data (the top 230 bits of a 680-bit `d_aux`) turned out to be a complete decoy — I never needed it for the solve.

---

## 2. Identifying the Algebra
Checking products of the basis elements in Sage shows the algebra is associative and non-commutative, with an identity element `(1, 0, 0, 1)` — strongly suggestive of M2, the algebra of 2×2 matrices. Building the left-multiplication matrix `L_x` for a generic element `x` and factoring `det(L_x)` confirms it: the determinant is a perfect square, `q(x)²`, where

```
q(x) = 20x0² - 10x0x1 + 3x1² + 50x0x2 - 14x1x2 + 35x2² - 34x0x3 + 8x1x3 - 44x2x3 + 15x3²
```

This `q` is exactly the reduced norm — the M2 determinant, in different coordinates. It's multiplicative (`q(x·y) = q(x)·q(y)`) and `q(1) = 1`, and because its coefficients are integers it's well-defined both mod `N` and mod the individual prime `p`.

---

## 3. Leaking Small Residues of p
Applying `q` to the `Z` equation for record `i`, the unobservable matrix factors regroup neatly into the public `W1`/`W2` values:

```
q(Z_i) = q(U_i) · q(A_i)q(B_i) · q(B_{i+1})q(C_{i+1}) = q(U_i) · q(W1_i) · q(W2_{i+1})
```

so `D_i = q(Z_i) / (q(W1_i)·q(W2_{i+1})) = q(U_i) mod N`. Since `U_i = E_i mod p` (the `R_i` term vanishes mod `p`), this gives `D_i = q(E_i) mod p` — and because `E_i` is only about 60 bits, `q(E_i)` comes out to roughly 127 bits, tiny next to the 512-bit prime. That produces eight small residues `s_i = D_i mod p` with `|s_i| < 2^130`.

---

## 4. Recovering p With a Cohn-Heninger Lattice
The eight linear polynomials `x_i - D_i` all vanish at the unknown `s_i` modulo `p`. Stacking them into a 9×9 lattice over `(1, x_1, ..., x_8)`:

```
[  N      0   ...  0 ]
[ -D_1    X   ...  0 ]
[  ...               ]
[ -D_8    0   ...  X ]      X = 2^130
```

gives determinant `N·X^8`, so short vectors sit around `2^194` — comfortably below `p ≈ 2^512`. By Howgrave-Graham's bound, those short vectors correspond to genuine integer relations satisfied by `(1, s_1, ..., s_8)`. LLL returns exactly eight such vectors (the ninth jumps to around `2^511`, well outside the useful range). Their shared kernel is one-dimensional, which hands back the `s_i` values directly, and from there `p = gcd(D_0 - s_0, N)`.

---

## 5. Decrypting the Flag
Working mod each prime, the algebra reduces to M2(F_r), whose unit group `GL2(F_r)` has an exponent dividing `r(r²-1)`. Since the challenge ensures `gcd(e, (p²-1)(q²-1)) = 1`, the private exponent is `d = e⁻¹ mod lcm(p(p²-1), q(q²-1))`, and `F = C_flag^d` is computed through repeated applications of `mix`. Each coordinate of the resulting `F` is `chunk | rand << 128`; taking the low 128 bits of each, dropping the leading zero byte, and concatenating reconstructs the full flag.

**Flag:** `FLAG{ab3l1an_n0rm_unr4v3ls_scr4mbl3d_qu4t3rn10n_t3ns0r_9f2a}`

---

## 6. Takeaways
- Any time a challenge defines its own algebraic structure via an explicit structure tensor, check for a multiplicative norm first — if the underlying algebra is isomorphic to a familiar one (here, 2×2 matrices), the norm is usually hiding in plain sight as a factor of a determinant.
- A norm that's multiplicative turns products of unknown matrices into products of *known* public scalars — that's the entire mechanism that makes the telemetry equations solvable without ever recovering the individual matrix factors.
- Small residues of an unknown prime, leaked across several independent samples, is a textbook setup for a Cohn-Heninger-style lattice attack — the key signal is that the "noise" term in each sample is small relative to the modulus.
- A partial-key-exposure hint sitting right next to the real vulnerability is a deliberate distraction as often as it's a shortcut — verify whether you actually need it before building machinery around it.
