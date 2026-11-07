---
title: "The Forgotten Vault"
date: 2026-11-01T12:30:00+05:30
description: "Search a wordlist-and-PIN password space, derive each AES key with MD5, and validate candidate plaintext padding."
category: "Cryptography"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Medium"
points: 250
flag: "SoS{m4st3r_k3y_v4ult_d3c0d3d_2026}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, hashcat, pycryptodome"
tags:
  - "Cryptography"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>SoS{m4st3r_k3y_v4ult_d3c0d3d_2026}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('SoS{m4st3r_k3y_v4ult_d3c0d3d_2026}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Cryptographic Structure & Weak Key Derivation
An encrypted backup archive was recovered from an abandoned corporate server. The decryption routine specifies:
- Cipher: AES-128-CBC
- Key: `MD5(wordlist_password + 4_digit_pin)`
- IV: Fixed 16-byte header prepended to the ciphertext.

Because the password space consists of a common 1,000-word dictionary appended with a 4-digit PIN ($1000 \times 10^4 = 10^7$ total combinations), we conducted an exhaustive parallel padding oracle check in Python. The key was recovered in under 12 seconds on a single CPU core.

