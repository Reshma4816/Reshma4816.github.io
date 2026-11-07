---
title: "neve"
date: 2026-11-02T11:00:00+05:30
description: "Adaptive statistical hypothesis testing and Markov chain calibration to extract a 512-grade firmware table and decrypt an HKDF recovery bundle."
category: "Cryptography"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{neve_e60e_jacket_67de9384_loop}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, pycryptodome (AES-GCM), custom WebSocket client"
tags:
  - "Cryptography"
  - "ISFCR CryoVault"
  - "CryoVault 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{neve_e60e_jacket_67de9384_loop}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{neve_e60e_jacket_67de9384_loop}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Protocol Architecture & Challenge Overview

The **neve** challenge presents a real-time hardware calibration service communicating over WebSockets (`wss://neve.isfcr.xyz`).
The system models an industrial field transceiver holding a secret calibration table $M$ of size $32 \times 16$ entries, where each entry is an integer grade $g \in \{0, 1, \dots, 7\}$ (512 grades total).

The WebSocket API supports four primitives:
- `OPEN`: Initializes a session, returning an `instance_id`, `session_token`, current active row, and a budget of operations.
- `SOUND`: Sends an array of input symbols and receives 1 bit per symbol reflecting the transceiver's output state. Each probe consumes budget.
- `CHECKPOINT`: Submits candidate 16-grade values for the current row. A correct submission advances to the next row; an incorrect submission levies a harsh 4096 budget penalty.
- `BUNDLE`: Delivers the encrypted 16-byte nonce, ciphertext, and 16-byte tag containing the final flag.

---

## 2. Statistical Analysis & Response Modeling

Inspecting the response distribution of `SOUND` calls proved that the output bit probability does not depend solely on the current input symbol, but is conditioned on the previous state via a **higher-order Markov process**:
$$P(\text{bit} = 1 \mid s_t, s_{t-1}, g)$$

Because the 4096-penalty strictly prohibits brute-forcing rows:
1. We synthesized specific repetitive probe sequences (e.g. $[0, 4, 0, 4, \dots]$ and $[1, 5, 2, 6, \dots]$) to induce stationary distributions that maximize the separation between adjacent grades.
2. For each cell in row $r$, we recorded empirical frequencies $\hat{p}$ across 120 samples.
3. We mapped candidate grades by maximum likelihood estimation (MLE).
4. Only candidate rows with $> 99.8\%$ statistical confidence were submitted to `CHECKPOINT`.

---

## 3. Cryptographic Key Derivation & Unsealing

After completing all 32 rows, the 512 recovered numeric grades were serialized row-major as 512 raw bytes (each byte $\in 0 \dots 7$).
Per the hardware specification, the cryptographic key schedule is defined as:

```python
import hashlib, hmac
from Crypto.Cipher import AES

ikm = bytes(int(g) for row in table for g in row)  # 512 raw bytes
salt = bytes.fromhex(session_token)
info = b"NV4 recovery bundle"

# HKDF-Extract
prk = hmac.new(salt, ikm, hashlib.sha256).digest()

# HKDF-Expand
key = hmac.new(prk, info + b"", hashlib.sha256).digest()[:32]

# AES-256-GCM Unseal
# Associated Data: instance_id || session_token
cipher = AES.new(key, AES.MODE_GCM, nonce=bundle[:12])
cipher.update(f"{instance_id}{session_token}".encode())
flag = cipher.decrypt_and_verify(bundle[12:-16], bundle[-16:])
print("Flag:", flag.decode())
```

The GCM authentication tag verified cleanly, yielding the flag:
`isfcr{neve_e60e_jacket_67de9384_loop}`

