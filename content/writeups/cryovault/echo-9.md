---
title: "ECHO-9"
date: 2026-10-11T12:00:00+05:30
description: "EEPROM state reconstruction, TCP stream reassembly, and AES-CTR keystream cancellation."
category: "IoT"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{echo9_b5f049f6b72f5bda5bd20acbc3b5b2f8a566}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, pycryptodome, Wireshark"
tags:
  - "IoT"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{echo9_b5f049f6b72f5bda5bd20acbc3b5b2f8a566}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{echo9_b5f049f6b72f5bda5bd20acbc3b5b2f8a566}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Sensor Telemetry & EEPROM Reconstruction
Provided with EEPROM dumps and PCAP traffic for an industrial ECHO-9 environmental sensor.
Reassembling the TCP streams isolated periodic telemetry encrypted with AES-CTR.

---

## 2. Keystream Cancellation Attack
The sensor firmware experienced an unhandled watchdog reset, causing it to reuse an AES-CTR counter sequence across a reset notification and a subsequent diagnostic response.
Because the reset notification format is deterministic and known, XORing the known plaintext with both ciphertexts completely eliminated the keystream, disclosing the diagnostic flag.

