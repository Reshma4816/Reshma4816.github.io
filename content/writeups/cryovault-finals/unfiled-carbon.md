---
title: "Unfiled Carbon"
date: 2026-10-12T15:30:00+05:30
description: "Emulate deterministic aliasing to recover a hash key for free, solve a 128-element permutation puzzle with a SAT solver, then untangle a sorted quadratic-form leak with a single lattice reduction to recover four 64-bit secrets."
category: "Mobile Security"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{8490178b551995107c983adf09a80bc2}"
author: "Reshma Al (Coldcoffee)"
tools: "jadx, objdump, Python 3, pysat/CaDiCaL, fpylll"
tags:
  - "Mobile Security"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{8490178b551995107c983adf09a80bc2}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{8490178b551995107c983adf09a80bc2}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Shape of the Problem
`unfiled-carbon.apk` wants a 304-byte "recovery code" (608 hex characters) to restore one encrypted note. That code splits into a 32-byte key (four 64-bit values) plus a 272-byte tail (two 128-element permutations and a 128-bit state), and none of it is stored anywhere — all 304 bytes have to be reconstructed in three independent stages, each guarding the next with AES-GCM.

---

## 2. Stage 1: A Hash That Needs No Secret at All
The first stage derives a value called `shape`, used to decrypt a calibration blob. It comes from replaying 173 operations over a small set of cell objects that get copied, swapped, aliased, or round-tripped through Android's `Parcel` mechanism (which, notably, deep-copies and therefore *breaks* aliasing). After each operation, the app hashes the *identity* numbering of the cell objects — tracked via an identity-based hash map — rather than their values.

That's the key insight: since this identity numbering depends purely on which objects alias which others, and never on any byte value from the actual secret, the entire replay is fully emulable in plain Python with zero unknowns. Hashing the resulting identity-layout stream reproduces `shape` exactly, confirmed the moment it successfully decrypts the calibration blob (the AES-GCM tag verifies).

---

## 3. Stage 2: The 272-Byte Tail as a SAT Problem
The decrypted calibration data is itself a small program of nearly 2,900 records, each one a short sequence of lookup operations through the two unknown 128-element permutation tables, ending in a requirement that two bits of the unknown 128-bit state (selected via those permutations) XOR to a given expected value. The permutations also have to be genuine bijections on 0–127, and one specific state bit is pinned to zero.

The overwhelming majority of these records reduce to the same simple shape — comparing two state bits related by a fixed offset under one of the two permutations — with a smaller set of irregular records that pin down exactly how the two permutations relate to each other. Encoding all of this directly as a SAT problem (one-hot constraints forcing each permutation table to be a genuine bijection, free boolean variables for every state bit, and the irregular records unrolled explicitly) and handing it to a modern SAT solver returns a single, unique satisfying assignment — one that satisfies every one of the nearly 2,900 records simultaneously, and which successfully decrypts the next stage's data with its GCM tag intact.

---

## 4. Stage 3: Four Secret 64-Bit Values Behind a Quadratic Leak
The remaining unknowns are four 64-bit values consumed by native code. Reverse engineering that native code reveals an elegant trick: every function first takes a fixed-exponent modular root of its inputs and produces modular powers as outputs, working over a large prime field. In that "root domain," every one of the native operations is **linear** — which means the whole native computation is really just linear algebra over a finite field, dressed up in modular exponentiation.

Each individual output value a group reveals is the top bits of a *quadratic form* in the four unknown secret values, and the four outputs within each group get sorted before being revealed — deliberately hiding which quadratic form produced which number. The trick that cracks this: **summing all four quadratic forms within a group is order-independent**, so the sort doesn't matter once you sum. That sum, taken modulo the field's prime, gives one linear equation in the ten possible pairwise products of the four unknowns, with a small bounded amount of rounding noise from the "top bits only" leak.

With 64 independent groups available, that's 64 such noisy linear equations in only 10 unknowns — exactly the kind of structured, bounded-noise system a single lattice reduction (via a Kannan embedding) solves cleanly in one shot, recovering all ten pairwise products exactly. From there, one of the four original secrets falls out as a modular square root of its own self-product (the field's prime has a form that makes this square root computation straightforward), and the other three follow by simple division. Every one of the 64 groups reproduces its leaked, sorted output correctly once the final authentication check (the note's own GCM tag) passes — confirming the right overall sign was chosen, since the negation of the correct secret set produces identical leaked outputs but fails to actually authenticate the final note.

---

## 5. Assembling the Final Code
With the key and the full 272-byte tail both recovered, concatenating them into the complete 608-hex-character recovery code and feeding it to the app's own decryption logic recovers the note cleanly.

**Flag:** `isfcr{8490178b551995107c983adf09a80bc2}`

---

## 6. Takeaways
- Some "secrets" aren't secret at all — a hash built entirely from object-identity/aliasing structure, with no dependence on any actual byte values, can be fully reproduced offline with no unknowns whatsoever; it's worth checking exactly what a hash function's inputs actually are before assuming it needs to be attacked.
- A system of many simple equality constraints over two unknown permutations is a strong candidate for direct SAT encoding — one-hot bijection constraints plus the raw per-record requirements, handed to a solver, is usually far faster than trying to reason through the permutation structure by hand.
- When intended to obscure which of several derived values corresponds to which internal computation, a final sort can often be defeated by finding an order-independent combination (a sum, here) of the very values being shuffled — order-independence turns a confusing permutation into a non-issue.
- Multiple noisy, bounded-error linear equations over a modest number of unknowns is the classic shape of a lattice attack — a single LLL-style reduction with a Kannan embedding can recover an exact integer solution well before you'd need any heavier cryptanalytic machinery.
