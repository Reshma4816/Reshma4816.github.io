---
title: "The deletion echo"
date: 2026-10-11T12:00:00+05:30
description: "Ext4 unallocated inode journal recovery and directory tree reconstruction after recursive deletion."
category: "Digital Forensics"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{3xt4_j0urn4l_un4ll0c4t3d_1n0d3_r3c0v3r}"
author: "Reshma Al (Coldcoffee)"
tools: "debugfs, ext4magic, Python 3"
tags:
  - "Digital Forensics"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{3xt4_j0urn4l_un4ll0c4t3d_1n0d3_r3c0v3r}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{3xt4_j0urn4l_un4ll0c4t3d_1n0d3_r3c0v3r}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Ext4 Inode Recovery
A cloud server's critical directory was wiped using `rm -rf`.
The disk image `backup.raw` was analyzed with `debugfs` and `ext4magic`.

---

## 2. Journal Reconstruction
Because the filesystem maintained a journal (`JBD2`), transactions containing uncommitted directory index blocks remained un-overwritten. Carving historical directory B-Trees recovered the deleted files and the flag.

