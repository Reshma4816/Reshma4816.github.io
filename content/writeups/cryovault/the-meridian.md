---
title: "The Meridian"
date: 2026-10-11T12:00:00+05:30
description: "JavaScript client-side provenance verification and cryptographic key schedule reconstruction."
category: "Web Exploitation"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Medium"
points: 300
flag: "isfcr{d33p_m3rg3_p0llut3s_th3_pr0v3n4nc3_v4ult_1n_th3_m3r1d14n}"
author: "Reshma Al (Coldcoffee)"
tools: "Burp Suite, Node.js, Chrome DevTools"
tags:
  - "Web Exploitation"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{d33p_m3rg3_p0llut3s_th3_pr0v3n4nc3_v4ult_1n_th3_m3r1d14n}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{d33p_m3rg3_p0llut3s_th3_pr0v3n4nc3_v4ult_1n_th3_m3r1d14n}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Web Reconnaissance & Source Audit
The Meridian is a client-side art provenance catalog built with React.
Inspecting network traffic in Chrome DevTools revealed that the administrative exhibition vault is loaded as an encrypted blob `vault.dat`.

The client codebase (`bundle.js`) contains the derivation routine:
```javascript
async function unlockVault(exhibits) {
    const verified = exhibits
        .filter(e => verifyProvenance(e))
        .sort((a, b) => a.accessionYear - b.accessionYear);
    
    let sumYears = verified.reduce((acc, e) => acc + e.accessionYear, 0);
    let rounds = 1000 + (sumYears % 4096);
    
    let key = await deriveSchedule(verified, rounds);
    return decryptAES(vaultBlob, key);
}
```

---

## 2. Provenance Logic & Prototype Pollution
Audit of the provenance validator identified:
1. Five exhibits pass validation:
   - *E. Vantar* (1971)
   - *R. Oikawa* (1984)
   - *H. Delacroix* (1990)
   - *K. Adeyemi* (2003)
   - *S. Marchetti* (2011)
2. Sum of accession years: $1971 + 1984 + 1990 + 2003 + 2011 = 9959$.
3. Modular round offset: $9959 \pmod{4096} = 1767$.
4. Total hashing rounds: $1000 + 1767 = 2767$ iterations of SHA-256.

Running the key derivation routine in Node.js decrypted the encrypted vault payload, exposing the capture flag.

