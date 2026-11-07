---
title: "end-mark"
date: 2026-10-11T12:00:00+05:30
description: "Heap exploitation via tcache poisoning and safe linking bypass in glibc 2.35."
category: "Binary Exploitation"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{gl1bc_235_tc4ch3_p01s0n1ng_r00t}"
author: "Reshma Al (Coldcoffee)"
tools: "GDB-GEF, pwntools, Python 3"
tags:
  - "Binary Exploitation"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{gl1bc_235_tc4ch3_p01s0n1ng_r00t}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{gl1bc_235_tc4ch3_p01s0n1ng_r00t}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Binary Protections & Heap Flaw
The binary runs under glibc 2.35 with full protections (RELRO, Canary, NX, PIE).
A classic Use-After-Free (UAF) vulnerability allows writing to a chunk after it has been freed into the tcache bin.

---

## 2. Safe Linking Bypass & Exploitation
glibc 2.35 protects tcache pointers with safe linking:
$$P' = (L \gg 12) \oplus P$$
By leaking the heap base address, we inverted the pointer mangling and poisoned the tcache forward pointer to point to the `__environ` pointer and overwrite the return address on the stack with a one_gadget ROP chain, yielding an interactive root shell.

