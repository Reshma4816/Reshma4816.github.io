---
title: "FlaGuard"
date: 2026-10-11T12:00:00+05:30
description: "Decrypting hidden secondary DEX payload from APK assets and reversing obfuscated bytecode."
category: "Mobile Security"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{p4r3nt_f1rst_d3x_1s_s0_m34n}"
author: "Reshma Al (Coldcoffee)"
tools: "jadx, apktool, Python 3, OpenSSL"
tags:
  - "Mobile Security"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{p4r3nt_f1rst_d3x_1s_s0_m34n}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{p4r3nt_f1rst_d3x_1s_s0_m34n}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. APK Decompilation & Static Analysis

Decompiling `flaguard.apk` using **JADX-GUI**:
1. In `com.cryovault.flaguard.MainActivity`, the user input is passed to `Checker.validate(input)`.
2. Inspecting `Checker.java`, we find an obvious string comparison against a decoy flag:
   `"isfcr{decoy_flag_do_not_submit}"`.
3. However, inspecting the application lifecycle reveals an overloaded `Application.attachBaseContext()`:

```java
InputStream is = getAssets().open("theme.pack");
byte[] encData = is.readAllBytes();
byte[] key = deriveKey();
byte[] decDex = decryptPayload(encData, key);
InMemoryDexClassLoader loader = new InMemoryDexClassLoader(
    ByteBuffer.wrap(decDex),
    getClassLoader()
);
Class<?> realChecker = loader.loadClass("com.cryovault.internal.RealValidator");
```

The true validation logic is loaded dynamically at runtime via `InMemoryDexClassLoader` from an encrypted asset named `theme.pack`.

---

## 2. Key Derivation & DEX Carving

Analyzing the native helper `libguard.so` via Ghidra reveals the key derivation logic:
- The key is derived by hashing the SHA-256 digest of the primary `classes.dex` combined with the first 16 bytes of `res/drawable/palette.webp`.
- The encryption algorithm is AES-128-CBC with a fixed zero initialization vector.

We extracted the primary `classes.dex` and `palette.webp` using `unzip flaguard.apk` and implemented a Python decryptor:

```python
from hashlib import sha256
from Crypto.Cipher import AES

classes_dex = open('classes.dex', 'rb').read()
palette = open('res/drawable/palette.webp', 'rb').read()[:16]

key = sha256(classes_dex + palette).digest()[:16]
enc_dex = open('assets/theme.pack', 'rb').read()

cipher = AES.new(key, AES.MODE_CBC, iv=b'\x00' * 16)
dec_dex = cipher.decrypt(enc_dex)

with open('secondary.dex', 'wb') as f:
    f.write(dec_dex)
```

---

## 3. Reversing the In-Memory Validator

Decompiling the carved `secondary.dex` in JADX exposes `RealValidator.verifyFlag(String flag)`:
- The flag must have length 34 and start with `"isfcr{"` and end with `"}"`.
- The inner 27 characters are validated against two lookup tables $T_1$ and $T_2$ with a rolling state accumulator:

```java
int state = 0x5a;
for (int i = 0; i < input.length(); i++) {
    state = (state ^ input.charAt(i)) * 31 & 0xff;
    if ((state ^ T1[i]) != T2[i]) return false;
}
```

Because each step inverts via finite byte lookup:
$$\text{input}[i] = \text{state} \oplus (T_1[i] \oplus T_2[i] \cdot 31^{-1} \pmod{256})$$

We inverted the check to recover the exact character sequence: `p4r3nt_f1rst_d3x_1s_s0_m34n`.

---

## 4. Key Takeaways
- Decoy flags and standard static checks in `MainActivity` are common anti-analysis barriers.
- Inspecting `Application` subclasses and `attachBaseContext` routinely uncovers secondary runtime DEX classloading.

