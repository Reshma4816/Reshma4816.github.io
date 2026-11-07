---
title: "Webhack Solutions"
date: 2026-11-01T10:30:00+05:30
description: "Follow a competition collaboration post and coupon clue, distinguishing the successful lead from misleading QR codes."
category: "OSINT"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Medium"
points: 250
flag: "SoS{0s1nt_c0up0n_tr4ck3d_succ3ss}"
author: "Reshma Al (Coldcoffee)"
tools: "OSINT, Wayback Machine, ExifTool, Google Dorks"
tags:
  - "OSINT"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>SoS{0s1nt_c0up0n_tr4ck3d_succ3ss}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('SoS{0s1nt_c0up0n_tr4ck3d_succ3ss}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Investigation Brief & Target Clue
The challenge description states:
> "A partner sponsor for Sea of Secrets posted an exclusive registration discount voucher on a promotional campaign page. Some archived assets contain decoys, but the genuine coupon code reveals the flag."

We are given a starter handle: `@webhack_solutions` on X / LinkedIn and a promotional poster image.

---

## 2. Reconnaissance & Historical Footprinting
1. **Metadata Triage:** Inspecting the promotional image with `exiftool` revealed an archived campaign URL in the `Comment` field: `https://promo.webhack-solutions.xyz/v/fall2026`.
2. **Wayback Machine Pivoting:** The live domain showed an active maintenance gate. However, querying the Wayback Machine for snapshots taken during the CTF announcement week revealed an unindexed subpage `/v/fall2026/partnership-claim.html`.
3. **Decoy Filtering:** The page displayed three promotional QR codes. Scanning them with `zbarimg`:
   - QR 1: A decoy rickroll link.
   - QR 2: An invalid expired token.
   - QR 3: An encoded voucher string: `COUPON_SOS_2026_VALID`.
4. Submitting this voucher to the CTF claim portal unlocked the official flag.

