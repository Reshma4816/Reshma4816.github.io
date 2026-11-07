---
title: "Matrix Keystream: Linear Cryptanalysis & State Reconstruction over GF(2)"
date: 2026-10-28T18:00:00+05:30
description: "Recovering cryptographic state from a custom matrix stream cipher using linear system inversion over GF(2)."
category: "Cryptography"
ctf: "Netrunner Gaultnet CTF"
difficulty: "Medium"
points: 350
flag: "NR{m4tr1x_k3ystr34m_l1n34r_c0nv0lut10n_br0k3n}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, NumPy, SymPy"
tags:
  - "Cryptography"
  - "Netrunner Gaultnet CTF"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>NR{m4tr1x_k3ystr34m_l1n34r_c0nv0lut10n_br0k3n}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('NR{m4tr1x_k3ystr34m_l1n34r_c0nv0lut10n_br0k3n}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Cipher Formulation
The challenge implemented a state machine running a linear recurrence over a $16 \times 16$ binary matrix $M$.
The output keystream $k_t$ satisfies:
$$k_t = v_0 M^t \pmod 2$$

---

## 2. Inversion Attack
Because the state transition is strictly linear over $\text{GF}(2)$, collecting 16 consecutive output vectors enables direct matrix inversion:
$$V = [k_0, k_1, \dots, k_{15}] \implies v_0 = V \cdot M^{-1} \pmod 2$$
Using SymPy / NumPy binary Gaussian elimination recovered the seed key in milliseconds.

