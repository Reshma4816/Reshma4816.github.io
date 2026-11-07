---
title: "The Last Astra - An Unprovable Command"
date: 2026-11-01T09:23:00+05:30
description: "Zero-knowledge command verification bypass exploiting weak polynomial commitment evaluation."
category: "Cryptography"
ctf: "Pinaka CTF 2026"
difficulty: "Medium"
points: 300
flag: "PINAKA{last_astra_unprovable_command_shattered}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, pycryptodome, SageMath"
tags:
  - "Cryptography"
  - "Pinaka CTF"
  - "Pinaka 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>PINAKA{last_astra_unprovable_command_shattered}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('PINAKA{last_astra_unprovable_command_shattered}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## Challenge

The service is an "Astra command desk" that fires an order only if **both** of two
seals accept a submitted command against that order's published syndrome:

- **Dharma Seal** — checks `0 <= v_j < B` and `A·v ≡ t (mod p)`
- **Rigor Seal** — checks `0 <= v_j < B` and `A·v ≡ t (mod p2)`

The sanction matrix is block-diagonal: `A = I_m ⊗ (B^0, B^1, ..., B^{k-1})`, so a
command is a vector `v` of `n = m*k` bounded integers, and each register's
syndrome is just `v` read as a base-`B` number: `t_i = Σ v[i*k+l] * B^l`.

The goal was to make the desk fire the forbidden order `loose-last-astra`. Its
published syndrome has **no bounded opening at all** — each of its 3 register
values is far larger than `B^k = 2^128`, which is the max value a register can
represent. So there's no "honest" `v` that produces it directly.

## Source review

`pinaka_command.py` ships the exact verifier logic. Each seal only reduces
`A·v` and `t` modulo its own prime and checks the two residues match — neither
seal ever checks that `t` is itself in the achievable range `[0, B^k)`. The
file even has a comment hinting at this:

> "neither checks that the target t is itself within the achievable integer
> range... Study what the two seals do and do NOT jointly pin about the
> syndrome."

So nothing stops a bounded `v` from matching `t` mod `p` and mod `p2` without
`A·v` actually equaling `t` over the integers. That's the opening.

## The math

For each register, I need an integer `s` with:

- `0 <= s < B^k` (so it has a real bounded opening `v`)
- `s ≡ t (mod p)`
- `s ≡ t (mod p2)`

Since `gcd(p, p2) = 1`, CRT gives a single residue `s0` that's unique modulo
`p * p2`. Checking the sizes:

- `B^k = 2^128 ≈ 3.4 × 10^38`
- `p * p2 ≈ 9.35 × 10^125`

The achievable range is tiny compared to `p * p2`, so there's at most one
candidate value for `s` in `[0, B^k)` — but there's no guarantee it actually
falls in that window. I computed it for all three registers of the forbidden
syndrome and checked.

```python
import json
from sympy.ntheory.modular import crt

params = json.load(open("params.json"))
inst = json.load(open("instance.json"))

B = params["gadget"]["B"]
k = params["gadget"]["k"]
p = params["seals"]["dharma_seal"]["modulus_p"]
p2 = params["seals"]["rigor_seal"]["modulus_p2"]
Bk = B ** k

t = inst["orders"]["loose-last-astra"]["syndrome"]

command = []
for ti in t:
    sol, mod = crt([p, p2], [ti % p, ti % p2])
    sol = int(sol)
    assert 0 <= sol < Bk          # got lucky (or not lucky - math) here
    x = sol
    words = []
    for _ in range(k):
        words.append(x % B)
        x //= B
    command.extend(words)
```

All three registers' CRT solutions landed inside `[0, B^k)`. That gave a
complete 24-integer command.

## Verifying locally

Before hitting the live server, I ran it through the shipped verifier
functions directly:

```python
import pinaka_command as pc

params = pc.load_params()
inst = pc.load_instance()
t = inst["orders"]["loose-last-astra"]["syndrome"]
v = command  # the 24 ints from above

print(pc.dharma_seal(params, v, t))   # True
print(pc.rigor_seal(params, v, t))    # True
print(pc.both_seals(params, v, t))    # True
```

Both seals accepted — even though this `v` has nothing to do with the real
(nonexistent) opening of the forbidden syndrome. It only agrees with `t`
modulo `p` and modulo `p2` separately.

## Getting the flag

```bash
curl -s -X POST https://pinaka-l05-cyber-xo-x.vercel.app/astra/command \
  -H "Content-Type: application/json" \
  -d '{
    "order": "loose-last-astra",
    "command": [25891, 13729, 48228, 53333, 26052, 48198, 18635, 42774, 23357,
                44623, 11421, 64876, 806, 13712, 17028, 53081, 48044, 45191,
                45694, 9504, 18718, 16686, 46528, 40393]
  }'
```

The desk ran both seals, both accepted, and it returned the flag.


