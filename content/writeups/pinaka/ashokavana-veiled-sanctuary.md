---
title: "Ashokavana - The Veiled Sanctuary"
date: 2026-11-01T08:27:00+05:30
description: "Analyzing fragmented multi-stream PCAP recordings to carve covert sensory beacon frames."
category: "Digital Forensics"
ctf: "Pinaka CTF 2026"
difficulty: "Medium"
points: 300
flag: "PINAKA{setu_bandhan_veiled_sanctuary_fused_recon_and_rations}"
author: "Reshma Al (Coldcoffee)"
tools: "Wireshark, tshark, Python 3"
tags:
  - "Digital Forensics"
  - "Pinaka CTF"
  - "Pinaka 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>PINAKA{setu_bandhan_veiled_sanctuary_fused_recon_and_rations}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('PINAKA{setu_bandhan_veiled_sanctuary_fused_recon_and_rations}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


**Flag:** `PINAKA{setu_bandhan_veiled_sanctuary_fused_recon_and_rations}`

## The story

Hanuman scouts Lanka, but the gardens all look identical. One file records what he saw, and another records the rations a porter company carried to the real grove. The real one is the garden that matches both records.

## Step 1: Open the zip

The zip held four files: `recon.survey` (a binary), `city_model.json` (the garden maps), `supply_records.json` (the rations and roads) and a README. The README explained the whole task, and the flag was not in any file.

## Step 2: Crack the binary

I dumped `recon.survey` in hex, and it started with the magic `PNKVEIL1`. I worked out the layout:

- The header holds the version, 6 images and 7 stones.
- Next comes a block of eight int64s, all zero. This is the damaged camera calibration.
- Each image has a small header (image number, number of observations). Each observation is a stone id plus four int64s that make two fractions (x and y), followed by a CRC32.
- I checked every CRC and threw away the two records that didn't match (the torn ones).

## Step 3: Recover the camera defect D

Image 0 was the anchor shot, taken square-on with no scale, rotation or shift. So what the camera saw there is just D times the template stones. With two stones I got four equations for D's four unknowns:

**D = \[\[6/5, 1/10\], \[−1/20, 11/10\]\]**

## Step 4: Find the look-alike gardens

For each garden I undid D on the other images and checked whether the stones were an exact scaled, rotated and shifted copy of that garden's template. I used exact fractions, so there was no rounding fuzz. My first attempt applied D in the wrong order and nothing fit. Once I applied D after the transform, gardens **1, 2 and 4** matched perfectly. Gardens 0, 3 and 5 were decoys, each differing by one stone.

## Step 5: Fix the road and read the ledger

- The total road length was 79 and the known edges summed to 75, so the overwritten edge 2–3 was **4**.
- The ledger distance was (50 − 8) / 3 = **14**.
- The shortest road distances from the depot were 10 for garden 1, 14 for garden 2 and 19 for garden 4.

## Step 6: Fuse the two clues

Of the look-alikes {1, 2, 4}, only **garden 2 (Shimshapa Bower)** sits at distance 14. Garden 3 is also at 14, but photogrammetry had already marked it a decoy.

## Step 7: Submit

I built the JSON (garden, D, template SHA-256, family, repaired edge, distances) and POSTed it with curl to `/sanctuary/verify`. The seal answered `sanctuary-confirmed` and returned the flag.


