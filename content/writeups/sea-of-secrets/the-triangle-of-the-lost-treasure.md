---
title: "The Triangle of the Lost Treasure"
date: 2026-11-01T11:30:00+05:30
description: "Read a deterministic triangle judge's canonical answers and reproduce its hash-derived keystream without playing the rounds."
category: "Reverse Engineering"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Medium"
points: 300
flag: "SoS{tr14ngl3_tr34sur3_k3ystr34m_inv3rt}"
author: "Reshma Al (Coldcoffee)"
tools: "Ghidra, GDB, Python 3"
tags:
  - "Reverse Engineering"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>SoS{tr14ngl3_tr34sur3_k3ystr34m_inv3rt}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('SoS{tr14ngl3_tr34sur3_k3ystr34m_inv3rt}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Reversing the Triangle Evaluation Logic
The challenge binary prompts the player to solve 100 consecutive mathematical triangle puzzles within a 5-second timeout. Disassembling with Ghidra revealed that the puzzle matrices are generated deterministically using a linear congruential generator (LCG) seeded with the system PID and timestamp.

---

## 2. Bypassing the Game Loop
Instead of playing the game interactively over the socket, we extracted the underlying PRNG state update equation and the static XOR keystream derived from the victory state. Writing a solver that mirrors the internal matrix solver offline unsealed the flag immediately.

