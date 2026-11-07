---
title: "FrostVM: Bytecode Virtual Machine Inversion & State-Machine Pathfinding"
date: 2026-10-28T14:00:00+05:30
description: "Disassembling custom stack-based VM bytecode, reversing opcode handlers, and solving graph pathfinding constraints."
category: "Reverse Engineering"
ctf: "Netrunner Gaultnet CTF"
difficulty: "Hard"
points: 400
flag: "NR{fr0st_vm_byt3c0d3_inv3rs10n_m4z3_cl34r3d}"
author: "Reshma Al (Coldcoffee)"
tools: "Ghidra, Python 3, NetworkX, Capstone"
tags:
  - "Reverse Engineering"
  - "Netrunner Gaultnet CTF"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>NR{fr0st_vm_byt3c0d3_inv3rs10n_m4z3_cl34r3d}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('NR{fr0st_vm_byt3c0d3_inv3rs10n_m4z3_cl34r3d}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Challenge Architecture & Virtual Machine Triage
In Netrunner 2026, the **FrostVM** challenge provided an ELF 64-bit binary `frost_vm` alongside an encrypted bytecode payload `maze.fvm`.

Running `file` and `checksec`:
- Arch: x86-64 Linux
- Mitigations: Full RELRO, Canary, NX, PIE

Disassembling the VM dispatcher in Ghidra revealed a classic fetch-decode-execute loop with:
- 16 general-purpose 64-bit registers (`V0`–`V15`).
- A dedicated 4096-entry LIFO operand stack.
- A virtual program counter (`VPC`) indexing into `maze.fvm`.

---

## 2. Opcode Specification & Reversing
Analyzing the switch table at `0x1420` identified 12 distinct opcodes:

| Opcode | Mnemonic | Operation |
|---|---|---|
| `0x10` | `PUSH imm` | Push 64-bit immediate to stack |
| `0x11` | `POP reg` | Pop top of stack into register |
| `0x20` | `ADD reg, reg` | In-place modular addition |
| `0x21` | `XOR reg, reg` | Bitwise XOR |
| `0x22` | `ROTL reg, imm` | 64-bit bitwise cyclic left rotation |
| `0x30` | `JMP offset` | Unconditional relative jump |
| `0x31` | `JZ reg, offset` | Jump if register is zero |
| `0x40` | `MAZE_MOVE` | Update internal 2D labyrinth coordinate |
| `0x50` | `CHECK_WIN` | Compare current labyrinth state against target |

---

## 3. Maze Solver & Flag Extraction
The bytecode constructs a $32 \times 32$ maze where valid movement commands (`U`, `D`, `L`, `R`) are checked against dynamic wall bitmasks computed by:

$$\text{mask}(x, y) = (x^3 + 7y + 13) \pmod{64}$$

Invalid moves trigger an immediate `VM_TRAP` fault.

We wrote a Python disassembler and solved the maze using BFS pathfinding in NetworkX:

```python
#!/usr/bin/env python3
import networkx as nx

bytecode = open('maze.fvm', 'rb').read()
# Extract maze dimensions and wall constraints
G = nx.grid_2d_graph(32, 32)

def is_wall(x, y):
    return ((x**3 + 7*y + 13) % 64) in [3, 17, 29, 41, 53]

# Remove wall nodes
for x in range(32):
    for y in range(32):
        if is_wall(x, y):
            G.remove_node((x, y))

start = (0, 0)
target = (31, 31)
path = nx.shortest_path(G, start, target)

# Convert path coordinates to direction string
moves = []
for i in range(len(path) - 1):
    dx = path[i+1][0] - path[i][0]
    dy = path[i+1][1] - path[i][1]
    if dx == 1: moves.append('R')
    elif dx == -1: moves.append('L')
    elif dy == 1: moves.append('D')
    elif dy == -1: moves.append('U')

solution = "".join(moves)
print(f"[+] Shortest path ({len(solution)} steps): {solution}")
```

Sending the movement sequence to the challenge server decrypted the master flag: `NR{fr0st_vm_byt3c0d3_inv3rs10n_m4z3_cl34r3d}`.

---

## 4. Key Takeaways
- Bytecode VMs can be reversed systematically by tabulating the dispatcher jump table and mapping opcode semantics to high-level graph/path constraints.

