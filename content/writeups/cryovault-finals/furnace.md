---
title: "Furnace"
date: 2026-10-12T17:30:00+05:30
description: "No shortcut, no vulnerability — three independent PBKDF2 secrets at deliberately mismatched iteration counts, brute-forced to completion on a single GPU to show exactly how iteration count trades off against cracking time."
category: "Cryptography"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Medium"
points: 250
flag: "isfcr{9cad8771_d5d34a61_b5e5db6d}"
author: "Reshma Al (Coldcoffee)"
tools: "hashcat (mode 10900), Python 3"
tags:
  - "Cryptography"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{9cad8771_d5d34a61_b5e5db6d}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{9cad8771_d5d34a61_b5e5db6d}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. No Puzzle Here, Just Honest Brute Force
Furnace is refreshing in that it doesn't hide anything: a `README.txt` included with the files states outright that there's no trick to find, and reading the provided `unlock.py` confirms it. Three independent 32-bit secrets (8 hex characters each) each protect one third of the flag, each salted with its own PBKDF2-HMAC-SHA256 derivation at a different iteration count — 30, 60, and 480 — and the only way through is exhausting each secret's full keyspace.

---

## 2. Reading the Scheme
`unlock.py` splits each PBKDF2 output into two halves: one half becomes an AES-style encryption key for an 8-byte stream cipher (built from repeated SHA-256 calls keyed by a counter), and the other half becomes a separate HMAC key used to authenticate the ciphertext. A wrong secret produces a MAC that fails a constant-time comparison and the function simply returns nothing — no partial credit, no timing leak, just full verification or complete failure. The vault files' own salts and the ones referenced in the accompanying hash files are deliberately different, confirming the two derivations really are independent of each other.

---

## 3. Cracking Each Part
Since each secret is exactly 8 lowercase hex characters, that's a 32-bit keyspace per part — about 4.3 billion candidates — small enough for a direct mask-based GPU brute force with `hashcat`'s generic salted-SHA256-with-iteration-count mode. Each of the three hash files is a fully separate, independent search, so I ran the lowest-iteration-count part first to get a quick win and build confidence in the approach before committing to the much more expensive 480-iteration part.

All three secrets recovered within minutes to roughly half an hour each, with cracking time scaling almost perfectly in proportion to each part's iteration count — exactly what you'd expect from a purely compute-bound key-stretching function with no memory-hardness component at all.

---

## 4. Assembling and Verifying
Feeding all three recovered secrets into the provided `unlock.py` reproduces all three flag parts, which concatenate directly into the final flag.

**Flag:** `isfcr{9cad8771_d5d34a61_b5e5db6d}`

---

## 5. Takeaways
- PBKDF2-HMAC-SHA256 is a compute-bound, ALU-heavy operation, not a memory-bandwidth-bound one — unlike memory-hard functions such as Argon2 or scrypt, extra GPU memory doesn't meaningfully speed up cracking it; raw compute throughput is the only lever that matters.
- Iteration count is a direct, linear multiplier on cracking cost, and this challenge demonstrates that relationship almost perfectly: a 16× increase in iteration count between the cheapest and most expensive part produced roughly the expected proportional increase in wall-clock cracking time.
- Independent secrets with independent, unique salts mean there's no shortcut from solving one part to solving another — each one genuinely has to be brute-forced on its own, with no information to carry over.
- Not every challenge hides a clever vulnerability; sometimes a system is exactly as strong as its stated parameters suggest, and the "attack" is simply applying enough raw compute within the time available. Recognizing that early (rather than hunting for a nonexistent shortcut) saves real time.
