---
title: "The last committed message"
date: 2026-10-11T12:00:00+05:30
description: "Recovering stale SQLite WAL generations and reconstructing multi-page overflow attachments."
category: "Digital Forensics"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{a03a410f1b87dbc115dd1ef6}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, sqlite3, custom WAL parser, scrypt"
tags:
  - "Digital Forensics"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{a03a410f1b87dbc115dd1ef6}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{a03a410f1b87dbc115dd1ef6}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. SQLite WAL Anatomy & Problem Overview
The challenge provided two files: `case.db` (SQLite database) and `case.db-wal` (Write-Ahead Log).
Opening the database in SQLite showed only 3 public test records. The target record containing confidential operational exfiltration notes had been explicitly deleted and a vacuum executed.

---

## 2. WAL Generation Analysis & Frame Carving
A SQLite WAL header defines 32-byte salt values that update on every checkpoint. Walking the 1538 frames of the WAL identified three distinct salt generations:
- **Generation A (Live):** Frames 0–107
- **Generation B (Stale):** Frames 108–724
- **Generation C (Oldest):** Frames 725–1537

Generation B contained the target uncommitted transaction. Replaying Gen B frames against the base database structure up to commit frame 454 recovered the deleted record. Because the note was larger than a single SQLite page, we followed the overflow page pointers at offset `0x1C` of the B-Tree leaf to reassemble the full 1097-character encrypted bundle. Decrypting with scrypt produced the flag.

