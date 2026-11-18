---
title: "ARGON: The Silent Vault"
date: 2026-11-01T01:30:00+05:30
description: "Chain an ECDSA nonce-leakage hidden-number problem into a common-modulus RSA cube-root recovery, then stretch the result through Argon2id to open the final vault."
category: "Cryptography"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Hard"
points: 500
flag: "SOS{argon_48cec92a70e93a55b4e232c2b8a733a9}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, fpylll/LLL, ctypes + libargon2, SageMath (sympy integer_nthroot)"
tags:
  - "Cryptography"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>SOS{argon_48cec92a70e93a55b4e232c2b8a733a9}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('SOS{argon_48cec92a70e93a55b4e232c2b8a733a9}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Pieces on the Table
The handout is `challenge.py` (the format spec), `public.json` (curve parameters, the public key `Q`, salts, Argon2 parameters, and a channel map), `signatures.jsonl` (96 ECDSA signatures over secp256k1), `diagnostics.bin` (384 telemetry frames), and two AES-256-GCM blobs, `recovery.enc` and `vault.enc`. Reading the spec lays out the chain before any math starts: an ECDSA nonce leak recovers the private key `d`; `d` decrypts the recovery blob; that blob holds an RSA instance whose plaintext feeds into Argon2id to derive the key for the final vault.

---

## 2. Turning Telemetry Into a Nonce Leak
Each of the 384 telemetry frames is 20 bytes — a 16-byte `sig_id`, a big-endian channel number, and a payload. Only channel `0x0042` matters; it leaks the **top 10 bits** of the ECDSA nonce `k` for the signature with the matching `sig_id`, as `h = k >> 246`.

```python
for i in range(0, len(data), 20):
    sid, ch, payload = struct.unpack(">16sHH", data[i:i+20])
    if ch == 0x0042:
        leaks[sid.hex()] = payload
```

Matching `sig_id` across the 96 signatures gives a partial nonce leak on every single one of them — exactly the setup for a hidden number problem (HNP).

---

## 3. Solving the Hidden Number Problem
With `z = SHA256(msg) mod n`, the ECDSA relation gives `k = (r/s)*d + z/s mod n`. Writing `t_i = r_i/s_i`, `u_i = z_i/s_i`, and `a_i = h_i·2^246 + 2^245` (the leaked high bits, centered), the relation becomes `t_i·d + (u_i - a_i) = e_i mod n` with `|e_i| ≤ 2^245` — small compared to the 256-bit modulus.

That's a textbook HNP instance, solved with an (m+2)-dimensional lattice (m = 96) built so that the row combining `d` with the known `t_i`/`c_i` values is short enough for LLL to find directly:

```python
B = IntegerMatrix(m + 2, m + 2)
for i in range(m):
    B[i, i] = n * n
    B[m, i] = n * t[i]
    B[m + 1, i] = n * c[i]
B[m, m] = K
B[m + 1, m + 1] = n * K
LLL.reduction(B, delta=0.999)
# pick the row with |B[j, m+1]| == n*K, d = (B[j, m] // K) % n, check d*G == Q
```

LLL hands back `d = 0x4793d79ca3bf6a2336b40e62cdff8519384c9bdf2aa4fb4a20c70ae963acd0d1`, and `d*G == Q` confirms it on the first try.

---

## 4. Opening the Recovery Blob
`recovery.enc` follows a `nonce(12) | tag(16) | ciphertext` layout with AAD `ARGON/RECOVERY/v1`. The AES-256-GCM key is `HKDF-SHA256(ikm = d as 32 bytes big-endian, salt = recovery_bundle.wrap_salt, info = "ARGON/RECOVERY/v1")`. Decrypting it yields JSON holding a 2047-bit RSA modulus `N`, two public exponents `e1 = 196611` and `e2 = 300009`, and two ciphertexts, `c1` and `c2` — the same message encrypted twice under a shared modulus.

---

## 5. Common-Modulus RSA With gcd(e1, e2) = 3
Normally a common-modulus attack needs `gcd(e1, e2) = 1`, but here it's 3. Bézout's identity still works for the GCD rather than 1: finding `s, t` with `s·e1 + t·e2 = 3` (here `s = -20737`, `t = 13590`) gives

```
c1^s * c2^t = m^3 mod N
```

Since the underlying message is only 32 bytes, `m^3 < 2^768`, which sits far below the 2047-bit modulus — meaning the residue mod N *is* the true integer cube, not a wrapped-around value. A plain integer cube root recovers `m` without ever factoring `N`:

```python
m3 = (pow(c1, s, N) * pow(c2, t, N)) % N
m, exact = integer_nthroot(m3, 3)
T = m.to_bytes(32, "big")
```

This gives `T = da25997f6e32dc2040c1c848e62829e9605a4226fa46e5814c22c9c704f312ab`.

---

## 6. Argon2id and the Final Vault
Per the challenge's own spec, the Argon2id password is `P = SHA256("ARGON/FINAL/v1" || d.to_bytes(32, "big") || T)`, run through Argon2id with a specific salt, 65536 KiB memory, 3 passes, 4 lanes, and a 32-byte output. I called the system `libargon2` through `ctypes` rather than reimplementing it:

```python
lib = ctypes.CDLL("libargon2.so")
out = ctypes.create_string_buffer(32)
lib.argon2id_hash_raw(3, 65536, 4, P, 32, final_salt, 16, out, 32)
```

`vault.enc` uses the identical `nonce | tag | ciphertext` layout as the recovery blob. Decrypting it with the Argon2id output as the AES-256-GCM key and AAD `ARGON/VAULT/v1` gives the flag.

**Flag:** `SOS{argon_48cec92a70e93a55b4e232c2b8a733a9}`

---

## 7. Takeaways
- Argon2id itself was never the weak point — its parameters are entirely reasonable. The vulnerability is everything *feeding into* the password it stretches: a leaked ECDSA private key and a factored RSA message, both recoverable well before Argon2 ever runs.
- A 10-bit nonce leak per signature is tiny, but across 96 signatures it's more than enough structure for a lattice-based HNP solve — don't dismiss a partial leak as too small to matter.
- `gcd(e1, e2) ≠ 1` doesn't block a common-modulus attack; Bézout's identity just needs to target whatever the GCD actually is, and an unfactored small-GCD residue can still yield an exact integer root when the underlying message is short.
- Multi-stage crypto chains reward working top-down from the challenge's own stated flow rather than trying to attack the final AES-GCM blob directly — each stage's output is exactly the input the next one is waiting for.
