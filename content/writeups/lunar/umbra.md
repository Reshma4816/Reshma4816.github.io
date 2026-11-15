---
title: "Umbra"
date: 2026-09-20T18:27:00+05:30
description: "A stripped binary accepts 21,216 different keys against its 32-equation access check, but a hidden state mutation means only one of them survives the downstream CRC integrity check."
category: "Reverse Engineering"
ctf: "Lunar CTF Quals"
difficulty: "Easy"
points: 80
flag: "Lun4R{sh4d0w_c4lc_1n_th3_lunar_umbra_7a9f}"
author: "Reshma Al (Coldcoffee)"
tools: "objdump, Python 3 (bit-lifting constraint solver)"
tags:
  - "Reverse Engineering"
  - "Lunar CTF Quals"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>Lun4R{sh4d0w_c4lc_1n_th3_lunar_umbra_7a9f}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('Lun4R{sh4d0w_c4lc_1n_th3_lunar_umbra_7a9f}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Triage
A single file, `umbra` — a 19 KB stripped, PIE, dynamically-linked ELF, no symbols. With only `objdump -d -M intel`, `strings`, and Python available (no GDB, no Capstone), everything has to come from static disassembly. Running it with no arguments gives the usage line:

```
Usage: ./umbra <64-hex-token | Lun4R{64-hex} | 32-byte-token>
```

---

## 2. Strings and the Shape of the Problem
```
[-] Invalid Access Sequence. Carrier lock lost.
[+] Access Sequence Verified: Checksum 0x9E3779B97F4A7C15 confirmed.
[+] Payload Decrypted Successfully:
[-] Frame Integrity Check Failed: Syndrome 0x%08X != 0x00000000. Decryption aborted.
expand 32-byte k
```

Two distinct failure messages mean two distinct stages: an "Access Sequence" gate, and a separate "Frame Integrity" check that only runs after the gate passes — matching the challenge text's "accepts a valid key, yet the inner transmission fails its integrity check." `expand 32-byte k` is the ChaCha20 constant, confirming this is a ChaCha20 decryptor, and "Syndrome" is a CRC-style value checked against the decrypted output. `0x9E3779B97F4A7C15` is just the golden-ratio hash constant — flavor, not logic.

Input handling accepts four equivalent forms (`Lun4R{...}` wrapped hex, raw hex, wrapped raw bytes, or raw bytes), all decoding to the same 32-byte key in memory — and critically, this means the binary can be driven entirely from a script, which makes it a perfect oracle later.

---

## 3. The Three Stages
Reading `main` top to bottom: **(1) key schedule + access check** — the key is processed 8 bytes at a time across 4 blocks, each block checked against 8 modular equations and mutating a 64-byte hidden state; **(2) shadow key** — after all four blocks, a final mixing pass folds that state into a 32-byte value `K'`; **(3) decrypt** — `SHA-256(key || ctx)` is XORed with `K'` to form the real ChaCha20 key, which decrypts a 64-byte blob and checks a CRC32 over it. A key that passes stage 1 but fails stage 3 is exactly the "valid key, failed integrity" behavior the challenge describes.

---

## 4. Reconstructing the Access-Check Equations
Dumping the relevant `.rodata` tables and decoding the XOR-obfuscated context string (`LUN4R_LIGHT_RAIL_2026`) sets up the inputs. Translating the compiler's `lea`/`shl`/`sub` multiply tricks back into plain coefficients for each of the four 8-byte blocks gives 8 equations per block, mod 256:

```
0:   a0 + 3a1 + 7a2 + 2a3 + 5p1
1:   5a1 + 4a3 + a2 + 9a4
2:   2a2 + 8a3 + a4 + 3a5
3:   7a3 + 3a4 + 5a5 + a6
4:   4a4 + 2a5 + 6a6 + a7 + 3p2
5:   (a0^a2^a4^a6^p1) + (a1^a3^a5^a7)
6:   3a0 + 7a1 + 5a2 + 11a3 + a4 + 3a5 + 9a6 + 5a7 + 7p1
7:   7a0 + 3a2 + 11a4 + 5a6 + 13p1
```

where `p1`/`p2` are the last two bytes of the *previous* block (hard-coded to `0x5a`/`0xa5` for block 0), chaining the four blocks together. The best check on a hand-transcribed set of equations like this is the binary itself: any candidate key they produce has to make the program print `Access Sequence Verified`. It did, on the first try — a single wrong coefficient would have rejected everything.

---

## 5. Solving 32 Equations Without a SAT Solver
Every operation here is addition, multiplication by a constant, or XOR — and for all three, the low `k` bits of the result depend only on the low `k` bits of the inputs. That enables bit-lifting: solve bit 0 of all 8 bytes first (256 possibilities, keep survivors matching mod 2), then extend to bit 1 (matching mod 4), and so on up to bit 7. The survivor count stays tiny at every step, so the whole thing runs instantly, and chaining the four blocks (each one's `a7`/`a6` feeding the next as `p1`/`p2`) gives **21,216 keys that satisfy the full access-sequence constraint** — a lot of *valid* keys, but only one *true* key.

```python
def solve_block(blk, p1, p2):
    t = T[8*blk:8*blk+8]
    cands = [(0,)*8]
    for k in range(8):
        m = (1 << (k+1)) - 1
        nxt = []
        for c in cands:
            for mask in range(256):
                a = tuple(c[i] | (((mask >> i) & 1) << k) for i in range(8))
                e = eqs(a, p1, p2)
                if all(((e[i] - t[i]) & m) == 0 for i in range(8)):
                    nxt.append(a)
        cands = nxt
    return cands
```

---

## 6. Finding the One True Key
Two independent routes land on the same answer. Letting the binary act as an oracle — feeding each of the 21,216 candidates to `./umbra` and checking for `Payload Decrypted Successfully` — finds exactly one that passes. Filtering the same candidate set to printable ASCII, with no oracle at all, *also* leaves exactly one survivor: `Lun4R_0rbital_umbra_2026_key_7a9`. Both methods agreeing is a solid sanity check, and it means the challenge is fully solvable offline once the equations are recovered.

---

## 7. Why the Other 21,215 Keys Fail
This is the "duality" the challenge hints at. While checking each block, the program also rewrites the hidden 64-byte state using the key bytes themselves — indexing into the state with the key byte XORed against a counter and a constant, then applying a key-dependent rotate-shuffle. The equations only look at the key's surface value (the "visible ritual"), but every key byte is simultaneously written into that state (the "shadow"). After all four blocks, a final vectorized mixing pass folds the state into `K'`, and a *different* key that happens to satisfy the same 32 equations still leaves a different state behind — a different `K'`, a different ChaCha key, and garbage plaintext that fails the CRC. That's the "syndrome" in the error message.

> **Honest note:** the stage 2/3 structure (ChaCha constants, the SHA-256 IV, the state-mixing pass, the CRC loop) was derived from disassembly and confirmed against the binary's behavior, but not independently re-implemented in Python — the binary itself served as the oracle for that part.

---

## 8. Getting the Flag
```
$ ./umbra 4c756e34525f3072626974616c5f756d6272615f323032365f6b65795f376139
[+] Access Sequence Verified: Checksum 0x9E3779B97F4A7C15 confirmed.
[+] Lunar Telemetry Gateway Unlocked. Initializing transmission decoder...
[+] Payload Decrypted Successfully:
Lun4R{sh4d0w_c4lc_1n_th3_lunar_umbra_7a9f}
```

**Flag:** `Lun4R{sh4d0w_c4lc_1n_th3_lunar_umbra_7a9f}` — fittingly, "shadow calc in the lunar umbra."

---

## 9. The Solver
```python
#!/usr/bin/env python3
import subprocess, sys

BIN = sys.argv[1] if len(sys.argv) > 1 else "./umbra"
d = open(BIN, "rb").read()
T = list(d[0x3780:0x37A0])

def eqs(a, p1, p2):
    a0, a1, a2, a3, a4, a5, a6, a7 = a
    return [
        a0 + 3*a1 + 7*a2 + 2*a3 + 5*p1,
        5*a1 + 4*a3 + a2 + 9*a4,
        2*a2 + 8*a3 + a4 + 3*a5,
        7*a3 + 3*a4 + 5*a5 + a6,
        4*a4 + 2*a5 + 6*a6 + a7 + 3*p2,
        (a0 ^ a2 ^ a4 ^ a6 ^ p1) + (a1 ^ a3 ^ a5 ^ a7),
        3*a0 + 7*a1 + 5*a2 + 11*a3 + a4 + 3*a5 + 9*a6 + 5*a7 + 7*p1,
        7*a0 + 3*a2 + 11*a4 + 5*a6 + 13*p1,
    ]

def solve_block(blk, p1, p2):
    t = T[8*blk:8*blk+8]
    cands = [(0,)*8]
    for k in range(8):
        m = (1 << (k+1)) - 1
        nxt = []
        for c in cands:
            for mask in range(256):
                a = tuple(c[i] | (((mask >> i) & 1) << k) for i in range(8))
                e = eqs(a, p1, p2)
                if all(((e[i] - t[i]) & m) == 0 for i in range(8)):
                    nxt.append(a)
        cands = nxt
    return cands

states = [(0x5A, 0xA5, ())]
for blk in range(4):
    states = [(a[7], a[6], pre + a)
              for p1, p2, pre in states
              for a in solve_block(blk, p1, p2)]
keys = [bytes(pre) for _, _, pre in states]
print(f"[*] {len(keys)} keys satisfy the access-sequence constraints")

printable = [k for k in keys if all(32 <= b < 127 for b in k)]
print(f"[*] {len(printable)} of them are printable ASCII")

for k in keys:
    out = subprocess.run([BIN, k.hex()], capture_output=True, text=True).stdout
    if "Decrypted Successfully" in out:
        print(f"[+] key : {k.decode(errors='replace')}")
        print(f"[+] hex : {k.hex()}")
        print(out.strip().splitlines()[-1])
        break
```

```
[*] 21216 keys satisfy the access-sequence constraints
[*] 1 of them are printable ASCII
[+] key : Lun4R_0rbital_umbra_2026_key_7a9
[+] hex : 4c756e34525f3072626974616c5f756d6272615f323032365f6b65795f376139
Lun4R{sh4d0w_c4lc_1n_th3_lunar_umbra_7a9f}
```

---

## 10. Takeaways
- "Accepted" isn't "correct" — a gate that only checks *properties* of a key usually admits many of them. When a challenge says a key is valid but something downstream still fails, count the solutions.
- Bit-lifting beats brute force whenever every constraint is built only from `+`, constant `×`, and `XOR` mod 2ⁿ: solve one bit at a time and the search space collapses from astronomical to a few thousand.
- Look for side effects — a hidden state mutated as a byproduct of the visible check is exactly what separates one true key from its 21,215 look-alikes.
- Use the program as an oracle. Fully reversing the state-mixing pass wasn't necessary once the binary's own integrity check could tell candidates apart.
- Cross-check two ways when possible — printable-ASCII filtering and a brute-force oracle landing on the same answer is a strong signal both are right.
