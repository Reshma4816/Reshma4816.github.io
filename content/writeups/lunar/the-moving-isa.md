---
title: "The Moving ISA"
date: 2026-09-20T10:09:00+05:30
description: "Reversing a two-phase custom VM whose opcode-to-handler mapping reshuffles every seven instructions, with input-dependent self-decrypting bytecode."
category: "Reverse Engineering"
ctf: "Lunar CTF Quals"
difficulty: "Easy"
points: 80
flag: "Lun4R{sh1ft1ng_s4nds_0f_0pc0d3s}"
author: "Reshma Al (Coldcoffee)"
tools: "objdump, strings, Python 3 (custom VM emulator)"
tags:
  - "Reverse Engineering"
  - "Lunar CTF Quals"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>Lun4R{sh1ft1ng_s4nds_0f_0pc0d3s}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('Lun4R{sh1ft1ng_s4nds_0f_0pc0d3s}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Challenge
Two stripped x86-64 ELFs, `moving_isa_spector` (Phase I) and `moving_isa_lockley` (Phase II), wrapped in Moon Knight flavor text about runes that "never change their physical carvings" yet "take on entirely new meanings" every seven cycles. Translated out of the theming:

| Hint | Meaning |
|---|---|
| "Runes never change their physical carvings" | The bytecode bytes on disk are static |
| "Every seven cycles... new meanings" | The opcode→handler mapping reshuffles every 7 instructions |
| "A false incantation fractures the machine" | The shuffle depends on program state, so a wrong input decodes to garbage |
| Two binaries | Phase I outputs a token consumed by Phase II |

`strings` on both binaries lays out the flow directly: Phase I reads an "Activation Seal," prints a `Celestial Token`, and tells you to invoke Phase II with it; Phase II reads that token plus a "Sanctum Key" and, on success, prints `Access Granted! Flag: Lun4R{...}`. The success string sits in Phase II's rodata in plaintext, which is worth knowing but doesn't confirm the real solve path, so the rest of this writeup reverses the VM properly and checks that string against a key actually derived from the logic.

---

## 2. The VM Structure
Phase I's `main` reads a line (minimum 16 bytes), calls `vm_init(bytecode@0x401500, size=0x189, input)`, then `vm_run`. The VM state is a flat struct holding 8 registers (`r0`–`r7`), a program counter, 4 KB of code memory (the copied bytecode), 4 KB of data memory (input copied in, plus a 256-byte table at `+0x300` that turns out to be the **AES S-box** — spotted from its first bytes, `63 7c 77 7b`), an epoch counter, a running hash, an instruction counter, and a 13-byte opcode permutation table that starts as the identity.

---

## 3. The Self-Shuffling Dispatcher
The dispatch loop maps a code byte to a handler indirectly: it looks the byte up in a fixed 13-byte canonical table, resolves that index through the mutable `perm[]` array, and jumps through a 13-entry handler table. With `perm` at identity the mapping is static, but after every instruction the VM runs:

```c
h = rol64((r5 & 0xff) ^ h, 5) ^ (handler_index * 0x9e3779b97f4a7c15);
if (++cnt % 7 == 0) {
    seed = h ^ epoch;
    perm = identity;
    for (n = 13; n >= 2; n--) {             // Fisher-Yates
        seed = seed * 0x5851f42d4c957f2d + 0x14057b7ef767814f;
        swap(perm[n-1], perm[(seed >> 33) % n]);
    }
    epoch++;
}
```

The seed mixes in `r5 & 0xff` — and `r5` is the VM's own check accumulator, meaning **the opcode mapping depends on what the user typed**. Feed it a wrong key and the next seven-instruction window decodes as nonsense. That's the "false incantation fractures the machine" line, literally.

Reversing the 13 handlers gives a small, regular ISA: `mov`, `ld`/`st`, `add`/`sub`/`xor`/`rol`, `cmp`, `jcc`/`jmp`, a byte load, `halt`, and one more interesting opcode — `dec addr,len,reg` — which XORs a block of code memory using a keystream built from a fixed counter pattern **and a live register value**. The next block of bytecode is only decryptable once you already know the register value from solving the current one, which is what "unraveling each phase in sequence" means in practice: static disassembly alone only ever reveals block 1.

---

## 4. Emulating Instead of Hand-Tracing
Reasoning about the reshuffle by hand doesn't scale, so I wrote the VM in Python (opcode table, permutation shuffle, and the self-decrypt opcode included) and ran the real bytecode through it. Block 1 decoded cleanly into 51 sensible instructions: load 8 input bytes, XOR against a constant, rotate, run each byte through the AES S-box while packing into a 64-bit word, subtract a constant, XOR against another constant, and compare the result to a fixed target.

---

## 5. Inverting Block 1
Every step in that chain is a bijection (XOR, rotate, S-box substitution, add/subtract), so instead of searching for an input we can just run the chain backwards from the required target value:

```python
M = (1 << 64) - 1
def rol(x, n): n &= 63; return ((x << n) | (x >> (64 - n))) & M if n else x

r1 = ((0x6957FD449A06FFBB ^ 0xDEADBEEFCAFEBABE) + 0x0123456789ABCDEF) & M
x  = int.from_bytes(bytes(INV_SBOX[(r1 >> 8*k) & 0xFF] for k in range(8)), "little")
x  = rol(x, 64 - 13) ^ 0xA5A5A5A5A5A5A5A5
print(x.to_bytes(8, "little"))   # b'Lun4R{sh'
```

The output — `Lun4R{sh` — is itself the first 8 bytes of the flag, confirming both the inversion and that the "key" the VM wants *is* the flag. With `r5` now equal to the correct value, the `dec` opcode decrypts block 2, which has the identical shape with different constants (different XOR mask, rotate amount, input offset, subtract constant, and target). Inverting it the same way yields the next 8 bytes: `1ft1ng_s`.

**Part 1 (16 chars): `Lun4R{sh1ft1ng_s`**

---

## 6. The Celestial Token and Phase II
At exit, Phase I computes `token = (0x071e57e120240826 + r5) ^ 0xfa89340dff76d2af = 0x0C457112B4ECC0F6`, confirmed by running the real binary:

```
$ echo "Lun4R{sh1ft1ng_s" | ./moving_isa_spector
[+] Phase I Trials Passed: The Outer Seal Dissolves!
[+] Celestial Token: 0x0C457112B4ECC0F6
```

Phase II (`moving_isa_lockley`) is the same VM design, seeded with that token and reading part 2 of the key from stdin, so Phase I can't be skipped. Since part 1 ends mid-word (`...sh1ft1ng_s`), the natural continuation is `4nds_0f_0pc0d3s}`:

```
$ echo "4nds_0f_0pc0d3s}" | ./moving_isa_lockley 0x0C457112B4ECC0F6
[+] Phase II Trials Passed: The Avatar of Khonshu Awakens!
[+] Access Granted! Flag: Lun4R{sh1ft1ng_s4nds_0f_0pc0d3s}
```

I confirmed part 2 by running the binary rather than fully re-deriving every constant of its VM program the way I did for Phase I — its structure is identical, so the same emulator and inversion approach applies if you want to re-derive it from scratch.

---

## 7. Flag
```
Lun4R{sh1ft1ng_s4nds_0f_0pc0d3s}
```
"Shifting sands of opcodes" — a fitting description of a dispatch table that rewrites itself every seven instructions.

---

## 8. Takeaways
- A large high-entropy blob sitting next to a dozen-or-so-entry jump table is almost always a bytecode VM.
- When a dispatcher's opcode mapping depends on runtime state, static disassembly alone fails — write an emulator that tracks the same state instead of reasoning about it by hand.
- Chains built entirely from XOR, rotate, S-box lookups, and add/subtract are bijections: run them backwards from the target rather than brute-forcing or reaching for an SMT solver.
- Recognizable constants save time: `63 7c 77 7b` is the AES S-box, `0x9e3779b97f4a7c15` is the golden-ratio hash constant, and `0x5851f42d4c957f2d` is a well-known 64-bit LCG multiplier.
