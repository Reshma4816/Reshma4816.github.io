---
title: "Hidden in Plain Sight: Steghide LSB"
date: 2024-09-05
description: "Extract a hidden message from a PNG using LSB steganography and recover the passphrase via audio spectrogram analysis."
category: "Steganography"
ctf: "Netrunner Gaultnet CTF"
difficulty: "Easy"
points: 200
tags: ["steghide", "lsb", "stegsolve", "spectrogram", "audacity"]
---

## Challenge Overview

Two files: `signal.png` (a grid of noise-like pixels) and `key.wav` (static audio). Clearly related — the question is how.

## Solution

### Step 1: Examine the PNG

```bash
$ file signal.png
signal.png: PNG image data, 800 x 600, 8-bit/color RGB
$ exiftool signal.png | grep -i comment
Comment: Frequency holds the key
```

The comment pointed straight at the audio file.

### Step 2: Analyse the WAV in Audacity

Opened `key.wav` → `Analyse → Plot Spectrum`. Switching to spectrogram view revealed text drawn in frequency bands:

**`netrunner2024`**

### Step 3: Extract the hidden data

```bash
$ steghide extract -sf signal.png -p "netrunner2024"
wrote extracted data to "hidden.txt"
$ cat hidden.txt
FLAG{s1gn4ls_h1dd3n_1n_sp3ctr4}
```

## Flag

`FLAG{s1gn4ls_h1dd3n_1n_sp3ctr4}`

## Key Takeaways

Forensics challenges often chain multiple techniques. Never examine files in isolation — metadata comments, companion files, and audio spectrograms all hide information that solves adjacent puzzles.
