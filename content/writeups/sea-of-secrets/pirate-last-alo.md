---
title: "Pirate's Last Algorithm"
date: 2026-11-01T05:30:00+05:30
description: "Reverse a small custom bytecode VM and its running hash accumulator to directly invert a 22-character authorization key, then use the recovered hash to seed an LCG decrypting the flag."
category: "Reverse Engineering"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Hard"
points: 350
flag: "HACKITUP{b14ckth0rn_v4u1t_c04st41_4str014b3_m4st3r}"
author: "Reshma Al (Coldcoffee)"
tools: "objdump, Python 3"
tags:
  - "Reverse Engineering"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>HACKITUP{b14ckth0rn_v4u1t_c04st41_4str014b3_m4st3r}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('HACKITUP{b14ckth0rn_v4u1t_c04st41_4str014b3_m4st3r}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. A Head Start From the Symbols
`blackthorn_vault.exe` is a 32-bit MinGW console PE that prompts for a "Captain's authorization key." Unlike most of this event's reversing challenges, it still has its symbol table intact, which hands over the data layout for free: `g_astrolabe_program`, `g_rune_table`, and `g_vault_ciphertext` are all named exactly as they are. The key gets checked by a small bytecode VM, the VM's result feeds a 32-bit hash, and that hash seeds an LCG that decrypts the flag.

---

## 2. Locating the Data
`.rdata` sits at VMA `0x404000`, file offset `0x1a00`, so any virtual address converts with `raw = 0x1a00 + (va - 0x404000)`:

| Symbol | VA | Content |
|---|---|---|
| `g_vault_ciphertext` | `0x4042a0` | 51 bytes |
| `g_astrolabe_program` | `0x4042e0` | VM code, 12 bytes per instruction (op, a, b as u32) |
| `g_rune_table` | `0x4044a0` | 256-byte S-box |

---

## 3. The Key Format and Preprocessing
`main` wants a 22-character key shaped `BT-XXXX-XXXX-XXXX-XXXX` — literal `B`, `T` at positions 0–1, dashes at positions 2, 7, 12, and 17. The four hex groups parse into words `w0..w3`, which get lightly mixed before the VM ever sees them:

```c
M[0] = dx = rol16(w0, 5) ^ 0xA55A;
M[1] = bx = (w1 + 0x1776) & 0xFFFF;
M[2] = si = (dx ^ w2) & 0xFFFF;
M[3] = m3 = (w3 - bx) & 0xFFFF;
```

---

## 4. Reading the VM
Eight 16-bit registers, 16 words of memory, and a running hash initialized to `0x5A17CAFE`. Opcodes 0–13 cover NOP, MOVI, LOAD, STORE, ADD, SUB, XOR, XORR, ROL, SBOX, CMP, JNE, HASH (`h = h*33 ^ R[a]`), and ADDR; anything above 13 halts. The 36-instruction program is really four independent checks back to back, each loading one `M[i]`, hashing it, and comparing a derived value — any failed comparison jumps straight to a fail block that zeroes a result flag.

---

## 5. Inverting Every Check
Every single constraint in the program is directly invertible in sequence — no guessing or brute force needed, just working backwards from each target value:

```
dx = 0x7C4B ^ 0x1337              = 0x6F7C
bx = ror16(0x8E19 ^ dx, 3)        = 0xBC2C
si = 0xBEEF - 0x4242 - rune[0x7C] = 0x7C28     (rune[0x7C] = 0x85)
m3 = (0xCAFE - rol16(si,4)) ^ bx  = 0xB45B
```

Undoing the preprocessing step from Section 3 recovers the original hex words:

```
w0 = ror16(dx ^ 0xA55A, 5) = 0x3651
w1 = bx - 0x1776           = 0xA4B6
w2 = dx ^ si               = 0x1354
w3 = m3 + bx               = 0x7087
```

Which gives the key: `BT-3651-A4B6-1354-7087`.

---

## 6. Hash, LCG, and the Flag
Running the four HASH instructions over the solved values gives `h = ((((0x5A17CAFE*33)^dx)*33^bx)*33^si)*33^m3 = 0xF2A1C0DD` — which is also the exact constant `main` separately checks against afterward, so the solved key satisfies the final verification step automatically, with no extra searching required. That hash value then seeds the LCG that decrypts the ciphertext byte-by-byte:

```c
seed = 0xF2A1C0DD;
for (i = 0; i < 51; i++) {
    seed = seed * 0x41C64E6D + 0x3039;
    flag[i] = ct[i] ^ (seed >> 16 & 0xFF);
}
```

**Flag:** `HACKITUP{b14ckth0rn_v4u1t_c04st41_4str014b3_m4st3r}`

---

## 7. Solver
```python
data = open("blackthorn_vault.exe", "rb").read()
at = lambda va, n: data[0x1A00 + va - 0x404000:][:n]
rune, ct = at(0x4044A0, 256), at(0x4042A0, 51)
rol = lambda x, n: ((x << n) | (x >> (16 - n))) & 0xFFFF
ror = lambda x, n: ((x >> n) | (x << (16 - n))) & 0xFFFF

dx = 0x7C4B ^ 0x1337
bx = ror(0x8E19 ^ dx, 3)
si = (0xBEEF - 0x4242 - rune[dx & 0xFF]) & 0xFFFF
m3 = ((0xCAFE - rol(si, 4)) & 0xFFFF) ^ bx

w = [ror(dx ^ 0xA55A, 5), (bx - 0x1776) & 0xFFFF, dx ^ si, (m3 + bx) & 0xFFFF]
print("BT-" + "-".join(f"{x:04X}" for x in w))

h = 0x5A17CAFE
for v in (dx, bx, si, m3):
    h = ((h * 33) ^ v) & 0xFFFFFFFF
assert h == 0xF2A1C0DD

out = bytearray()
for c in ct:
    h = (h * 0x41C64E6D + 0x3039) & 0xFFFFFFFF
    out.append(c ^ (h >> 16 & 0xFF))
print(out.decode())
```

---

## 8. Takeaways
- A binary that still ships symbol names is a gift — it tells you not just addresses but intent, and it's worth reading the symbol table before diving into raw disassembly.
- A bytecode VM built entirely from arithmetic, XOR, rotate, and S-box lookups is a strong hint that every check is invertible — work backward from each target value rather than reaching for brute force.
- When a program's final hash comparison is computed from the same values the earlier per-block checks already pinned down, solving the blocks usually solves the final check automatically — verify this before assuming there's a separate search needed.
- Preprocessing steps applied to raw input before a VM ever sees it (rotate, XOR, add/subtract against constants) need to be undone in the *reverse* order they were applied — track each transform's inverse as you go rather than trying to invert the whole chain at once.
