---
title: "A Place Forgotten"
date: 2026-09-20T16:09:00+05:30
description: "Geolocating a single unlabeled photograph of a museum entrance to a mining settlement in central Kazakhstan, using signage translation and administrative-border verification."
category: "OSINT"
ctf: "Lunar CTF Quals"
difficulty: "Easy"
points: 80
flag: "Lun4R{zhezdy_ulytau_kazakhstan_48.06_67.06}"
author: "Reshma Al (Coldcoffee)"
tools: "Google Lens, Yandex Images, TinEye, Yandex Maps, 2GIS, Wikipedia"
tags:
  - "OSINT"
  - "Lunar CTF Quals"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>Lun4R{zhezdy_ulytau_kazakhstan_48.06_67.06}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('Lun4R{zhezdy_ulytau_kazakhstan_48.06_67.06}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Challenge
A single photograph, no filename, no metadata, no description: a pale stone building with arched openings, carved wooden doors, a railing and ramp at the entrance, and a pile of dark rock off to one side. The prompt ties the place to "an industry that left physical traces across an entire region," and asks for a flag shaped `place_region_country_latitude_longitude`, coordinates in decimal degrees to 2 places.

---

## 2. Reading the Image Before Searching
With no metadata to lean on, every visual detail has to earn its keep: pale pinkish-beige dressed stone, three small arched openings plus a taller central portal, ornamental carved wooden doors, a whitewashed neighboring wall with a corrugated roof, bare deciduous trees and dry ground suggesting a dry continental climate in late winter or early spring. The rock pile next to the entrance, combined with "an industry that left physical traces across a region," points at mining or metallurgy. The stone architecture and climate narrow the search toward Central Asia, the Caucasus, or the Black Sea steppe — a hypothesis, not yet a location.

---

## 3. Reverse Image Search, and a Wrong Turn Worth Keeping
Running the photo through Google Lens, Yandex Images, and TinEye (Yandex tends to perform best for post-Soviet locations), combined with the challenge confirming it's a museum, narrowed things to mining and metallurgy museums. My first candidate was the Zhezkazgan Historical and Archaeological Museum — a major copper center in the right part of the world, with roots in the local mining combine — but it was a theme-based guess with nothing visual to back it up, and its entrance didn't match. Comparing a candidate against the photo before committing is the entire point: a plausible theme isn't a match.

---

## 4. The Breakthrough: Reading the Signage
A second image of the same building showed its entrance signage clearly, in Russian:

> КГКП Управления культуры, архивов и документации Карагандинской области. Музей истории горного и плавильного дела в посёлке Жезды имени Макена Торегельдина.

Translated: the Karaganda Region Department of Culture, Archives and Documentation presents the Museum of the History of Mining and Smelting in the settlement of **Zhezdy**, named after Maken Toregeldin. The arches, stone facing, and carved doors match the photo exactly, and a bust in front of the entrance confirms it's the same building. This single piece of text gave the museum, the settlement, and the country all at once — and explains the rock pile, since the museum's grounds hold open-air mining exhibits.

---

## 5. Confirming the Place
Checking the background of Zhezdy against the prompt's "industry that left physical traces across an entire region": the settlement began in 1942 beside a manganese deposit discovered by geologist Kanysh Satpayev, was originally called Marganets ("Manganese"), renamed Dzhezdy in 1962, and took its current spelling Zhezdy in 1993. The museum itself was established by a 1988 decision and opened in 1994, with large open-air exhibits across roughly 3 hectares — manganese and copper mining and smelting across central Kazakhstan, exactly as described.

---

## 6. Getting the Region Right
The sign names Karaganda Region, but Ulytau Region split off from Karaganda Region in June 2022, and Zhezdy now sits in Ulytau District, Ulytau Region. Since the challenge describes the present-day location, I used `ulytau` rather than the sign's older `karaganda`. Administrative borders shift, and an old caption can mislead if you don't check the current date.

---

## 7. Coordinates
A geographic listing gives the settlement's position as 48°03'48" N, 67°03'17" E, which converts to roughly 48.06, 67.05 in decimal degrees. The flag that was accepted used **67.06** for longitude — the museum's own map pin sits slightly east of the village-centre figure, so the coordinates need to come from the museum's exact pin on Google Maps or Yandex Maps rather than a town-centre listing. (For reference, the manganese mine itself sits a few kilometres further out, around 48.05, 67.08 — close, but not the right point.)

---

## 8. Flag
```
Lun4R{zhezdy_ulytau_kazakhstan_48.06_67.06}
```

---

## 9. Takeaways
- Write down every visible detail first — materials, architecture, climate, and vegetation each rule things out before any search begins.
- Read all visible text, in any script. A few Cyrillic letters pointed straight at the right region.
- Don't commit to a theme-based guess. The right country with the wrong museum is still wrong.
- Check administrative borders against the current date — regions get split and renamed.
- Pull coordinates from the exact landmark's map pin, not a settlement-centre figure; rounding to two decimals is sensitive enough that the difference matters.
