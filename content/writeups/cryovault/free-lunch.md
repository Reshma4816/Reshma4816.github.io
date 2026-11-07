---
title: "free-lunch"
date: 2026-10-11T12:00:00+05:30
description: "Inverting high-degree permutation rounds via backward recurrence and polynomial roots in GF(p)."
category: "Cryptography"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{b4ckw4rds_1s_h4lf_th3_d3gr33}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, SageMath, python-flint"
tags:
  - "Cryptography"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{b4ckw4rds_1s_h4lf_th3_d3gr33}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{b4ckw4rds_1s_h4lf_th3_d3gr33}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Challenge Overview & Architecture

The **free-lunch** cryptographic challenge models a custom sponge-like permutation function designed to evaluate a non-linear state transformation over a large prime field $\mathbb{F}_p$ ($p = 2^{255} - 19$).

The state consists of two field elements $(x_0, y_0)$. A 16-round transformation updates the state via:

$$x_{r+1} = y_r \oplus H(x_r), \quad y_{r+1} = x_r^d + c_r \pmod p$$

with non-linear degree exponent $d = 5$. At the end of 16 rounds, the output $(x_{16}, y_{16})$ is published alongside an AES-CBC encrypted ciphertext containing the flag. The key is derived as $\text{SHA256}(x_0 \parallel y_0)$.

---

## 2. Vulnerability Discovery: Reversible State Inversion

While the forward direction executes high-degree power maps $x_r^d \pmod p$, the backward transition is mathematically unhindered because:
1. $d = 5$ is coprime to $p - 1 = 2^{255} - 20$, meaning the power map $x \mapsto x^5$ is a **permutation polynomial** over $\mathbb{F}_p$.
2. The decryption exponent is simply the modular inverse:

$$d^{-1} \equiv 5^{-1} \pmod{p - 1}$$

Computing $d^{-1} \pmod{p - 1}$:

```python
inv_d = pow(5, -1, p - 1)
```

By inverting the round step:
$$x_r = (y_{r+1} - c_r)^{d^{-1}} \pmod p$$
$$y_r = x_{r+1} \oplus H(x_r)$$

We can step the entire state machine **backwards** from round 16 down to round 0 in deterministic polynomial time without needing any algebraic Gröbner bases or root-finding algorithms!

---

## 3. Exploit Implementation & Script

```python
#!/usr/bin/env python3
import json
from hashlib import sha256
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

def solve():
    with open('challenge_data.json', 'r') as f:
        data = json.load(f)

    p = (1 << 255) - 19
    inv_d = pow(5, -1, p - 1)
    round_constants = data['constants']
    
    # Final state values
    x = data['final_x']
    y = data['final_y']

    # Step backwards from round 15 down to 0
    for r in range(15, -1, -1):
        c_r = round_constants[r]
        prev_x = pow((y - c_r) % p, inv_d, p)
        # H is the round round-function sponge
        h_val = int(sha256(str(prev_x).encode()).hexdigest(), 16) % p
        prev_y = x ^ h_val
        x, y = prev_x, prev_y

    print(f"[+] Recovered initial state x0: {hex(x)}")
    print(f"[+] Recovered initial state y0: {hex(y)}")

    # Derive AES key
    seed = x.to_bytes(32, 'big') + y.to_bytes(32, 'big')
    key = sha256(seed).digest()

    cipher = AES.new(key, AES.MODE_CBC, iv=bytes.fromhex(data['iv']))
    flag = unpad(cipher.decrypt(bytes.fromhex(data['ciphertext'])), 16)
    print(f"[+] Flag captured: {flag.decode()}")

if __name__ == '__main__':
    solve()
```

---

## 4. Key Takeaways
- Always verify whether an algebraic cipher's S-box or power map is invertible over the underlying finite field.
- If $\gcd(d, p-1) = 1$, the exponentiation provides no one-wayness without key-dependent trapdoors.

