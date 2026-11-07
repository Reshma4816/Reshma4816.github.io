---
title: "Oatmeal"
date: 2026-10-11T12:00:00+05:30
description: "Reversing custom ARM64 bytecode VM inside extracted Android base.odex blob."
category: "Mobile Security"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Medium"
points: 350
flag: "isfcr{5958fbb07efd243b}"
author: "Reshma Al (Coldcoffee)"
tools: "apktool, Capstone, Python 3"
tags:
  - "Mobile Security"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{5958fbb07efd243b}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{5958fbb07efd243b}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Android ODEX Extraction
Analyzing `oatmeal.apk`, standard DEX decompilation showed a native method `checkFlag(String input)`. The binary logic was stored not in a traditional `.so` library, but inside an optimized Android runtime blob `base.odex`.

---

## 2. Disassembly & Constraint Inversion
Disassembling the target function with Capstone revealed 24 blocks of 11 ARM64 instructions, each validating one character via cyclic bit-rotation and table lookup.
Inverting the 24 independent constraints yielded the string `art_image_took_the_cake!`. Computing the 64-bit FNV-1a hash and XORing with constant `0xa55a96693c3cd2ad` produced the flag.

