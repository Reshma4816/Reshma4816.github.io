---
title: "Zygote Conspiracy"
date: 2026-10-11T12:00:00+05:30
description: "Analyzing IPC memory-sharing handshake between twin Android processes sharing UID."
category: "Mobile Security"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{tw1n_pr0cess_h4ndshake_mem0ry_0nly_9f23ac}"
author: "Reshma Al (Coldcoffee)"
tools: "androguard, Python 3, OpenSSL"
tags:
  - "Mobile Security"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{tw1n_pr0cess_h4ndshake_mem0ry_0nly_9f23ac}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{tw1n_pr0cess_h4ndshake_mem0ry_0nly_9f23ac}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Dual-APK Architecture Analysis
Two applications (`app_alpha.apk` and `app_beta.apk`) declare `android:sharedUserId="xyz.srspace.suite"` and share identical signing keys. Each package holds a 32 KB binary asset `half.bin`.

---

## 2. Inter-Process Memory Carving
At runtime, the apps establish an anonymous file descriptor (`memfd_create`) exchange over UNIX domain sockets.
The combined payload is formed by XORing both `half.bin` streams and decrypting via ChaCha20 with an HKDF key derived from the shared APK signing certificate. Decompiling the resulting in-memory DEX exposed the flag.

