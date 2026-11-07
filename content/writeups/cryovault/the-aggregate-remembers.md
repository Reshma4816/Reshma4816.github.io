---
title: "The Aggregate Remembers"
date: 2026-10-11T12:00:00+05:30
description: "Aggregate BLS signature forgery via rogue key attack and linear independence failure."
category: "Cryptography"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{bls_r0gu3_k3y_4gg4g4t10n_f0rg3ry}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, py_ecc, SageMath"
tags:
  - "Cryptography"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{bls_r0gu3_k3y_4gg4g4t10n_f0rg3ry}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{bls_r0gu3_k3y_4gg4g4t10n_f0rg3ry}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Aggregate BLS Protocol
The target consensus service verifies aggregate signatures over the BLS12-381 pairing-friendly elliptic curve:
$$e\left(\sum \text{PK}_i, H(m)\right) = e(G_1, \sigma_{\text{agg}})$$

---

## 2. Rogue Key Attack
The registration portal did not enforce Proof of Possession (PoP). By registering a malicious rogue public key $\text{PK}_{\text{rogue}} = \text{PK}_{\text{target}}^{-1} + \text{PK}_{\text{attacker}}$, the aggregate public key canceled out the target's key, allowing signature forgery under our own private key.

