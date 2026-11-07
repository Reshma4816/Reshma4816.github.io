---
title: "Half-truths"
date: 2026-10-11T12:00:00+05:30
description: "De-obfuscating control flow flattening and solving opaque predicates with symbolic execution."
category: "Reverse Engineering"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{0p4qu3_pr3d1c4t3s_c4nn0t_h1d3_truth}"
author: "Reshma Al (Coldcoffee)"
tools: "angr, Ghidra, Python 3"
tags:
  - "Reverse Engineering"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{0p4qu3_pr3d1c4t3s_c4nn0t_h1d3_truth}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{0p4qu3_pr3d1c4t3s_c4nn0t_h1d3_truth}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Binary Obfuscation
The target binary is protected with Tigress-style control flow flattening and complex mathematical opaque predicates based on $7x^2 - 1 \neq y^2$.

---

## 2. Symbolic Execution with Angr
We scripted Angr to trace execution paths leading to `puts("Access Granted")` while avoiding `puts("Access Denied")`. Constraining the input bitvector to printable characters solved all 32 constraint checks in 45 seconds.

