---
title: "Broken Interpreter"
date: 2026-10-12T13:00:00+05:30
description: "Rebuild a permuted CPython opcode table by differential compilation, then discover that the interpreter's own inline bytecode caches are a hidden ingredient in the cipher, invisible to any marshalled copy of the code."
category: "Reverse Engineering"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{0bs3rv1ng_th3_fr4m3_ch4ng3s_th3_s34l_7c2e}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, dis, marshal, objdump"
tags:
  - "Reverse Engineering"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{0bs3rv1ng_th3_fr4m3_ch4ng3s_th3_s34l_7c2e}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{0bs3rv1ng_th3_fr4m3_ch4ng3s_th3_s34l_7c2e}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Target
`vault.pyc` only runs correctly on a bundled, modified CPython 3.12.15 build ("cryopy"). It takes a 48-byte key and prints either `ACCESS GRANTED` or `ACCESS DENIED residue XXXXXXXX`. Running the stock `dis` module against it produces complete garbage — the interpreter uses a shuffled opcode table, so the raw bytecode bytes in the file don't correspond to the opcodes everyone's used to seeing.

---

## 2. Rebuilding the Opcode Map by Differential Compilation
Since `opcode.opmap` inside cryopy's own standard library is unmodified, only the *compiler's* emitted numbers are shuffled. The fix is straightforward: compile the same small test snippets with stock `python3.12` and with `cryopy`, then diff the two bytecode streams to recover the permutation directly, opcode by opcode (`LOAD_FAST`, `STORE_FAST`, `BINARY_OP`, `COMPARE_OP`, jump instructions, and so on). `BINARY_OP`'s own argument byte — which operator it actually performs — turned out to be separately permuted too, so each arithmetic/bitwise operator needed its own differential test.

With the full opcode and operator mapping rebuilt, `vault.pyc` finally disassembles into something readable.

---

## 3. Reading the Cipher, `_v`
The core function treats the 48-byte key as twelve 32-bit words and runs it through a four-round mixing cipher — a key-schedule pass seeded from a constant, followed by four rounds each doing an additive mixing pass, an XOR/shift mixing pass, a multiply-and-fold pass, and a 7-word rotation of the whole state. Every single step here is a standard, invertible operation — **except** for one binary operator used throughout, `@`, which isn't matrix multiplication on these integer operands at all; the interpreter treats it as some kind of hash function instead.

---

## 4. The Hidden Seal: `@` Isn't a Pure Function
This is where the challenge gets genuinely unusual. Testing `@` directly exposed something that shouldn't be possible for a pure binary operator:

- The exact same `a @ b` call produced *different* results depending on which function it ran inside.
- The result changed based on how many other `BINARY_OP` call sites existed anywhere in that function — including sites that never actually execute.
- Making an identical copy of the function (via `code.replace()`, or a `marshal.dumps`/`loads` round-trip) silently changed what `@` returned, even though the bytecode bytes looked the same.

The cause: CPython 3.11+ stores per-call-site **inline caches** — small scratch words sitting right after certain instructions, used by the real interpreter for speculative optimization. The file on disk has *non-zero* cache words planted at specific `BINARY_OP` sites. But `code.co_code` and `marshal.dumps` both zero out inline caches when exposing or serializing a code object — meaning any copy of the function, however faithful it looks, silently loses this planted data. Each non-zero cache word acts as a post-transform on that particular `@` call's result (I recovered seven distinct transforms by experiment — XORs, additions, a multiply, a shift). On `@` sites specifically, the cache word doesn't just post-process the result — it selects which underlying hash gets computed in the first place, and that hash also depends on the cache words of *all 39* `BINARY_OP` sites in the whole code object, in their exact order.

---

## 5. Reproducing the Seal Without a Debugger
Since the real cache bytes only exist in the original marshalled bytes, I read all 39 `(arg, cache)` pairs directly out of the `.pyc` file's raw bytes. To evaluate a single `@` site correctly, I built a synthetic function containing exactly 39 `BINARY_OP` sites, patched each site's cache and argument bytes to match the real file precisely, and loaded that — with only one of those 39 sites actually being the operation under test and the rest sitting there as structurally necessary but otherwise dead code, purely to reproduce the seal's dependency on site count and order.

With that oracle in hand, I wrote the forward cipher in plain Python, with every post-transform applied exactly as observed, and checked it two ways: the key schedule matched a version obtained by patching the `.pyc` to simply return its intermediate state directly, and the full forward cipher matched `_v`'s real output on random inputs.

---

## 6. Inverting the Chain
Every stage of the cipher inverts in a mechanical, well-defined order, since the `@` terms at each step only ever depend on values already known by the time you need them going backwards:

- Undo the final multiply-and-fold step by iterating the fold three times, subtracting its additive constant, then multiplying by the modular inverse of the (odd) multiplier.
- Undo the XOR/shift mixing pass by walking the index upward, since each step's mixing input is just the *next* index's already-recovered output.
- Undo the additive mixing pass by walking the index downward and subtracting.
- Undo the 7-word rotation by rotating the state back the other way.

Applying this whole inverse chain to the stored target tuple directly recovers the 48 key bytes.

**Flag:** `isfcr{0bs3rv1ng_th3_fr4m3_ch4ng3s_th3_s34l_7c2e}`, confirmed by running `./cryopy/bin/python3 vault.pyc '<flag>'` and getting `ACCESS GRANTED`.

---

## 7. Takeaways
- Modern CPython's inline bytecode caches are a genuinely under-appreciated attack surface for anti-tamper tricks: they're real, persistent data sitting in the `.pyc` file that disappears the instant you inspect or copy the code object through any normal Python-level API.
- A custom interpreter with a shuffled opcode table isn't defeated by reading documentation — differential compilation (comparing stock output against the modified interpreter's output for the same source) rebuilds the mapping mechanically and reliably.
- When a supposedly pure function's output depends on things that shouldn't matter — unrelated dead code, or how many times you've copied the function — that's a strong signal something outside the visible operand values is being consulted, and inline caches are exactly that kind of invisible side channel in recent CPython versions.
- A cipher built entirely from invertible primitives (add, XOR, rotate, a fixed multiplier) can always be run backwards once every step's hidden dependency is correctly modeled — the actual reverse-engineering difficulty here was entirely in faithfully reproducing `@`, not in the arithmetic itself.
