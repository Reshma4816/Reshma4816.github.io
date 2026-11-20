---
title: "Lying Code"
date: 2026-10-12T17:00:00+05:30
description: "Detect a hidden algebraic-geometry code structure through a Schur-square dimension test, then recover a fixed error-vector support using nothing but linear algebra on shortened and punctured subcodes."
category: "Cryptography"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{7efa56a2343dbdbdd07d9787adec1d9e9842840b}"
author: "Reshma Al (Coldcoffee)"
tools: "SageMath"
tags:
  - "Cryptography"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{7efa56a2343dbdbdd07d9787adec1d9e9842840b}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{7efa56a2343dbdbdd07d9787adec1d9e9842840b}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Claimed Scheme
The handout describes a McEliece-style code-based cryptosystem over GF(509): a 300×480 generator matrix `G`, with 126 "dead cells" (positions where errors are deliberately forced into every encoded block) and only 3 encoded blocks provided. The challenge's own framing is that the public code is indistinguishable from a random linear code — which is exactly the property real McEliece security depends on, and exactly the claim worth testing rather than trusting.

---

## 2. Two Structural Cracks
Two separate observations, each gettable with nothing more than linear algebra on the public data, immediately undermine both of the scheme's load-bearing assumptions:

**The error support never moves.** Since the "dead cell" positions are fixed for the whole storage sector rather than randomized per block, all three blocks' error vectors share the exact same 126-coordinate support — every one of those 126 positions is genuinely nonzero in all three. That alone turns three separate, individually-hard decoding problems into one shared structural target: find that single fixed support, and all three blocks fall at once.

**The code isn't actually random.** Testing the dual code's "Schur square" (the span of all pairwise products of codewords in the dual) reveals a dimension far smaller than a random code of the same size would produce — and that compressed-square-dimension signature, especially once applied to subcodes of several different sizes, is a well-known fingerprint of an **algebraic-geometry code** built from a genus-2 curve, not a plain Reed-Solomon-style code at all. (A couple of follow-up checks — looking at a minimum-weight gap from the optimal bound, and checking for Möbius-related ratios that would indicate a simpler hyperelliptic structure — narrowed down what kind of AG code it specifically wasn't, without needing to fully reconstruct the underlying curve.)

---

## 3. An Attack That Never Needs to Recover the Curve
The actual attack sidesteps algebraic-geometry curve recovery entirely, working only with linear algebra over the dual code and its shortened/punctured variants:

1. Pick a random subset of coordinates to use as a "test window."
2. Shorten the dual code at that window — restricting to codewords that vanish there — producing a smaller code.
3. Separately, puncture the *original* code at the same window and find every vector whose pointwise product with each shortened-dual codeword still lands back inside the (window-restricted) dual code. This recovers a larger space of candidate "evaluation functions."
4. Every one of those candidate functions extends uniquely to a vector in the full dual code, and the real error vectors (reconstructed from known syndromes) impose a linear condition on that extension — specifically, that it must vanish wherever an error actually occurred.
5. Solving that linear system leaves a small solution space: functions that vanish on the error support outside the test window, with no pole at the handful of support points that happened to land inside the window.
6. Repeating this whole process with many different random test windows and intersecting the results converges on exactly the error support — every coordinate gets flagged as "in the support" consistently, every single time it's tested, once enough random windows have been tried.

---

## 4. Decoding Once the Support Is Known
With the fixed 126-coordinate error support fully recovered, decoding each block is now a straightforward linear-algebra problem: solve for the message using only the coordinates *outside* the known error support (since those are guaranteed to be error-free), then double-check that the resulting residual between the codeword and the received block has error weight exactly 126, landing precisely on the known support positions. Concatenating the three decoded blocks, keeping the agreed-upon prefix length, and reinterpreting the digits as a large base-509 integer recovers the original bytes directly — a 32-byte salt followed by the flag text.

**Flag:** `isfcr{7efa56a2343dbdbdd07d9787adec1d9e9842840b}`

---

## 5. Takeaways
- Fixed, non-randomized error positions across multiple encoded blocks turn an individually hard decoding problem into a shared structural target — recovering the support once effectively solves every block that shares it.
- A Schur-square dimension test on a code's dual is a remarkably cheap, purely linear-algebraic way to detect that a "random-looking" linear code actually has hidden algebraic structure, well before attempting any full structural attack.
- You don't always need to fully reconstruct a code's underlying algebraic-geometric curve to break it — recovering just the error support, through repeated shortening and puncturing on random test windows, can be enough to decode without ever identifying the curve itself.
- "Claimed indistinguishable from random" is a testable assertion, not a given — running the standard structural distinguishers (square codes, dual minimum weight, degree-based ratio checks) against any code-based scheme is worth doing before trusting its stated security properties.
