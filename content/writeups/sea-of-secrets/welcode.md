---
title: "Welcome"
date: 2026-11-01T10:00:00+05:30
description: "Recognize successive Base62, Base58, and Base32 alphabets and decode the layered message with explicit base conversion."
category: "Cryptography"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Easy"
points: 100
flag: "SoS{w3lc0m3_t0_th3_d33p_blu3_s34}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, base58, base62"
tags:
  - "Cryptography"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>SoS{w3lc0m3_t0_th3_d33p_blu3_s34}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('SoS{w3lc0m3_t0_th3_d33p_blu3_s34}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Challenge Overview
The welcome challenge for Sea of Secrets CTF presented an obfuscated encoded transmission string `enc.txt`. The goal is to recognize layered encoding alphabets and strip down successive representations to recover the plaintext capture flag.

---

## 2. Multi-Layer Alphabet Identification
Analyzing the character frequency distribution of the input string:
1. **Layer 1 (Base62):** The string contains characters $[0-9a-zA-Z]$ without punctuation or padding characters. Decoding via Base62 returns a second-stage string.
2. **Layer 2 (Base58):** The resulting string omits characters `0`, `O`, `I`, and `l`—the hallmark of Bitcoin Base58 encoding.
3. **Layer 3 (Base32):** Decoding Base58 yields uppercase characters $[A-Z2-7]$ with standard `=` padding, identifying RFC 4648 Base32.
4. **Final Plaintext:** Decoding Base32 yields the UTF-8 flag string.

---

## 3. Decoder Script

```python
#!/usr/bin/env python3
import base64
import base58

def base62_decode(data):
    ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    num = 0
    for char in data:
        num = num * 62 + ALPHABET.index(char)
    res = []
    while num > 0:
        res.append(num & 0xff)
        num >>= 8
    return bytes(reversed(res))

with open('enc.txt', 'r') as f:
    raw = f.read().strip()

stage1 = base62_decode(raw).decode()
stage2 = base58.b58decode(stage1)
flag = base64.b32decode(stage2).decode()

print(f"[+] Flag captured: {flag}")
```

