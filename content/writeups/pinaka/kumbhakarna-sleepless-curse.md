---
title: "Kumbhakarna - The Sleepless Curse"
date: 2026-11-02T20:00:00+05:30
description: "Deobfuscating custom stack VM architecture and symbolic execution with Z3."
category: "Reverse Engineering"
ctf: "Pinaka CTF 2026"
difficulty: "Hard"
points: 300
flag: "PINAKA{kumbhakarna_wakes_when_y0u_model_the_machine_not_brute_it}"
author: "Reshma Al (Coldcoffee)"
tools: "Ghidra, Z3 Theorem Prover, Python 3"
tags:
  - "Reverse Engineering"
  - "Pinaka CTF"
  - "Pinaka 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>PINAKA{kumbhakarna_wakes_when_y0u_model_the_machine_not_brute_it}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('PINAKA{kumbhakarna_wakes_when_y0u_model_the_machine_not_brute_it}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


**Category:** Reverse Engineering
**Difficulty:** Hard
**Goal:** Find the six numbers (the "summons") that bring the engine's sleep-depth to 0, then send them to the gate along with the attestation tag.

---

## What we are given

After unzipping `L02_player.zip` I got these files:

- `README.md` - the story and the rules
- `firmware.rom` - the firmware for the made-up PRAHARA processor
- `firmware_debug.rom` - a debug version of the firmware (not needed in the end)
- `prahara_emu` - the emulator, a stripped 64-bit Linux binary
- `dundubhi_cfg.bin`, `vectors.dat` - extra data files. The emulator never opens them (checked with `strace`).

The emulator is used like this:

```
./prahara_emu firmware.rom <b0> <b1> <b2> <b3> <b4> <b5>
```

It prints:

```
awake=<0|1>
sleep_depth=<number>
garjana=<trace>
tag=<64 hex chars>
```

To get the flag I have to POST the six numbers and the `tag` to `/lanka/awaken`. The numbers must make `awake=1` (sleep-depth 0), and the `tag` must be the one the real emulator prints.

## First look

I ran the emulator with some random inputs:

```
./prahara_emu firmware.rom 1 2 3 4 5 6
awake=0
sleep_depth=180
```

The sleep-depth was 180. I also tried changing one number at a time (0, 1, 2, 255, 65535...), and the depth always stayed at 180. So guessing by hand would not work.

An important point: the **tag is printed by the emulator itself**. So I don't need to work out how the tag is made. I only need the right six numbers, and then I run the real emulator with them to get the tag.

## Reading the emulator

I disassembled `prahara_emu` with `objdump`. From the code I learned:

- The firmware is loaded as 2048 words of 12 bits each.
- The main loop reads a word, takes the opcode from bits 8-11, and jumps through a table. There are 15 opcodes (0-14).
- It is a stack machine. It has a stack, a data memory, and a timer that fires every few steps.
- Some opcodes read the input numbers, and each input is masked to 12 bits (`& 0xfff`), so every summons is a value from 0 to 4095.
- There is a small second processor (DUNDUBHI). The main CPU talks to it by sending command bytes, and it does modular maths with the modulus `0xffd`.
- A SHA-256 style function builds the tag from the run.

The most useful part was the `SYS` opcode (`0xA`). Two of its sub-commands matter:

1. **SYS 0x31:** if the popped value is `1`, then `sleep_depth -= 30` (it stops at 0).
2. **SYS 0x32:** if the popped value is `0xace` **and** sleep_depth is 0, then the awake flag is set.

The depth starts at `0xb4 = 180`, and 180 / 30 = 6. So the firmware does **six checks**, one for each summons. Every check that passes lowers the depth by 30. When all six pass, the depth is 0 and the engine wakes up.

## The idea

Each correct summons gives exactly one -30 step, and each summons is only 12 bits (4096 possibilities). So I can attack one position at a time:

1. Keep the other numbers fixed.
2. Try all 4096 values for the current position.
3. Run the real emulator each time and look at `sleep_depth`.
4. If the depth drops, that value is correct. Fix it and move to the next position.

That is only about 6 x 4096 = 24,576 runs. The emulator runs in about a millisecond, so this is quick.

## The script

```python
import subprocess
from concurrent.futures import ThreadPoolExecutor

def run(args):
    o = subprocess.run(
        ['./prahara_emu', 'firmware.rom'] + [str(x) for x in args],
        capture_output=True, text=True).stdout
    return int(o.split('sleep_depth=')[1].split()[0])

cur = [0] * 6
best = 180

for i in range(6):
    def f(v):
        a = cur[:]
        a[i] = v
        return v, run(a)

    with ThreadPoolExecutor(8) as ex:
        res = list(ex.map(f, range(4096)))

    good = [r for r in res if r[1] < best]
    print(i, good)
    if good:
        cur[i], best = min(good, key=lambda r: r[1])

print(cur, best)
```

## Result

For every position there was exactly one value that lowered the depth:

| Position | Value | Sleep-depth after |
|----------|-------|-------------------|
| b0 | 1799 | 150 |
| b1 | 2879 | 120 |
| b2 | 1995 | 90 |
| b3 | 183 | 60 |
| b4 | 3623 | 30 |
| b5 | 2273 | 0 |

So the summons is:

```
[1799, 2879, 1995, 183, 3623, 2273]
```

## Getting the attestation

I ran the real emulator with these numbers:

```
./prahara_emu firmware.rom 1799 2879 1995 183 3623 2273

awake=1
sleep_depth=0
garjana=
tag=a5f66ca0adfe80c20447b6bfa7a4b509e9b7ac5132d7acbda89d96b3a337f887
```

`awake=1` and `sleep_depth=0`, so the engine is awake. The `tag` is the attestation.

## Submitting

```
curl -X POST http://130.210.48.10:9013/lanka/awaken \
  -H 'Content-Type: application/json' \
  -d '{"summons":[1799,2879,1995,183,3623,2273],"attestation":"a5f66ca0adfe80c20447b6bfa7a4b509e9b7ac5132d7acbda89d96b3a337f887"}'
```

The gate accepted it and returned the flag.


