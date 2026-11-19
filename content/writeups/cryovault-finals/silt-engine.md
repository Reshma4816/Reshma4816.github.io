---
title: "Silt Engine"
date: 2026-10-12T12:30:00+05:30
description: "Route around a self-decrypting VM's anti-debug and anti-tamper checks entirely offline, then invert a Montgomery modular exponentiation and six mixing rounds to recover the single valid key."
category: "Reverse Engineering"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{43c22cf28e6a9e7934f27c676f0658ae}"
author: "Reshma Al (Coldcoffee)"
tools: "objdump, Python 3, strings"
tags:
  - "Reverse Engineering"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{43c22cf28e6a9e7934f27c676f0658ae}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{43c22cf28e6a9e7934f27c676f0658ae}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. First Look
`silt` is a stripped x86-64 PIE that takes a 39-character flag and treats the 32 characters inside `isfcr{...}` as a 256-bit key. `strings` turns up almost nothing — just a handful of status messages in `.rodata`, with everything else obfuscated. The import list is suspiciously thin (`strlen`, `strstr`, `memcmp`, `memcpy`, and a few others), which means file I/O and anything debugger-related is done through raw syscalls instead of libc wrappers — a strong early signal that this binary actively watches for being observed.

The section table has one non-standard section, `silt_k`, holding every function except `_start`. That section turns out to matter a lot later — it isn't just "the code," it's also an input to the binary's own integrity check.

---

## 2. Tracing `main`
Reading `main` top to bottom lays out the whole flow: validate the flag's shape (length, wrapper, printable characters), hash the `silt_k` section itself, run an anti-debug check that returns a bitmask, read a companion file `core.bin`, pick one of two encrypted sections inside it based on that bitmask, derive a key and decrypt/decompress the chosen section into a VM program image, copy the 32 key characters into VM memory, run the VM, and compare its output words against a stored target.

So `core.bin` holds the actual program, and `silt` is just the loader and interpreter around it.

---

## 3. The Anti-Debug and Anti-Tamper Layer
A tiny XOR-obfuscated string table decodes to reveal three checks: a `personality()` syscall probing the ASLR-disable flag that `gdb` sets, a read of `/proc/self/status` checking for a nonzero `TracerPid`, and an environment scan for `LD_PRELOAD`/`LD_AUDIT`. None of these checks abort the program outright — they just flip a bit that selects which of two images inside `core.bin` gets decrypted. Running clean selects the real program; running under a debugger selects a decoy that's equally well-formed and equally capable of decrypting successfully, but leads nowhere useful.

On top of that, the loader computes a hash of its own `silt_k` code section and feeds that hash directly into the decryption key for whichever image gets chosen. A software breakpoint, or patching out the anti-debug check itself, changes that hash and corrupts the derived key — so even "beating" the anti-debug logic by patching it breaks the very thing you're trying to reach.

Both of these mechanisms only matter if you actually run the binary. Since all they do is select and decrypt a deterministic function of bytes already sitting on disk, I never launched it under a debugger at all — I re-implemented the loader's logic in plain Python, read the clean-path hash directly from the ELF on disk, and reproduced the decryption offline.

---

## 4. Re-Implementing the Primitives
Every low-level routine got read out of the disassembly and reproduced in Python, cross-checked against a built-in oracle: the loader stores a hash of each image's *decompressed* contents, so if the hash function, key schedule, stream cipher, and decompressor are all implemented correctly, that stored hash matches on the very first attempt. That gave me a way to verify each piece in isolation before trusting any of them.

- **`silt_k`** — a byte-wise FNV-style mixer combined with a golden-ratio Weyl sequence and sixteen finalization rounds, producing a 128-bit hash.
- **`mix`** — an 8-word ARX (add/rotate/XOR) permutation used as the core of both the key schedule and the stream cipher.
- **`derive`** — folds the kernel hash, a per-file nonce, and a selector index into an 8-word state, then runs `mix` for 24 rounds to produce a key.
- **`stream`** — a keystream cipher operating in 32-byte blocks, mixing in a block counter and a running Weyl accumulator before XOR-ing the derived state against the data.
- **`decompress`** — a small LZ77 variant: literal runs that are additionally XOR-masked by their output position, and back-reference matches encoded as a length/distance pair.

With these five functions reproduced, decrypting and decompressing the clean-path section and checking its hash against the one stored in `core.bin`'s header confirmed every piece was correct in one shot.

