---
title: "Nala's Blueprint - The Secret Geometry"
date: 2026-11-01T08:30:00+05:30
description: "Exploiting biased ephemeral nonces in ECDSA curve calculations to reconstruct bridge blueprint coordinates."
category: "Cryptography"
ctf: "Pinaka CTF 2026"
difficulty: "Medium"
points: 300
flag: "PINAKA{nala_blueprint_ecc_geometry_and_nonce_reuse}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, SageMath, fpylll"
tags:
  - "Cryptography"
  - "Pinaka CTF"
  - "Pinaka 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>PINAKA{nala_blueprint_ecc_geometry_and_nonce_reuse}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('PINAKA{nala_blueprint_ecc_geometry_and_nonce_reuse}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


**Category:** Crypto · **Difficulty:** Hard
**Flag:** `PINAKA{nala_blueprint_ecc_geometry_and_nonce_reuse}`

---

## The story

Nala's archive survived, but it was wounded. The pier measurements were
protected by a damaged error-correcting code, and the blueprint was locked
under a cipher. The scribes made one careless mistake: they used the **same
nonce twice**. That was the crack in the seal.

The solve had three steps.

---

## Step 1: Open the box and read the rules

The zip held four files:

- `parity.rsc`: a Reed-Solomon codeword with some bad symbols
- `archive.sealed`: two encrypted records, the *manifest* and the *blueprint*
- `blueprint_format.txt`: the public formats of both files
- `README.md`: the story and the goal

The formats file was the key. It spelled out exactly what the manifest
plaintext looks like, which matters later.

---

## Step 2: Heal the measurements (Reed-Solomon)

Reading `parity.rsc` gave:

- prime `p = 65537`
- `k = 12` true measurements
- `n = 24` recorded symbols
- 4 symbols marked **erased** (thrown away)

That leaves 20 symbols, and some of them were silently corrupted. The code can
fix `e` errors and `f` erasures when `2e + f ≤ n − k`. Here `2e + 4 ≤ 12`, so
up to **4 errors** can be fixed.

I used **Berlekamp–Welch**, which sets up a linear system mod p, solves it, and
divides to get the original polynomial. It reported errors at x = 8, 11, 14
and 18. The 12 coefficients of the polynomial are the pier heights:

```
601, 1228, 1795, 2302, 2749, 3136, 3463, 3730, 3937, 4084, 4171, 4198
```

---

## Step 3: Check the arch (geometry)

The heights should lie on one parabola `h(i) = A·i² + B·i + C`. They do:

```
h(i) = -30·i² + 657·i + 601
```

That confirms the decode is right. The keystone apex is the vertex height:

```
apex = C − B²/(4A) = 601 − 657²/(−120) = 167923/40
```

---

## Step 4: Break the seal (nonce reuse)

Both records were encrypted with the same key **and the same nonce**
(`fec3116eaaad0420617b4b5a`), so they used the same keystream:

```
manifest_ct  = manifest  XOR keystream
blueprint_ct = blueprint XOR keystream
```

I knew the manifest plaintext because I could rebuild it from the public
format, using my apex and measurements:

```
keystone_apex=167923/40
piers=12
h00=601
...
h11=4198
SETU-MANIFEST-v1
.......(dots padded to 512 bytes)
```

Then two XORs:

1. `manifest_ct XOR manifest` gives the **keystream**
2. `blueprint_ct XOR keystream` gives the **blueprint plaintext**

The blueprint decrypted cleanly:

```
keystone_seal=3b4c5970eeaf629a1bfb38d05c46166458a654cc4fdb4ce4b7b26506e461bcee
SETU-BLUEPRINT-v1
engineer=Nala-Setukarma
span_units=adams-bridge
```

Readable text confirmed that every earlier step was correct. No key and no
brute force were needed.

---

## Step 5: Present to the validator

```bash
curl -X POST https://pinaka-s05-cyber-xo-x.vercel.app/setu/keystone \
  -H 'Content-Type: application/json' \
  -d '{"measurements":[601,1228,1795,2302,2749,3136,3463,3730,3937,4084,4171,4198],"keystone_apex":[167923,40],"seal":"3b4c5970eeaf629a1bfb38d05c46166458a654cc4fdb4ce4b7b26506e461bcee"}'
```

Response:

```json
{"flag":"PINAKA{nala_blueprint_ecc_geometry_and_nonce_reuse}","status":"blueprint-sealed"}
```


