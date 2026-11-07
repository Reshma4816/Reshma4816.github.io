---
title: "Ghosts in the Bulb"
date: 2026-10-11T12:00:00+05:30
description: "Extracting covert data from smart home MQTT brightness LSBs and robovac inter-packet timing channels."
category: "Digital Forensics"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{when_photons_and_seconds_both_carry_secrets_a7c3}"
author: "Reshma Al (Coldcoffee)"
tools: "tshark, Python 3, pycryptodome, Base85"
tags:
  - "Digital Forensics"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{when_photons_and_seconds_both_carry_secrets_a7c3}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{when_photons_and_seconds_both_carry_secrets_a7c3}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Network Traffic Characterization
We were supplied with a PCAP capture `smart_home.pcap` monitoring unencrypted MQTT traffic across 12 smart home IoT devices.

Filtering MQTT traffic using `tshark`:
```bash
$ tshark -r smart_home.pcap -Y "mqtt" -T fields -e mqtt.topic | sort | uniq -c
    952 home/bedroom/light/state
   1420 home/vacuum/cleaner/telemetry
    340 home/living/thermostat/reading
```

---

## 2. Dual Covert Channels
1. **Brightness LSB Steganography:** The smart bulb publishes JSON telemetry `{"bri": <int>, "on": true}`. Extracting the least significant bit (LSB) of the 952 brightness values yielded a continuous stream of binary data. The stream decoded to an 87-byte Base85 container prefixed with `GITB`.
2. **Inter-Packet Timing Channel:** The container was AES-GCM encrypted. Analyzing the packet timestamps of the robotic vacuum (which was docked and supposedly idle) revealed that inter-packet intervals were not constant, but varied in integer multiples of 15 seconds: $30\text{s}, 45\text{s}, 60\text{s}, 75\text{s}$.
3. Mapping interval $(t / 15 - 2)$ to 2-bit symbols reconstructed the secret passphrase: `KZ7WMQR3XB2H`.
4. Deriving the key via $\text{SHA256}(\text{passphrase})$ decrypted the Base85 container to reveal the flag.

