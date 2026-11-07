---
title: "last-packet"
date: 2026-10-11T12:00:00+05:30
description: "Reassembling fragmented covert DNS tunneling records from enterprise network captures."
category: "Digital Forensics"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Medium"
points: 300
flag: "isfcr{dns_c2_tun3l_fr4gm3nt_r3c0v3r3d}"
author: "Reshma Al (Coldcoffee)"
tools: "tshark, Python 3"
tags:
  - "Digital Forensics"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{dns_c2_tun3l_fr4gm3nt_r3c0v3r3d}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{dns_c2_tun3l_fr4gm3nt_r3c0v3r3d}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. PCAP Traffic Extraction
The network trace contains thousands of anomalous DNS queries directed to domain `*.tunnel.security-labs.io`.
The subdomains encode hex-formatted payloads with sequence numbers and CRC16 checksums.

---

## 2. Stream Reassembly
Filtering DNS `TXT` responses and reordering sequence indices recovered a multi-part Gzip archive containing an exfiltrated incident report and the flag.

