---
title: "One pound fish"
date: 2026-10-11T12:00:00+05:30
description: "Finding polynomial hash collisions across a restricted alphanumeric message space."
category: "Cryptography"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Medium"
points: 350
flag: "isfcr{p0lyn0m14l_h4sh_c0ll1s10n_m4st3r}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, SymPy"
tags:
  - "Cryptography"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{p0lyn0m14l_h4sh_c0ll1s10n_m4st3r}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{p0lyn0m14l_h4sh_c0ll1s10n_m4st3r}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Rolling Hash Analysis
The challenge service implements a polynomial rolling hash to authenticate session state tokens:
$$H(s) = \sum_{i=0}^{k} s[i] \cdot B^{k-i} \pmod M$$
with $B = 31337$ and $M = 2^{64}$.

---

## 2. Collision Construction
Because $M = 2^{64}$ is composite and power of two, difference vectors can be constructed algebraically using low-degree polynomials. Using meet-in-the-middle over 8-byte blocks generated valid collision strings that authenticated as the administrative session.

