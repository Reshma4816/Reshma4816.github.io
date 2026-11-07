---
title: "Palimpest"
date: 2026-10-11T12:00:00+05:30
description: "Unwinding a 160-instruction state-dependent bytecode hash chain backwards from the final check."
category: "Reverse Engineering"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{p4p3r_r3m3mb3rs_wh4t_1nk_f0rg3ts}"
author: "Reshma Al (Coldcoffee)"
tools: "objdump, Ghidra, Python 3"
tags:
  - "Reverse Engineering"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{p4p3r_r3m3mb3rs_wh4t_1nk_f0rg3ts}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{p4p3r_r3m3mb3rs_wh4t_1nk_f0rg3ts}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Challenge Architecture & VM Disassembly
`palimpest` is a 4KB stripped x86-64 binary compiled with Zig. It implements an internal virtual machine that evaluates a 160-instruction program.

Unlike static VMs, each instruction in the bytecode stream is encrypted with an adaptive rolling hash chain:
$$K_{n+1} = \text{Hash}(K_n \parallel \text{RegState}_n)$$

The final instruction performs a register comparison against a hardcoded 32-byte constant in `.rodata`.

---

## 2. Inverting the VM
Because every opcode in the instruction set is an invertible permutation (rotations, XOR additions, and reversible modular arithmetic), and the terminal register state is fixed, we inverted the virtual machine by stepping instructions backwards from 159 down to 0, recovering the flag.

