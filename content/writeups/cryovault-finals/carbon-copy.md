---
title: "Carbon Copy"
date: 2026-10-12T13:30:00+05:30
description: "Symbolically invert an 8x8 byte VM with data-dependent aliasing using Z3, then replay a text CRDT's causal history correctly to derive the second half of a two-part recovery code."
category: "Mobile Security"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{fb02d58b558a0ba32e42eb248b13c7a1}"
author: "Reshma Al (Coldcoffee)"
tools: "jadx, Python 3, Z3"
tags:
  - "Mobile Security"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{fb02d58b558a0ba32e42eb248b13c7a1}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{fb02d58b558a0ba32e42eb248b13c7a1}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Overview
`carbon-copy.apk` is a minimal single-activity app that loads `assets/archive.ccb` and asks for a two-part "recovery code" — 64 hex bytes followed by 32 hex bytes. The archive itself (format `CCB2`) bundles a VM bytecode program, that VM's expected output, an AES-GCM "edit log" blob, and an AES-GCM flag blob. Neither half of the recovery code is stored anywhere in the app; both have to be derived from scratch.

---

## 2. The Unlock Chain
Decompiling with `jadx` shows the logic split across a handful of obfuscated classes. The chain is: the first 64-byte code half must make the VM's output match the expected bytes; a SHA-256 of that code half plus the archive salt decrypts the edit log; the edit log is parsed as a CRDT record stream; a SHA-256 derived from the merged document state gives the second 32-byte code half; and finally, both code halves plus the hash of the decrypted edit log derive the key that opens the flag blob.

---

## 3. Finding the First Half: Symbolically Inverting the VM
The VM operates on an 8×8 byte state, initialized from the 64-byte code candidate, with opcodes scrambled by a salt-derived permutation. Its core primitive is a small modular arithmetic function combining a multiply, a square, and a modular inverse. The tricky part isn't the arithmetic — it's that several opcodes alias or deep-copy entire state rows (hence the challenge's name), and one specific opcode chooses between aliasing and cloning based on a runtime data bit, meaning the VM's *control-flow-adjacent* behavior genuinely depends on the input.

The program splits cleanly into two phases: a 640-instruction "opening block" that only ever does invertible XOR-mix operations on distinct rows (so it can be inverted directly once you know the state right after it), followed by 48 rounds of an output-emitting gadget where every one of its 240 output bytes depends on every single input byte, closing off any shortcut based on dependency analysis.

Rather than trying to invert 48 rounds of full-mixing output by hand, I wrote a symbolic executor using Z3 with 8-bit bitvectors, modeling the data-dependent alias/clone choice as a guarded symbolic selection between two row references rather than picking one concretely. I validated this symbolic model against a plain concrete Python VM implementation first, then constrained all 240 output bytes to match the archive's expected values and left the 64 bytes of state right after the opening block as the unknowns to solve for. Z3 returned a satisfying model in a few minutes; running the (fully invertible) opening block backwards from that model gives the first code half directly, and re-running the concrete VM on it reproduces the expected output exactly.

---

## 4. Finding the Second Half: Replaying a CRDT Correctly
Decrypting the edit log with the first code half reveals 144 records forming a text CRDT, RGA-style: every inserted character becomes a node with an identity and a parent pointer, siblings are ordered and walked depth-first, and deletions are tombstoned rather than removed outright.

Applying the 144 operations in their stored order fails — the document doesn't converge correctly that way. The actual rule a CRDT like this needs is causal: an operation's "causal past" is every other operation whose own position in its author's sequence is less-than-or-equal-to what the current operation's vector clock claims for that author. Processing strictly in Lamport-clock order, and building each operation's view from only its causal past before resolving where it attaches, makes every one of the 144 embedded checksums match — strong confirmation the replay model is correct.

The fully merged text itself is just noise (stray emoji and letters) — it was never meant to be read directly. What the app actually consumes is a hash of the *visible* (non-tombstoned) document state at that point, and that hash is exactly the second half of the recovery code.

---

## 5. Assembling and Verifying
With both code halves recovered, the final key derivation (mixing both halves with the hash of the decrypted edit log) decrypts the flag blob cleanly, with its AES-GCM tag verifying — confirmed by reproducing the app's full logic in Python rather than running the live APK.

**Flag:** `isfcr{fb02d58b558a0ba32e42eb248b13c7a1}`

---

## 6. Takeaways
- A VM whose control flow is mostly input-independent except for one data-dependent branch is exactly the situation where a symbolic executor shines — model only the genuinely data-dependent parts symbolically, and let everything deterministic stay concrete for speed and clarity.
- When part of a program is provably invertible (here, the opening block) and part of it isn't (the 48-round output gadget), solve the hard part with a constraint solver for the state at the boundary, then invert the easy part by hand — no need to brute-force or symbolically model the whole pipeline at once.
- CRDT replay correctness hinges entirely on respecting causal order, not insertion order — a vector-clock-based "causal past" check is what separates a document that converges correctly from one that silently diverges.
- Not every derived value in a multi-stage key schedule needs to be secret on its own — the second code half here is fully determined by data the attacker already has access to (the decrypted edit log); it just requires correctly replaying that data's own internal logic.
