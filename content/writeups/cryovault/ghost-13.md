---
title: "GHOST-13"
date: 2026-10-11T12:00:00+05:30
description: "Reconstructing PLC firmware, DTMF audio tones, and exploiting ECDSA nonce reuse across Modbus telemetry."
category: "IoT"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{ghost13_dc8f84a256fa64108b6c75a151a1474d}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, pycryptodome, ecdsa, Scipy Goertzel FFT"
tags:
  - "IoT"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{ghost13_dc8f84a256fa64108b6c75a151a1474d}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{ghost13_dc8f84a256fa64108b6c75a151a1474d}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Challenge Architecture & Artifact Triage

The challenge environment provided:
1. `firmware.bin`: A raw binary dump of a micro-PLC supervisory controller.
2. `telemetry.pcapng`: Modbus TCP capture between the Human-Machine Interface (HMI) and the controller.
3. `alarm_buzzer.wav`: A short 3-second audio recording from the controller's acoustic test buzzer.

---

## 2. Acoustic Analysis: DTMF Tone Demodulation

Examining `alarm_buzzer.wav` using Audacity and Python's SciPy spectral analysis:
- The audio comprises 8 distinct tone bursts separated by 40ms silence intervals.
- Running a Goertzel algorithm against standard Dual-Tone Multi-Frequency (DTMF) keypad frequencies:
  - Low frequencies: 697 Hz, 770 Hz, 852 Hz, 941 Hz
  - High frequencies: 1209 Hz, 1336 Hz, 1477 Hz, 1633 Hz

```python
import numpy as np
from scipy.io import wavfile

rate, data = wavfile.read('alarm_buzzer.wav')
# Decoded DTMF key sequences: [5, 3, 9, 7, 7, 9, 9, 7]
```

The audio sequence gave the controller maintenance PIN: `53977997`.

---

## 3. Cryptanalysis: ECDSA Nonce Reuse over Modbus

Filtering the network capture for Modbus function code 16 (`Write Multiple Registers`):
- The HMI sends cryptographically signed control directives over curve SECP256k1.
- Two consecutive signed telemetry packets shared the **exact same $r$ coordinate**:
  $$r_1 = r_2 = \text{0x7c9b...}$$

In ECDSA, reusing the ephemeral nonce $k$ across two different messages $m_1$ and $m_2$ allows immediate algebraic recovery of the private signing key $d$:

$$s_1 \equiv k^{-1}(z_1 + r d) \pmod n$$
$$s_2 \equiv k^{-1}(z_2 + r d) \pmod n$$

Subtracting the two equations eliminates the private key $d$:
$$s_1 - s_2 \equiv k^{-1}(z_1 - z_2) \pmod n \implies k \equiv \frac{z_1 - z_2}{s_1 - s_2} \pmod n$$

Once $k$ is computed, the private key $d$ is derived as:
$$d \equiv r^{-1}(s_1 k - z_1) \pmod n$$

---

## 4. Exploit & Recovery Script

```python
#!/usr/bin/env python3
from hashlib import sha256
from ecdsa import SECP256k1
from Crypto.Cipher import AES

n = SECP256k1.order

# Intercepted signatures sharing nonce r
r = 0x7c9b5a12ef84310d7a119cba01239845efca01928475a1029384756102938475
s1 = 0x3a4b...
s2 = 0x8f1c...
z1 = int(sha256(b"CMD_STATUS_POLL_01").hexdigest(), 16)
z2 = int(sha256(b"CMD_OVERRIDE_VALVE_02").hexdigest(), 16)

# Recover ephemeral nonce k
k = ((z1 - z2) * pow(s1 - s2, -1, n)) % n

# Recover private signing key d
d = (pow(r, -1, n) * (s1 * k - z1)) % n
print(f"[+] Recovered ECDSA private key: {hex(d)}")

# Derive master firmware decryption key using KDF(d, PIN)
kdf_seed = d.to_bytes(32, 'big') + b"53977997"
aes_key = sha256(kdf_seed).digest()

# Decrypt encrypted diagnostic config partition
enc_blob = open('config.enc', 'rb').read()
cipher = AES.new(aes_key, AES.MODE_GCM, nonce=enc_blob[:12])
flag = cipher.decrypt_and_verify(enc_blob[12:-16], enc_blob[-16:])
print(f"[+] Flag captured: {flag.decode()}")
```

---

## 5. Key Takeaways
- Embedded firmware must use RFC 6979 deterministic nonce generation to eliminate the risk of random number generator failure and catastrophic ECDSA nonce collisions.

