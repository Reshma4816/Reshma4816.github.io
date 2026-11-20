---
title: "Decryption Paradox"
date: 2026-10-12T16:30:00+05:30
description: "Engineer a Kyber decryption oracle's output bits to be mostly predictable so a hash-only reply becomes brute-forceable, then budget a one-shot 44-query limit against GPU thermal throttling to recover an exact 768-byte secret key."
category: "Cryptography"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{2fffaec4f20f242912460fb98f2bae3eb660f1f6}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, PyOpenCL (custom SHA-256 kernel), NTT/polynomial arithmetic, HKDF, AES-256-GCM"
tags:
  - "Cryptography"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{2fffaec4f20f242912460fb98f2bae3eb660f1f6}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{2fffaec4f20f242912460fb98f2bae3eb660f1f6}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Target and the Win Condition
The service runs the raw IND-CPA encryption core of Kyber-512, with none of the usual Fujisaki-Okamoto hardening or ciphertext validation applied. Each connection spins up a fresh keypair and grants exactly 44 decryption queries (malformed requests still count against the budget); for each submitted ciphertext, the server replies only with the **SHA-256 hash** of the decrypted 256-bit message, never the plaintext itself. After the query budget runs out, it hands over the flag encrypted under a key derived from the server's exact 768-byte secret key. The goal isn't to decrypt any one message — it's to recover the secret key **exactly**, since even a single wrong coefficient fails the final authenticated decryption.

---

## 2. Where the Side Channel Comes From
Kyber's raw decryption subtracts a secret-dependent term from the ciphertext's `v` component, then rounds each of 256 resulting coefficients to the nearer of two values to produce one output bit per coefficient. Two facts make this directly exploitable when you can hand-craft raw ciphertext bytes rather than using the real encryption routine: placing a single nonzero coefficient at position zero of the ciphertext's `u` polynomial turns the usual convolution into a **one-to-one probe** — each of the 256 output bits ends up depending on exactly one corresponding secret coefficient. And separately, the `v` component is coarsely quantized, but since it's hand-crafted rather than genuinely encrypted, each coefficient's quantization level can be freely chosen — meaning each output bit's rounding threshold can be dialed to land anywhere you want relative to the secret value sitting underneath it.

Combining both control knobs: for a given secret coefficient (bounded to a small range), the chosen bias can either park the resulting bit deep inside a region where it's **provably constant no matter what the secret value actually is** ("dead"), or exactly on a threshold where it **flips depending on which side of a chosen split the secret falls** ("live"). The exact safe parameter window for this — where both "dead" bits stay truly constant and "live" bits reliably discriminate — was found by a direct, exhaustive search over the available quantization codes rather than derived by hand, since the whole thing is exact integer arithmetic.

A separate ciphertext-hardening mask the challenge adds on top turned out to be a complete non-issue: it's derived entirely from ciphertext bytes the attacker themselves chooses, so it's trivially recomputed and canceled out — it adds zero real protection.

---

## 3. The Actual Paradox: A Hash Hides Individual Bits
Here's the twist the challenge name points at directly: a single cleverly-placed query leaks information about *all 256 coefficients at once* — but the reply is a single SHA-256 hash of the *combined* 256-bit message, and a cryptographic hash can't be decomposed to read individual input bits back out. You can only guess a candidate message wholesale and check whether it hashes to the server's reply.

This is exactly why the dead/live construction matters so much: dead bits are already known in advance with zero remaining uncertainty, so they contribute nothing to the guessing space. Only the live bits are genuinely unknown, which shrinks the brute-force space from an impossible 2²⁵⁶ down to a very tractable 2^L, where L is just the number of live bits chosen for that particular query. Cracking each query's digest then becomes a straightforward GPU brute-force search — I wrote a custom OpenCL SHA-256 kernel specialized for this exact fixed-size, single-block input shape, running at several hundred million hashes per second on a laptop GPU.

---

## 4. Budgeting the Real Constraint
The part that actually decides whether this attack fits inside 44 queries isn't the number of queries — it's GPU time, and getting that balance right took a few wrong turns along the way. The secret's coefficients aren't uniformly distributed; they follow a centered binomial distribution, meaning some values are far more likely than others. Splitting each coefficient's remaining range by raw candidate *count* ignores that skew and wastes questions; splitting by probability *mass* instead (an alphabetic, Huffman-style tree) measurably reduces the average number of questions needed per coefficient.

Separately, since total GPU work scales as (work remaining ÷ query width) × 2^(query width), that exponential term dominates completely — a wider-but-fewer-queries search sounded efficient in terms of query count, but was dramatically, unnecessarily more expensive in raw compute than a narrower search using a few more queries; a laptop GPU under sustained load also thermally throttles in ways a short benchmark never reveals, so keeping each individual search burst short matters as much as the total query count. Finally, a naive scheduling approach that just filled each query with whatever bits happened to be pending overran the hard query budget on worst-case keys; the fix was prioritizing the hardest, most-undetermined coefficients first in each query, so no long "thin tail" of nearly-exhausted queries ever forms near the end.

---

## 5. One Last Gotcha: the Key Isn't Stored the Way You'd Expect
Recovering all 512 small secret coefficients doesn't immediately give you the server's actual stored secret-key bytes — Kyber's key generation transforms the secret into "NTT domain" (where every coefficient looks like a large, uniform-looking value rather than a small one) **before** serializing it, specifically because that's the representation the rest of the scheme's math actually uses. The fix is simply pushing the recovered small-coefficient secret through the same forward transform the reference implementation itself uses before serializing, which reproduces the server's exact byte-for-byte secret key.

---

## 6. Result
Running the full attack against the live service recovered the key and opened the flag inside the query budget, with the AES-GCM tag verifying — the strongest possible confirmation that every recovered coefficient, the NTT transform, and the final key derivation were all exactly correct.

**Flag:** `isfcr{2fffaec4f20f242912460fb98f2bae3eb660f1f6}`

---

## 7. Takeaways
- A hash-only oracle hides information only if the thing being hashed is genuinely unpredictable — deliberately engineering most of a hashed value's bits to be provably constant collapses an astronomically large guessing space down to something a GPU chews through in minutes.
- "Hardening" that's derived purely from attacker-chosen inputs provides no real protection; if you control every byte that feeds a supposed safeguard, you can always recompute and cancel it.
- When a resource budget has two different costs attached to it (query count and compute time, here), identify which one is actually binding before optimizing — minimizing the wrong variable can make a solution dramatically, needlessly more expensive.
- A theoretical secret-recovery attack isn't actually finished until you've accounted for every detail of how the target serializes its real secret state — a transform applied just before storage (like Kyber's NTT domain) can silently sit between "the math works" and "the bytes match."
- Dry-running an attack's full schedule against a mock oracle before spending a hard, one-shot resource (here, live query budget) is what catches scheduling bugs — like a worst-case budget overrun — before they cost you an actual attempt.