---

## 5. Inside the VM: A Self-Decrypting Chain of Blocks
The decompressed image is a program for a small custom VM — 16 registers, 2048 words of memory (with the key copied into the first 8), and a per-block opcode substitution table. Only the first block ships as plaintext; every other block is encrypted and locked until a dedicated `UNLOCK` instruction decrypts it, using a key derived from a hash of the *unlocking* block's own code plus a freshly-built, newly-seeded substitution box. That chains the blocks together — block 0 unlocks block 1, which unlocks block 2, and so on — so nothing downstream can be reached without decrypting everything that came before it in order.

I wrote a small Python emulator of this VM, including the lazy per-block unlocking, purely to read out each block's logic as clean disassembly — not because running it was ever necessary for the actual solve.

---

## 6. What the Six Blocks Actually Compute
Reading through the decrypted blocks, the whole program resolves to surprisingly clean, recognizable number theory:

1. **XOR with a constant** — `X = key ^ C0`.
2. **Montgomery multiplication (CIOS method)** on 8×32-bit limbs — the `MUL`/`MULHU`/`SLTU`-with-carries pattern is the unmistakable signature of multi-precision arithmetic, and the stored constants (`N`, a Montgomery `N0'`, and `R² mod N`) confirmed it directly.
3. **Sliding-window modular exponentiation** — a precomputed table of odd powers of `X`, combined with a square-and-multiply op list stored in memory, computing `Y = X^e mod N`.
4. **Six mixing rounds** — each round rotates every word by a stored shift and XORs it against a stored constant, then does a sequential ripple-add across all eight words, then folds the last word back into the first.

The entire check boils down to: `w = mix6((key ^ C0)^e mod N)`, compared against a stored target.

---

## 7. Why It's Invertible
Every single stage here is a bijection:

- The six mixing rounds undo cleanly in reverse — each round's ripple-add undoes with a top-down subtraction pass, and each rotate-XOR undoes with the matching rotate-and-XOR in the opposite direction.
- The modular exponentiation inverts because `N` is **prime** and `gcd(e, N-1) = 1` — which makes `x → x^e mod N` a genuine bijection on the whole field, invertible by exponentiating with `d = e⁻¹ mod (N-1)`.

That second fact is also exactly what the challenge's own flavor text is pointing at — *"it only ever said yes to one of them"* describes a bijective check with exactly one valid pre-image, not a brute-forceable one.

```python
# undo the 6 mixing rounds
w = list(TARGET)
for r in range(5, -1, -1):
    w[0] ^= w[7]
    for j in range(7, 0, -1): w[j] = (w[j] - w[j-1]) & M
    for j in range(8): w[j] = ror(w[j], S[8*r+j]) ^ A[8*r+j]
Y = sum(w[j] << (32*j) for j in range(8))

# undo the modular exponentiation
X = pow(Y, pow(e, -1, N - 1), N)
key = bytes(((X >> (32*j)) & M) ^ C0[j] for j in range(8))   # packed little-endian
```

The recovered key comes out as 32 clean, printable lowercase hex characters — itself a strong signal the inversion is correct, since a wrong key recovery would produce effectively random bytes that wouldn't even pass the binary's own printable-character check.

**Flag:** `isfcr{43c22cf28e6a9e7934f27c676f0658ae}`, confirmed directly against the real binary (`./silt 'isfcr{...}'` → `ACCESS GRANTED`).

---

## 8. Takeaways
- Anti-debug and anti-tamper logic is worth routing *around* rather than fighting head-on: here, every check only ever decided which deterministic function of on-disk bytes got decrypted, so reimplementing the loader offline sidestepped the entire mechanism without needing to defeat it directly.
- A stored hash of expected output is a free, powerful oracle during reverse engineering — matching it confirms every upstream primitive (hash, key schedule, cipher, decompressor) is correct simultaneously, well before the real logic even needs to be read.
- Recognizable mathematical fingerprints save enormous time: a multiply-by-reciprocal trick replacing a modulus, the SHA-2 and golden-ratio constants, and the unmistakable `MUL`/`MULHU`/`SLTU`-with-carry pattern of big-number arithmetic all turned an intimidating custom VM into a straightforward number-theory problem once spotted.
- Before assuming a cryptographic-looking check needs to be brute-forced, check whether its underlying group structure makes it invertible outright — a prime modulus with an exponent coprime to its order turns "search for the key" into "compute the one key directly."
