---
title: "Field Console"
date: 2026-10-11T12:00:00+05:30
description: "Off-by-two parser drift in custom binary TLV serializer enabling privilege escalation."
category: "Mobile Security"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{f13ld_c0ns0l3_t0k3n_b1nd1ng_byp4ss}"
author: "Reshma Al (Coldcoffee)"
tools: "apktool, jadx, Python 3"
tags:
  - "Mobile Security"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{f13ld_c0ns0l3_t0k3n_b1nd1ng_byp4ss}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{f13ld_c0ns0l3_t0k3n_b1nd1ng_byp4ss}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Binary TLV Serialization Flaw
The field console mobile app communicates with dispatch servers via a custom TLV format (`OSX1`).
Reverse engineering the parser in JADX revealed an off-by-two byte calculation: when parsing variable-length BLOB tags, the parser consumed $L - 2$ bytes while claiming $L$ bytes.

---

## 2. Multi-Pass ACL Elevation
By crafting an embedded BLOB payload with trailing ACL permissions $(7, 1, 1)$, repeated serialization passes by intermediate relays shifted the offset by 2 bytes each pass. When received by the dispatch gateway, the ACL shifted to role `7` (Superadmin), granting flag retrieval.

