---
title: "Ghost Coordinates"
date: 2026-11-01T03:30:00+05:30
description: "Correlate a GPS track, an AIS beacon, a navigation database's audit log, EXIF metadata, and a deck logbook to separate two deliberately planted decoy locations from the real landfall."
category: "Digital Forensics"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Hard"
points: 500
flag: "FLAG{GHOST_ATOLL_14.4783S_138.2600W}"
author: "Reshma Al (Coldcoffee)"
tools: "ExifTool, sqlite3, GPX/CSV parsing"
tags:
  - "Digital Forensics"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>FLAG{GHOST_ATOLL_14.4783S_138.2600W}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('FLAG{GHOST_ATOLL_14.4783S_138.2600W}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. What's in the Evidence Bundle
This one hands over a full digital trail from the S/V Obsidian Siren: a GPS track (`navigation_track.gpx`), a `gps_history.csv`, an AIS log, a deck logbook, photo EXIF data, a SQLite navigation backup, and a scanned map. `captain_navigation_notes.txt` openly admits the captain salted the record with two separate layers of deception — and it even gives away the flag's exact template, `FLAG{<LOCATION_NAME>_<LAT>_<LON>}`, up front.

---

## 2. Ruling Out the First Decoy — the Purge Point
Both `navigation_track.gpx` and `gps_history.csv` independently terminate at the same coordinates, 14°57'S, 139°30'W. That consistency looks convincing at first — until `navigation_backup.db`'s `system_audit_log` table explains exactly why: a `TRACK_PURGE_COMMAND` followed by an `RF_JAMMER_ENGAGED` entry, timestamped 2026-10-19T22:14–22:15Z and tied to waypoint `WPT_JAM_07` ("Purge Coordinate Point"). The main GPS track doesn't just happen to stop there — it was deliberately jammed and purged at that exact spot, by design.

---

## 3. Ruling Out the Second Decoy — the AIS Diversion
A separate AIS beacon broadcast, timestamped 2026-10-18T19:40Z, points to a completely different location: -16.78, -143.12, labeled "Devil's Reef" in the logs. The same `system_audit_log` tags this one explicitly as `DECOY_TRANSMISSION`, and the corresponding waypoint `WPT_DEV_05` spells it out without any ambiguity at all: "DECOY DIVERSION: Old stash raided in 2021." Two decoys down, both self-admitting once you check the audit trail rather than trusting the track data at face value.

---

## 4. Finding the Real Route
The ship apparently carried a backup Iridium-GLONASS receiver that kept logging after the main GPS was jammed — and that's the thread that leads to the actual landfall, recorded on 2026-10-20 at **-14.478333, -138.260000**, named "Ghost Atoll" (Isla del Fantasma). The navigation database's waypoint `WPT_GST_08` ("Ghost Atoll Sanctuary", category `FINAL_CACHE`) names the flag code outright, and a separate logged route (ID `103`, "PROJECT_GHOST_COVERT") confirms the ship's true path never went anywhere near Devil's Reef at all.

---

## 5. Cross-Checking Against Every Other Source
Before trusting a single database field, I checked it against everything else in the bundle, and all of it converges on the same answer:

- `island_photo_03.jpg`'s EXIF GPS tag reads 14°28'42.00"S, 138°15'36.00"W — which converts to exactly -14.4783, -138.2600 — with a description reading "Ghost Atoll landfall. The tide opens the cavern at midnight."
- The deck logbook (`ship_route_log.txt`) records the same anchorage, independently of the digital navigation data.
- `visited_locations.csv` lists `LOC_003_GHT`, "GHOST_ATOLL_SECRET_COVE", at the same coordinates, flagged `VERY_HIGH` confidence and sourced from the stealth backup satellite receiver.
- The scanned `old_treasure_map.png` carries the target waypoint, target coordinates, an explicit warning naming Devil's Reef as a decoy, and the flag format itself, all embedded in its PNG `tEXt` metadata chunks.
- The navigation database's own audit log, which labels every entry either `DECOY` or `FINAL_CACHE` — a built-in answer key, once you know to read it.

`browser_history.sqlite` and two photos from an earlier voyage didn't factor into the final answer — their EXIF coordinates matched known earlier waypoints but added nothing decisive on top of everything above.

**Flag:** `FLAG{GHOST_ATOLL_14.4783S_138.2600W}`

---

## 6. Takeaways
- When two independent-looking sources (here, a GPX track and a separate CSV) agree on a suspicious location, that agreement isn't proof — check whether something else in the evidence set (an audit log, a system event) explains *why* they agree.
- A fabricated AIS transmission is a real-world technique, not just a CTF trope — cross-reference a beacon's claimed position against any logging system that records whether a transmission was flagged as anomalous.
- The strongest evidence in a forensics challenge is often the most boring-looking one: an audit log that just labels things `DECOY` and `FINAL_CACHE` does more work than any amount of coordinate math.
- Convert every coordinate format you encounter (DMS, decimal degrees, EXIF GPS tags) to the same representation before comparing — a match that looks almost-right in one format is either an exact match or a decoy, and converting removes the ambiguity.
