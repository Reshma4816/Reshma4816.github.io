---
title: "Fluxgate G3"
date: 2026-10-11T12:00:00+05:30
description: "Exploiting mismatched component version constraints in modular embedded firmware."
category: "IoT"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Medium"
points: 350
flag: "isfcr{s1gn3d_p4rts_uns1gn3d_whole_ab84f1}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, custom frame builder"
tags:
  - "IoT"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{s1gn3d_p4rts_uns1gn3d_whole_ab84f1}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{s1gn3d_p4rts_uns1gn3d_whole_ab84f1}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Modular Firmware Signature Disconnect
The Fluxgate G3 controller enforces cryptographic verification on individual firmware components (policy table, capability manifest, radio firmware), but lacks a composite manifest signature validating that the components belong to the same release.

---

## 2. Exploitation: Component Swapping
By pairing a pre-release candidate policy (`pol-v3rc`) with a production capability manifest (`tab-v3`), we induced a permission desynchronization. The policy allowed an unauthenticated maintenance packet to execute opcode `0x07` (Admin Unlock), retrieving the flag.

