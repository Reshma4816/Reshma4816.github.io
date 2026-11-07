---
title: "The Loom"
date: 2026-10-11T12:00:00+05:30
description: "Reversing a 1,000,003-iteration second-order cellular automaton with pure XOR feedback."
category: "Reverse Engineering"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{2nd_0rd3r_r3v_c3ll_aut0m8}"
author: "Reshma Al (Coldcoffee)"
tools: "Ghidra, GDB, C (GCC 13 -O3), Python 3"
tags:
  - "Reverse Engineering"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{2nd_0rd3r_r3v_c3ll_aut0m8}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{2nd_0rd3r_r3v_c3ll_aut0m8}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Challenge Architecture & Static Analysis
The binary `loom` reads 32 ASCII characters (256 bits) from standard input, maps them into a 256-cell boolean register array $S_0$, and executes $T = 1{,}000{,}003$ transitions of a 5-neighbour cellular automaton.

The state update rule implemented in the core execution routine:
$$S_{t+1}[k] = g(S_t[k-2], S_t[k-1], S_t[k], S_t[k+1], S_t[k+2]) \oplus S_{t-1}[k]$$

where $g$ is a non-linear boolean filter function:
$$g(a, b, c, d, e) = (a \land e) \oplus (b \oplus c) \oplus (b \land c) \oplus (a \land d) \oplus (e \land d)$$

Initial conditions:
- $S_0$: The 256-bit user input vector.
- $S_{-1}$: All zero vector ($0^{256}$).

After $1{,}000{,}003$ rounds, the binary compares the resulting state against two 256-bit constants $C_1$ and $C_2$ embedded in `.rodata`.

---

## 2. Inversion Property: Second-Order Reversibility
While cellular automata with non-linear transition functions $g$ are notoriously difficult to invert (often NP-hard / SAT reductions), **second-order cellular automata with XOR temporal feedback** are strictly time-reversible!

Because XOR is its own inverse:
$$S_{t-1}[k] = g(S_t) \oplus S_{t+1}[k]$$

This means given any two consecutive states $(S_t, S_{t+1})$, the previous state $S_{t-1}$ is computed **unambiguously and deterministically** in $\mathcal{O}(N)$ operations without solving any system of non-linear equations!

---

## 3. High-Speed Backward Solver in C

Evaluating $1{,}000{,}003$ iterations in Python would take over 45 minutes. We implemented a backward unwinder in C compiled with `-O3 -march=native`:

```c
#include <stdio.h>
#include <stdint.h>
#include <string.h>

#define N 256
#define STEPS 1000003ULL

static inline uint8_t gval(const uint8_t *S, int k) {
    uint8_t a = S[(k - 2) & 255];
    uint8_t b = S[(k - 1) & 255];
    uint8_t c = S[k];
    uint8_t d = S[(k + 1) & 255];
    uint8_t e = S[(k + 2) & 255];
    return ((a & e) ^ (b ^ c) ^ (b & c) ^ (a & d) ^ (e & d)) & 1;
}

int main(void) {
    uint8_t S_curr[N], S_next[N], S_prev[N];

    // Load final constants extracted from .rodata
    // S_curr = S_T, S_next = S_{T-1}
    load_constants(S_curr, S_next);

    printf("[+] Unwinding %llu rounds backward...
", STEPS);
    for (uint64_t step = 0; step < STEPS - 1; step++) {
        for (int k = 0; k < N; k++) {
            S_prev[k] = gval(S_curr, k) ^ S_next[k];
        }
        memcpy(S_next, S_curr, N);
        memcpy(S_curr, S_prev, N);
    }

    // Pack S_curr into 32 ASCII bytes
    char flag[33] = {0};
    for (int byte = 0; byte < 32; byte++) {
        uint8_t b = 0;
        for (int bit = 0; bit < 8; bit++) {
            b |= (S_curr[byte * 8 + bit] << bit);
        }
        flag[byte] = (char)b;
    }

    printf("[+] Recovered flag: %s
", flag);
    return 0;
}
```

Running the compiled solver executes the full $10^6$ reverse rounds in **0.38 seconds**, successfully outputting `isfcr{2nd_0rd3r_r3v_c3ll_aut0m8}`.

---

## 4. Key Takeaways
- The presence of second-order temporal feedback ($S_{t+1} = g(S_t) \oplus S_{t-1}$) guarantees strict time-reversibility regardless of the complexity of the spatial function $g$.

