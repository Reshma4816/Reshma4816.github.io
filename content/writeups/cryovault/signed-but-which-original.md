---
title: "Signed, but which original?"
date: 2026-10-11T12:00:00+05:30
description: "Exploiting Merkle-Damgård hash extension vulnerabilities in document signature validation."
category: "Cryptography"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{h4sh_3xt3ns10n_4nd_c4n0n1c4l_c0ll1s10n}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, HashPump"
tags:
  - "Cryptography"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{h4sh_3xt3ns10n_4nd_c4n0n1c4l_c0ll1s10n}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{h4sh_3xt3ns10n_4nd_c4n0n1c4l_c0ll1s10n}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Signature Verification Flaw
The document signing portal verifies files using a prefix-MAC construction:
$$\text{MAC} = \text{SHA256}(\text{Secret} \parallel \text{Document})$$

---

## 2. Hash Length Extension Attack
Because SHA-256 uses the Merkle-Damgård construction without HMAC enveloping, an attacker knowing $\text{len}(\text{Secret})$ and $\text{MAC}(m)$ can compute $\text{MAC}(m \parallel \text{padding} \parallel m')$ without knowing the secret. Appending administrative privilege directives forged a valid signature, unlocking the flag.

