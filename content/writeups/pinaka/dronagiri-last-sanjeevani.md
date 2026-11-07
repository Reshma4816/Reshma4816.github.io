---
title: "Dronagiri - The Last Sanjeevani"
date: 2026-11-01T09:38:00+05:30
description: "Carving botanical telemetry from corrupted ext4 journal inodes and sector slack."
category: "Digital Forensics"
ctf: "Pinaka CTF 2026"
difficulty: "Medium"
points: 300
flag: "PINAKA{dronagiri_the_last_sanjeevani}"
author: "Reshma Al (Coldcoffee)"
tools: "debugfs, fls, icat, Python 3"
tags:
  - "Digital Forensics"
  - "Pinaka CTF"
  - "Pinaka 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>PINAKA{dronagiri_the_last_sanjeevani}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('PINAKA{dronagiri_the_last_sanjeevani}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


**Flag:** `PINAKA{dronagiri_the_last_sanjeevani}`

## Overview
The challenge gave me three replicated database nodes (`node0/1/2.seg` and `.wal`), a spectrometer calibration file (`instrument.cal`) and a terrain grid (`dronagiri.dem`). All of them are custom binary formats with no documentation. I had to find the one real Sanjeevani specimen and submit its full record to `/dronagiri/sanjeevani`.

## 1. Reversing the files
- **`instrument.cal`**: it has two lamp lines, index 5 = 1045 nm and index 25 = 1105 nm. That gives `nm = 3 * index + 1030`.
- **`dronagiri.dem`**: a 26-byte header, then a 256x256 grid of little-endian 16-bit elevations (row-major, `y*256+x`).
- **`.seg` snapshots**: a 28-byte header, then 1200 records of 173 bytes: `[key u32][seqno u64][op][length][value][crc32]`. The three nodes were identical.
- **`.wal` logs**: a 20-byte header, then `DREC` frames: `[lsn][seqno][op][key][length][value][crc32]`. About 600 frames per node failed the CRC (torn), and the end of each log was zeroed.

The record CRC is a plain crc32 over everything before the last 4 bytes, which confirmed my field boundaries.

## 2. Decoding the spectrum
Each value has an `HPAK` blob with a crc32 and 32 sign-magnitude words. One record had words -48067, -24193, -12200, -6006 and +3003, each about half the last. That is what a single spike looks like after a Haar transform. The layout is `[DC, 16 fine, 8, 4, 2, 1]`, and the reversible step is `d = b - a`, `s = a + (d >> 1)`. Inverting it gave sensible positive intensities, and the embedded crc32 checked out on every record.

## 3. Reconciling the logs (quorum)
- I discarded every frame whose CRC failed.
- A write counts as committed only if at least 2 of the 3 nodes hold an identical valid frame.
- That gave exactly 1200 committed writes: 1180 puts and 20 deletes, with seqnos `1000000 + id`. They are newer than the snapshot, so they replace it.
- About 10,900 other frames sat on a single node with larger seqnos, including a decoy for the real specimen. Those are not committed, so I ignored them.
- After applying the puts and deletes, 1180 records remained, and I built the archive digest from them.

## 4. Finding the real specimen
I decoded all 1180 specimens and kept the ones whose peak wavelength is in 1108-1123 nm (bands 26-31). Then I checked each one's terrain cell: elevation 3000-3400 and strictly higher than all 8 neighbours. Exactly one specimen passed:

- specimen **488**, seqno **1000488**
- cell **(52, 210)**, elevation **3332**
- peak band **27** = **1111 nm**
- spectrum: `[381,358,227,189,280,170,135,159,415,88,154,324,264,102,219,187,412,181,361,244,229,220,268,86,205,403,346,57817,384,253,141,240]`
- committed record count **1180**
- archive digest `4dbe165e82832e0290e17ea1bcc85bdd1a18a0ae2bd68bdebb1468bfca2c1cf0`

## 5. Submission
```bash
curl -sS -X POST https://pinaka-l04-cyber-xo-x.vercel.app/dronagiri/sanjeevani \
  -H 'Content-Type: application/json' \
  -d '{"specimen_id":488,"commit_seqno":1000488,"cell":[52,210],"elevation":3332,"peak_band":27,"peak_wavelength":[1111,1],"wavelength_solution":[3,1,1030,1],"restored_spectrum":[381,358,227,189,280,170,135,159,415,88,154,324,264,102,219,187,412,181,361,244,229,220,268,86,205,403,346,57817,384,253,141,240],"committed_record_count":1180,"committed_archive_digest":"4dbe165e82832e0290e17ea1bcc85bdd1a18a0ae2bd68bdebb1468bfca2c1cf0"}'
```

Response:

```json
{"flag":"PINAKA{dronagiri_the_last_sanjeevani}","proclamation":"The true Sanjeevani is found; the fallen will rise.","status":"sanjeevani-confirmed"}
```

