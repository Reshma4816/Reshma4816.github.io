---
title: "The Cursed Syscall"
date: 2026-11-01T09:00:00+05:30
description: "Realize a nonexistent syscall number exists purely to drive a seccomp BPF filter, translate that filter into arithmetic constraints over sliding argument windows, and solve them with Z3."
category: "Reverse Engineering"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Medium"
points: 300
flag: "FLAG{c4pt41n_fl1nt_s_curs3d_c0mp4ss_st33rs_t0_tru7h}"
author: "Reshma Al (Coldcoffee)"
tools: "objdump, Python 3, Z3"
tags:
  - "Reverse Engineering"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>FLAG{c4pt41n_fl1nt_s_curs3d_c0mp4ss_st33rs_t0_tru7h}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('FLAG{c4pt41n_fl1nt_s_curs3d_c0mp4ss_st33rs_t0_tru7h}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Finding the Checker
The binary is a stripped 16 KB x86-64 PIE. `main` reads a line with `fgets`, strips the trailing newline, and immediately demands `strlen(input) == 0x34` — exactly 52 bytes. Those 52 bytes get copied onto the stack and reinterpreted as thirteen little-endian 32-bit chunks. Nothing in `main` itself obviously validates the input beyond the length check, which is the first sign the real validation logic is happening somewhere less obvious.

---

## 2. The Seccomp Filter Is the Real Checker
Right after the length check, the program calls `prctl(PR_SET_NO_NEW_PRIVS, 1)` followed by `prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog)` — installing a seccomp-bpf filter on itself. The `sock_fprog` structure points at 192 classic BPF instructions sitting in `.data`.

After installing the filter, the program loops exactly 12 times (a counter starts at 1, increments before each syscall, and the loop ends when it's compared against 13). Each iteration selects four consecutive 32-bit chunks with wraparound — `(v[s], v[s+1], v[s+2 mod 13], v[s+3 mod 13])` — and passes them as arguments to `syscall(1718, ...)`.

Syscall number 1718 (`0x6b6`) doesn't exist in the kernel at all. But seccomp filters run **before** the kernel rejects an unknown syscall number, which means the filter itself is the actual validator: on a match it returns `SECCOMP_RET_ERRNO` with data 0, so the syscall returns with `errno` left at 0 — which the program reads as success. On a mismatch, it returns `SECCOMP_RET_ERRNO` with data 1, the program sees a nonzero `errno`, and prints "Ye walk the plank." Every normal syscall the program actually needs is separately allowed through, so this whole mechanism exists purely to validate the twelve 4-argument windows.

---

## 3. Translating the BPF Filter Into Arithmetic
Decoding the 192-instruction BPF program by hand gives a clean set of rules: if the syscall number isn't `0x6b6`, allow it unconditionally. Otherwise, require every byte of the first argument to be below `0x80` (keeping things in printable-ASCII range), then compute four derived values from the four 32-bit arguments:

```
M0 = a0
M1 = a1 ^ M0
M2 = a2 ^ M1
M3 = a3 ^ M2
M4 = M0 + M1 + M2 + M3
M5 = M0 + M1 - M2 - M3
M6 = M0 - M1 + M2 - M3
M7 = M0 - M1 - M2 + M3
M8  = (M6 | M7) ^ (M4 & M5)
M9  = (M7 | M4) ^ (M5 & M6)
M10 = (M4 | M5) ^ (M6 & M7)
M11 = (M5 | M6) ^ (M7 & M4)
```

The filter then compares `(M8, M9, M10, M11)` against twelve hard-coded 4-tuples; only an exact match against one of those twelve gets the "success" errno, everything else fails.

---

## 4. Solving the Overlapping Sliding Windows
Because the program's twelve calls are sliding windows over the *same* thirteen 32-bit chunks (each window overlapping its neighbors by three chunks), the correct 52-character phrase has to satisfy all twelve window constraints simultaneously — this isn't twelve independent problems, it's one tightly coupled system. I modeled it with Z3: thirteen 32-bit unknowns restricted to printable ASCII, with `v[0] == "FLAG"`, byte 4 fixed to `'{'`, byte 51 fixed to `'}'`, and each of the twelve sliding windows constrained to equal one of the filter's allowed tuples.

The very first model Z3 returned already produced a clearly readable prefix: `FLAG{c4pt41n_fl1nt_s_curs3d_c0mp4ss_st33rs_t`. Fixing that prefix and the closing brace as additional constraints and re-solving for just the remaining unknowns narrowed it down to exactly one possible tail: `0_tru7h}`.

---

## 5. Verifying Offline
Rather than trusting the solver output blindly, I reimplemented the program's full argument-scheduling logic and the BPF filter's arithmetic in plain Python and ran the solved phrase through it end to end. It passes all twelve calls with `errno` staying at 0 throughout, and — more importantly — each of the twelve calls lands on a **different** one of the twelve allowed tuples, hitting every single one exactly once. That's a bijection onto the filter's entire allow-list, which is much stronger evidence this is the one intended phrase rather than just *a* phrase that happens to satisfy the constraints.

**Flag:** `FLAG{c4pt41n_fl1nt_s_curs3d_c0mp4ss_st33rs_t0_tru7h}`

---

## 6. Takeaways
- A syscall number that doesn't exist in the kernel is a strong signal the program is using seccomp as a disguised validator — the "syscall" itself is never meant to succeed; the filter's accept/reject decision is the actual logic.
- Seccomp-bpf filters are themselves just a small bytecode VM, and decoding one by hand into plain arithmetic constraints is very achievable once you recognize the classic BPF instruction set.
- When input windows overlap (each syscall reusing three of the previous call's four arguments), a constraint solver like Z3 handles the coupling far more reliably than trying to reason through the overlaps by hand.
- A solved candidate that satisfies every constraint isn't automatically the intended answer — checking that it maps bijectively onto the full allow-list, rather than just satisfying the system at all, is what separates "a solution" from "the solution."
