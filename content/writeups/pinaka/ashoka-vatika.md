---
title: "Ashoka Vatika"
date: 2026-11-03T18:00:00+05:30
description: "Triangulating satellite orbital telemetry and unmasking chronolocation timestamps through shadow analysis."
category: "OSINT"
ctf: "Pinaka CTF 2026"
difficulty: "Hard"
points: 500
flag: "PINAKA{4shoka_v4tika_tr1angulat3d_past_r0lling_shutter_and_cl0ck_sk3w}"
author: "Reshma Al (Coldcoffee)"
tools: "Google Earth Pro, SunCalc, Python 3, ExifTool"
tags:
  - "OSINT"
  - "Pinaka CTF"
  - "Pinaka 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>PINAKA{4shoka_v4tika_tr1angulat3d_past_r0lling_shutter_and_cl0ck_sk3w}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('PINAKA{4shoka_v4tika_tr1angulat3d_past_r0lling_shutter_and_cl0ck_sk3w}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


**CTF:** PINAKA · **Category:** OSINT / Geospatial (Indrastra) · **Points:** 500
**Flag:** `PINAKA{4shoka_v4tika_tr1angulat3d_past_r0lling_shutter_and_cl0ck_sk3w}`

## The task in one line

The validator wants a JSON with three things:

1. which garden is the real one (`garden_id`, 0 to 5)
2. how to convert the city map into the surveyor's frame F (`M`, `t`, `z_off`)
3. where the key camera (image 10) was standing and which way it faced (`pose`)

F is simple: the origin is landmark L0, +x points toward L1, and z is up.

## Chapter 1: Which garden? (three clues)

The zip had watchtower logs, a supply route table and 6 candidate gardens. No single clue was enough, but together they were.

- **Clock skew.** The towers' clocks are off. A calibration flare is fired from the gate at t = 0 and the speed is 3 m/s. So "recorded time minus distance / 3" gives each tower's error:
  - Tower 0: +0.37 s
  - Tower 1: -0.52 s
  - Tower 2: +0.21 s

  After fixing those clocks, the garden flare fits both garden 2 and garden 3. Garden 3 has weird coordinates (72.3308, 41.8797), so it is a decoy built to sit on the same curve.
- **Supply routes.** One road has the time -999, which is obviously broken. The measured trip time of 165.0 matches garden 2 exactly. Garden 4 is the near miss at 165.6.
- **Elevation.** Later, when I measured the garden height from the photos, it came out around 17.14 m. Garden 2 is 17.15 m.

Only garden 2 survives all three, so `garden_id = 2`.

## Chapter 2: Opening the broken survey file

`survey_project.pinx` is a binary file and it is damaged on purpose:

- The header mixes little-endian and big-endian numbers.
- The camera focal lengths are zeroed out.
- The stored 3D points are noisy and about 6% too big.
- Image 10 (the key one) has an empty pose.

**Lesson:** ignore the stored 3D points and trust the pixels. The pixel positions (u, v) of each landmark in each photo are the clean data.

## Chapter 3: Making the photos agree

I fitted all the cameras to the pixel positions of the 40 landmarks. At first the error stayed at about 4 px, which was too high. Then I added lens distortion and it dropped to under 1 px, with a focal length near 2650 px.

## Chapter 4: The city to F conversion

With the cameras good, I compared the city coordinates with the real positions. The conversion turned out to be a mirror plus a uniform scale, which means the city map is flipped. The error was about 2 cm, so I was sure.

Then I locked it to F:

1. Scale = 105.0156 / (distance L0 to L1 in the city map) = 0.421692
2. Rotate the mirrored map so L1 lands on +x.
3. Shift so L0 is at the origin, and set `z_off` = -(height of L0) = -2.0474.

```json
"transform": {
  "M": [[-0.084516, -0.413136], [-0.413136, 0.084516]],
  "t": [15.772555, 295.15719],
  "z_off": -2.0474
}
```

## Chapter 5: Where was the camera?

- `lidar_key.bin` is called a "camera frame" file, but its 14 points are centred on zero. They are actually the garden template (the garden's own little coordinate system), and they match the garden points from the photos to about 2 cm. That is the frame the pose has to be in.
- Image 10 was taken while the camera was turning, so it has **rolling shutter**. Each row of the picture is taken a moment later than the one above. Modelling that cut its error from 3.4 px to 0.8 px.
- Solving the camera from the landmarks and the garden points, then moving into the template frame, put it about 62 m from the garden and about 28 m above it. That matches the stated altitude (44.9442 m) minus the base elevation (17.15 m).

## Chapter 6: Getting the validator to say yes

The validator only replies "not accepted", with no hint about which field is wrong. The doubts left were about the pose: which way the camera axes point, which row of the rolling-shutter image counts as "the" pose, the scale, and whether the quaternion should be stored as template <- camera or the other way round. So I wrote a script (`brute.py`) that tried 360 variants and stopped at the first one the validator accepted.

**Variant 76 won:** rolling-shutter pose at the middle row, template frame, lidar scale, OpenCV camera axes, inverse quaternion, wxyz order, baseline-scale M. In plain words, the validator wants the quaternion that turns the template frame into the camera frame, even though the page labels it the other way round.

![brute.py output: variant 76 accepted, flag returned](images/brute_output.png)

*brute.py output: variant 76 accepted, flag returned.*

The accepted submission:

```json
{
  "garden_id": 2,
  "transform": {
    "M": [[-0.084516, -0.413136], [-0.413136, 0.084516]],
    "t": [15.772555, 295.15719],
    "z_off": -2.0474
  },
  "clock_skews": [0.37, -0.52, 0.21],
  "pose": {
    "C": [29.813, -47.1995, 27.9659],
    "quat": [0.503569, 0.817693, 0.236977, -0.147099]
  }
}
```

