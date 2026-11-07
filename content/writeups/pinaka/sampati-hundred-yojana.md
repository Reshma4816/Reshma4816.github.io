---
title: "Sampati - The Hundred-Yojana Sight"
date: 2026-11-01T09:06:00+05:30
description: "High-altitude optical analysis, perspective correction, and Fourier spectral filtering."
category: "Misc"
ctf: "Pinaka CTF 2026"
difficulty: "Medium"
points: 300
flag: "PINAKA{sampati_shatayojana_drishti_lanka}"
author: "Reshma Al (Coldcoffee)"
tools: "OpenCV, Python 3, GIMP"
tags:
  - "Misc"
  - "Pinaka CTF"
  - "Pinaka 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>PINAKA{sampati_shatayojana_drishti_lanka}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('PINAKA{sampati_shatayojana_drishti_lanka}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


**Category:** Misc | **Points:** 300 | **Flag:** `PINAKA{sampati_shatayojana_drishti_lanka}`

---

## The story in one line

Sampati the vulture saw three mountain peaks from six different cliffs, but his sight was bent by the sea air and his eyes were slightly off. I had to undo those errors and work out exactly where the peaks really are.

---

## Step 1: Open the zip

Inside `K05_player.zip` there were only two files:

- `README.md` (the story and the rules)
- `sightings.sampati` (a binary file, about 1 KB, no documentation)

The README gave the camera formula but not the file layout. So the first job was to read the binary file by hand.

## Step 2: Read the binary file

I dumped the bytes in hex and looked for patterns.

- The file starts with the text `PNKSAMP1`. That is the magic header.
- Right after it come small numbers: 6 stations (perches) and 3 points (peaks).
- Then I spotted `00 00 00 00 00 00 89 40`. As a little-endian double, that is **800.0**. This is the focal length.
- The next two doubles were 0 and 0, the image centre (cx, cy).
- After that came 6 blocks. Each had a position (3 numbers) and a rotation (9 numbers) for one cliff.
- After those came 18 shorter blocks. These are the sightings: station, peak, a flag byte, then one or two numbers (the u and v pixel coordinates).

**How I knew I was right:** every block ends with a CRC32. I checked them and they all matched. A wrong layout would have failed the checksums.

**One guess to settle:** the flag byte means 3 = both u and v, 1 = only one of them, 2 = only the other. I tried both ways round later. The correct reading is **1 = only u, 2 = only v**.

## Step 3: Understand what is unknown

From the README, the camera formula bends each point by two numbers (k1, k2) and shifts the image by two more (dcx, dcy). Add the 3 peaks with 3 coordinates each:

> 9 + 2 + 2 = **13 unknowns**

I had 27 measurements. More measurements than unknowns means the answer can be pinned down exactly.

## Step 4: Get a rough guess first

I tried to solve it directly with random starting points, but it was far too slow and got lost.

The fix was to start with a simple version of the problem:

- Pretend there is no bending and no shift.
- Then each measurement becomes a straight-line equation in the peak's position.
- Solve that with ordinary least squares.

This gave a rough answer for the peaks, around (-25, 421, 62). It was not exact, but it was close enough to start from.

## Step 5: Solve the real problem (bundle adjustment)

Starting from the rough guess, I ran a nonlinear least-squares solver (`scipy.optimize.least_squares`) over all 13 unknowns at once. It adjusts everything until the predicted pixels match the measured pixels.

It converged with an error of almost exactly zero (about 1e-25). That meant the data was perfect and I had found the true answer.

| Thing | Value |
|---|---|
| Peak 0 | (-22, 452, 68) |
| Peak 1 | (-26, 412, 27) |
| Peak 2 | (1, 437, 50) |
| k1, k2 | 0.129756, -0.046241 |
| dcx, dcy | -5.925, 6.986 |

Two signs told me it was right:

- The peaks came out as **whole numbers**, as the task asked.
- The other values were clean decimals, with no messy digits.

The wrong flag reading (1 = only v) gave a huge error of about 270,000, so it was easy to throw away.

## Step 6: Fill in the missing pixels

Eight sightings had only one coordinate. Using the solved peaks and the camera formula, I computed the missing one for each.

Then I multiplied by 1000 and rounded, as the README asks.
Axis 0 means u was missing, axis 1 means v was missing.

## Step 7: Pack the answer

- `distortion` = `[129756, -46241]` (k times 1,000,000)
- `calibration` = `[-5925, 6986]` (d times 1,000)
- `completed` = the 8 filled-in values
- `reconstruction_digest` = SHA-256 of one long string:
  `P0:...;P1:...;P2:...;K:...;C:...;M:...` (the M items sorted)
- `sight_range` = distance from (0,0,0) to the centre of the 3 peaks, rounded = **437**

## Step 8: Send it

My sandbox could not reach the validator, so I ran the `curl` command from my own Kali machine:

```bash
curl -X POST https://pinaka-k05-cyber-xo-x.vercel.app/lanka/sighting \
  -H 'Content-Type: application/json' -d '{
"peaks": [[-22,452,68],[-26,412,27],[1,437,50]],
"distortion": [129756,-46241],
"calibration": [-5925,6986],
"completed": [[0,1,0,-109809],[0,2,1,128699],[1,0,0,-541219],[1,2,1,-389037],[3,1,1,-70833],[3,2,0,-418968],[4,0,0,-474587],[5,2,1,152426]],
"reconstruction_digest": "731a0108944f512b787b66c7721ca1990e99b0971a39e36c62246b9fd26a78db",
"sight_range": 437
}'
```

The server replied:

```json
{"flag":"PINAKA{sampati_shatayojana_drishti_lanka}",
 "proclamation":"Sampati opens his hundred-yojana eyes: there stands Lanka",
 "status":"sighting-confirmed"}
```

**Flag:** `PINAKA{sampati_shatayojana_drishti_lanka}`

