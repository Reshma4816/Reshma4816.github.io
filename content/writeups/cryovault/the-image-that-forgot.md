---
title: "The image that forgot"
date: 2026-10-11T12:00:00+05:30
description: "JPEG progressive scan metadata analysis and DCT coefficient carving."
category: "Digital Forensics"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Medium"
points: 350
flag: "isfcr{jp3g_pr0gr3ss1v3_sc4n_h1dd3n_c03ff}"
author: "Reshma Al (Coldcoffee)"
tools: "JPEGsnoop, Python 3, StegSolve"
tags:
  - "Digital Forensics"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{jp3g_pr0gr3ss1v3_sc4n_h1dd3n_c03ff}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{jp3g_pr0gr3ss1v3_sc4n_h1dd3n_c03ff}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Image Header Triage
Analyzing `forgotten.jpg` with `JPEGsnoop` revealed that the image is encoded as a progressive JPEG containing 14 scan segments.

---

## 2. Hidden Scan Carving
Between the 11th and 12th scan segments, an undocumented APP14 marker contained 1024 bytes of high-frequency DCT data that did not render visibly on screen. Extracting and decoding this segment unmasked the flag.

