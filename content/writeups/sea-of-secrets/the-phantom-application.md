---
title: "The Phantom Application"
date: 2026-11-01T12:00:00+05:30
description: "Recover an Android vault's passcode and key derivation from the APK, then decrypt its default ledger offline."
category: "Mobile Security"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Medium"
points: 300
flag: "SoS{4ndr01d_v4ult_p4ssc0d3_unc0v3r3d}"
author: "Reshma Al (Coldcoffee)"
tools: "apktool, jadx, Python 3"
tags:
  - "Mobile Security"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>SoS{4ndr01d_v4ult_p4ssc0d3_unc0v3r3d}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('SoS{4ndr01d_v4ult_p4ssc0d3_unc0v3r3d}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Android Vault Reverse Engineering
The challenge supplied an Android application package `phantom_vault.apk`. Decompiling with JADX revealed an encrypted local SQLite database `ledger.db` stored inside assets.

The database decryption key is derived using PBKDF2WithHmacSHA1:
- Password: A 6-digit numeric passcode stored in an obfuscated array in `SecretUtil.java`.
- Salt: The package name concatenated with a constant string.
- Iterations: 10,000.

Carving the 6-digit PIN `849201` and executing SQLCipher decryption unmasked the encrypted record containing the flag.

