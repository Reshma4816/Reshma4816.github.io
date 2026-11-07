---
title: "Sea of Secrets: Acoustic Mesh Protocol Recovery"
date: 2026-10-05T09:00:00+05:30
description: "Demodulating underwater acoustic sensor telemetry from raw IQ hydrophone recordings and parsing custom packet frames."
category: "Digital Forensics"
ctf: "Sea of Secrets CTF"
difficulty: "Hard"
points: 450
flag: "SoS{sub_surface_ac0ust1c_t3l3m3try_d3c0d3d}"
author: "Reshma Al (Coldcoffee)"
tags:
  - "Digital Forensics"
  - "Sea of Secrets CTF"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>SoS{sub_surface_ac0ust1c_t3l3m3try_d3c0d3d}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('SoS{sub_surface_ac0ust1c_t3l3m3try_d3c0d3d}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Signal Reconnaissance
The challenge provided a hydrophone capture `hydro_ch2.iq` recorded at 96 kHz.
Inspecting the spectrogram in Audacity and Python SciPy revealed frequency-shift keying (FSK) modulation centered around 18.5 kHz with 1 kHz deviation.

## 2. Python Demodulator
We implemented an envelope detector and phase demodulator to extract binary symbols:
```python
import numpy as np
import scipy.signal as signal

iq = np.fromfile('hydro_ch2.iq', dtype=np.complex64)
# Bandpass filter around carrier
b, a = signal.butter(4, [17500/48000, 19500/48000], btype='bandpass')
filtered = signal.filtfilt(b, a, iq)
# Instantaneous frequency
phase = np.unwrap(np.angle(filtered))
freq = np.diff(phase) / (2 * np.pi) * 96000
# Demodulate to bits and frame packets
```
Reassembling the 64-byte telemetry frames recovered the marine survey report containing the flag.

