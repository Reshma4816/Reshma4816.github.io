---
title: "Neural Mesh: Steganographic DCT Carving & Discrete Cosine Transform Recovery"
date: 2026-10-28T17:00:00+05:30
description: "Extracting covert encrypted payloads embedded in JPEG Discrete Cosine Transform (DCT) coefficients."
category: "Digital Forensics"
ctf: "Netrunner Gaultnet CTF"
difficulty: "Medium"
points: 300
flag: "NR{dct_c03ff1c13nt_lsb_p3rmut4t10n_r3c0v3r3d}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, JPEGsnoop, StegSolve"
tags:
  - "Digital Forensics"
  - "Netrunner Gaultnet CTF"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>NR{dct_c03ff1c13nt_lsb_p3rmut4t10n_r3c0v3r3d}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('NR{dct_c03ff1c13nt_lsb_p3rmut4t10n_r3c0v3r3d}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Image Triage
Analyzing `nexus_corp.jpg` from Netrunner 2026. Standard file structure analysis showed clean EXIF tags.
However, inspecting DCT coefficient histograms with `jpeg-analysis` revealed anomalous even/odd frequency distributions indicative of Jsteg / Steghide embedding.

---

## 2. Extraction & Decryption
Extracting non-zero AC coefficients and decoding the graph permutation yielded an encrypted zip archive, which cracked with the challenge description password, revealing the flag.

