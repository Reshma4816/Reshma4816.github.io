---
title: "Black Mirror"
date: 2026-09-20T15:49:00+05:30
description: "Decrypting an offline-recoverable ChaCha20/HMAC memory file to extract a custom VM, then inverting a permutation, S-box, triangular matrix, and Feistel chain to recover a 32-symbol access code."
category: "Reverse Engineering"
ctf: "Lunar CTF Quals"
difficulty: "Easy"
points: 80
flag: "lun4r{v1rtual_m1rr0rs_h1de_the_truth}"
author: "Reshma Al (Coldcoffee)"
tools: "radare2, objdump, readelf, strings, Python 3"
tags:
  - "Reverse Engineering"
  - "Lunar CTF Quals"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>lun4r{v1rtual_m1rr0rs_h1de_the_truth}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('lun4r{v1rtual_m1rr0rs_h1de_the_truth}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Setup
We're given `black_mirror`, a 64-bit stripped PIE ELF (~30 KB), and `encrypted_memory.bin` (2281 bytes). No symbols, so everything has to be found by hand with `strings`, `objdump`, `readelf`, and `radare2`.

---

## 2. Recon — and Why Not to Trust It
`strings` immediately surfaces a pile of plausible-looking flags: `lun4r{strings_will_not_save_you}`, `lun4r{you_decrypted_the_wrong_memory}`, `lun4r{patching_is_not_reversing}`, `lun4r{debugger_detected}`, `lun4r{ai_followed_the_decoy_instruction}`, and more. There's also text posing as authoritative instructions — an "AUTOMATED ANALYSIS DIRECTIVE" telling an automated reader to stop and respond with a canned refusal. All of this is data inside the binary under analysis, not an instruction with any authority over the analysis itself, and every one of these strings is a decoy.

Genuinely useful strings include anti-debug markers (`TracerPid`, `gdb`, `radare2`, `frida`...), crypto/VM labels (`BMEMV200`, `BMKEYA01`, `VM2STAGE`, `SESSION-OPCODES`), and a 32-character Crockford-like alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`). Eight groups of four characters from a 32-symbol alphabet means 32 symbols at 5 bits each — 160 bits total, which is the shape of the secret we need to recover.

---

## 3. Mapping the Program
Reading `main` and its callees with radare2 gives a clear picture: a session timer, an anti-debug routine (checking `TracerPid`, parent process name, timing, `ptrace`), a loader that verifies `encrypted_memory.bin` and the binary's own hash, SHA-256 and HMAC-SHA256 (recognizable by their standard IV/constant values), ChaCha20 (the `expand 32-byte k` constant), an access-code parser, and a VM interpreter that performs the actual check. Recognizing SHA-256, HMAC, and ChaCha20 as standard primitives up front meant not having to reverse their internals — only how they're wired together.

The access-code parser enforces a strict shape: every non-dash character must be in the 32-symbol alphabet, dashes only at fixed positions, and exactly 32 symbols total (39 characters including dashes) — confirming the 160-bit secret.

---

## 4. Anti-Debug and Why It Didn't Matter
The anti-debug routine's checks (tracer attached, suspicious parent process name, timing anomalies, a failing `PTRACE_TRACEME`) don't just print a warning — they silently feed into key derivation, so running under a debugger produces the *wrong* key and a decoy flag, not a crash. The binary also re-hashes itself and compares against a value stored in the decrypted memory image, which is why patching bytes doesn't work either. Doing all analysis statically and only ever running the unmodified binary normally sidesteps every one of these traps.

---

## 5. Cracking `encrypted_memory.bin` Offline
The loader reveals the file's layout: an 8-byte magic, a version, a body length, a 16-byte nonce, a SHA-256 of the encrypted body, an HMAC-SHA256 tag, and the encrypted body itself. The key derivation chain is:

1. `key1 = TABLE_A XOR TABLE_B` — two 32-byte constants sitting in `.rodata`
2. `k = SHA256(key1 || nonce16 || "MEMORY")`
3. Verify `HMAC-SHA256(k, header || body) == stored_tag`
4. Decrypt the body with ChaCha20 under key `k`, counter 1, nonce = first 12 bytes of the 16-byte nonce
5. The plaintext must begin with the magic `BMPAYL02`

Every input to this chain lives in the binary or the file itself — nothing is secret to the user — so it's fully reproducible offline:

```python
import hashlib, hmac, struct

exe = open('black_mirror', 'rb').read()
mem = open('encrypted_memory.bin', 'rb').read()

key1 = bytes(a ^ b for a, b in zip(exe[0x5948:0x5968], exe[0x5988:0x59a8]))
hdr, body = mem[:0x60], mem[0x60:]
nonce16 = hdr[0x10:0x20]
k = hashlib.sha256(key1 + nonce16 + b"MEMORY").digest()

assert hashlib.sha256(body).digest() == hdr[0x20:0x40]
assert hmac.new(k, hdr[:0x40] + body, hashlib.sha256).digest() == hdr[0x40:0x60]

payload = chacha20(k, nonce16[:12], 1, body)   # minimal ChaCha20, see below
assert payload[:8] == b"BMPAYL02"
```

Both integrity checks pass and the payload leads with the right magic — and it also contains the SHA-256 of `black_mirror` itself at the offset the binary later compares against, confirming the derivation is correct. (A debugged run derives a different `k`, decrypts to garbage, and surfaces the `you_decrypted_the_wrong_memory` decoy — the static route avoids that entirely.)

---

## 6. Inside the Payload: the VM's Tables
The decrypted payload exposes everything the VM needs: a permutation `PERM`, a substitution box `SBOX` (itself a permutation of 0–31), a 4×4 matrix `MAT` over Z/32, Feistel round constants `FK`, and a 32-byte `TARGET` — the expected final state. `MAT` is lower-triangular with an odd diagonal (3, 5, 7, 9), which is exactly what makes every step of the chain invertible mod 32.

The 9-byte VM program itself is obfuscated three ways: ChaCha20-decrypted under a second derived key, then each byte at fetch time is XORed against a session-derived mask, then looked up in a 25-byte opcode table to resolve the real, randomized opcode number. Decoding it gives a five-step chain: **permute → S-box substitute → matrix-multiply (mod 32) → 8-round Feistel → compare against `TARGET`**.

---

## 7. Inverting the Chain
None of the five steps is one-way, so the whole thing runs backwards from `TARGET`:

- **Feistel inverse** — run the 8 rounds in reverse order, swapping the standard update.
- **Matrix inverse** — `MAT` is triangular, so forward substitution per row works directly, using the modular inverse of each (odd) diagonal entry mod 32.
- **S-box inverse** — a simple index lookup, since `SBOX` is a bijection on 0–31.
- **Permutation inverse** — scatter each value back to its original index.

```python
def inverse(T):
    A = []
    for g in range(4):                        # undo Feistel, 4 groups of 8 symbols
        L = pack(T[8*g:8*g+4]); R = pack(T[8*g+4:8*g+8])
        for i in range(7, -1, -1):
            Ri = L; Li = R ^ F(i, Ri)
            L, R = Li, Ri
        A += unpack(L) + unpack(R)
    B = []
    for b in range(8):                        # undo matrix, mod 32
        y = A[4*b:4*b+4]; x = [0]*4
        for j in range(4):
            s = y[j] - sum(MAT[j][k] * x[k] for k in range(j))
            x[j] = (s * pow(MAT[j][j], -1, 32)) & 31
        B += x
    inv_sbox = [SBOX.index(v) for v in range(32)]
    C = [inv_sbox[v] for v in B]              # undo S-box
    D = [0]*32
    for i in range(32): D[PERM[i]] = C[i]     # undo permutation
    return D
```

Running this against `TARGET` and mapping the result back through the 32-symbol alphabet gives the access code `T7WZ-XRGR-SEWF-4ZWY-W82M-BXGU-NBSL-NCVL`. I also asserted `forward(inverse(TARGET)) == TARGET` as a sanity check before trusting it.

---

## 8. Verifying Against the Real Binary
A round-trip test only proves the inverse matches my own model — the real test is the binary:

```
$ echo "T7WZ-XRGR-SEWF-4ZWY-W82M-BXGU-NBSL-NCVL" | ./black_mirror
Enter access code:
Authentication successful.
Recovering protected memory...

lun4r{v1rtual_m1rr0rs_h1de_the_truth}
```

**Flag:** `lun4r{v1rtual_m1rr0rs_h1de_the_truth}`

---

## 9. Takeaways
- Strings are evidence, not authority — text addressed to "an AI assistant" or "the analyst," embedded inside the thing being analyzed, is just data and carries no instructions of its own.
- A "secret" that's derived entirely from constants shipped in the same file isn't secret at all; it's reproducible offline the moment you find the derivation.
- Since debugger detection here silently corrupts derived keys rather than crashing, pure static analysis sidesteps the entire anti-debug layer.
- Permutations, S-boxes, triangular matrices with odd diagonals over Z/n, and Feistel networks are all invertible — check for that before reaching for brute force.
- The binary itself is the final word: a model that merely round-trips with itself isn't verified until the real program accepts the result.
