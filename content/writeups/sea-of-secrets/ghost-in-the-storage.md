---
title: "Ghost in the Storage"
date: 2026-11-01T04:00:00+05:30
description: "Recover an AES-256-CBC ciphertext from a deleted-but-unvacuumed SQLite row, pull the salt out of an unencrypted ADB backup, and assemble the PBKDF2 passphrase from two separately scattered halves."
category: "Mobile Security"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Hard"
points: 300
flag: "FLAG{d34d_m3n_t3ll_n0_t4l3s_but_fr33l1sts_d0_7a9f}"
author: "Reshma Al (Coldcoffee)"
tools: "grep, tar, zlib, PBKDF2-HMAC-SHA256, AES-CBC"
tags:
  - "Mobile Security"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>FLAG{d34d_m3n_t3ll_n0_t4l3s_but_fr33l1sts_d0_7a9f}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('FLAG{d34d_m3n_t3ll_n0_t4l3s_but_fr33l1sts_d0_7a9f}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. What's in the Evidence Tree
The archive is a full evidence pull from a Pixel 6a on Android 13, running an app called `org.blackflag.keeper`: its databases, `shared_prefs`, an image cache, logcat/dmesg output, and an `android_backup/backup.ab`. Everything under `evidence/app_data/` is duplicated in flattened form elsewhere in the tree, so there's more than one path to each artifact.

---

## 2. The Recipe, Straight From Logcat
logcat spells out the whole decryption recipe directly: AES key = `PBKDF2(<Chart_Passphrase>:<Waypoint_77_Sector_Token>, salt = master_salt_hex from crypto_state.xml, 100000 iterations)`, with a 16-byte IV stored alongside the message row. It also drops two critical hints: the on-device `crypto_state.xml` has been sanitized, so the salt has to come from somewhere else (the ADB backup), and a specific `DELETE FROM transmissions WHERE id = 4` ran while `VACUUM` was skipped — meaning the deleted ciphertext row is still physically present in the database file.

---

## 3. Pulling the Ciphertext Out of Deleted Row 4
`keeper_vault.db` still shows rows 1, 2, 3, and 5 normally. With `secure_delete` off and no `VACUUM` run afterward, row 4's cell data is still sitting in the file's free space — the `audit_log` even records Flint's `COURIER_DISPATCH_MASTER_VAULT_TOKEN` message being purged, which is exactly the clue needed to grep for it:

```bash
grep -abo 'COURIER_DISPATCH_MASTER_VAULT_TOKEN' keeper_vault.db
```

The recovered cell has sender `Capt_Flint`, recipient `The Keeper`, the subject string, then 512 hex characters of ciphertext immediately followed by a 32-hex-character IV, then the literal string `CONFIDENTIAL_PURGED`.

---

## 4. Getting the Salt Out of the Backup
`backup.ab` is an **unencrypted** Android backup — a text header ending in `none\n`, followed by a raw zlib stream wrapping a tar archive:

```bash
python3 - <<'PY'
import zlib
d = open('backup.ab','rb').read()
open('backup.tar','wb').write(zlib.decompress(d[d.find(b'none\n')+5:]))
PY
tar xf backup.tar
```

Inside, `apps/org.blackflag.keeper/sp/crypto_state.xml` still carries the real `master_salt_hex` value: `50697261746553616c74323032345661756c7421`, which decodes to `PirateSalt2024Vault!`. The on-device copy of the same file had been overwritten with `PURGED_ON_WIPE_ALERT` — confirming the backup really was the only place the salt survived.

---

## 5. Assembling the Two Passphrase Halves
- **Chart passphrase** — the image cache's journal has a `CLEAN` entry for a specific cache key, and that entry's `.1` file holds cached HTTP response headers, including `X-Cipher-Passphrase: DeadMenTellNoTales`. A second, unrelated cache entry turned out to be an irrelevant sloop-rigging chart, so it needed ruling out first.
- **Sector token** — `nav_cache.db` has a waypoint table; waypoint 77 ("San Salvador Deep Reef") carries the token `SAN_SALVADOR_REEF_1729`.

---

## 6. Decrypting
AES-256-CBC with PKCS#7 padding, key derived through PBKDF2-HMAC-SHA256:

```python
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

ct, iv = bytes.fromhex(blob[:512]), bytes.fromhex(blob[512:])

key = hashlib.pbkdf2_hmac("sha256", b"DeadMenTellNoTales:SAN_SALVADOR_REEF_1729",
                          b"PirateSalt2024Vault!", 100000, 32)
print(unpad(AES.new(key, AES.MODE_CBC, iv).decrypt(ct), 16).decode())
```

The decrypted plaintext is JSON — `vault_id: VAULT_BLACK_BEARD_ARCHIVE`, `transmission_type: MASTER_SECRET_DISPATCH` — with a `flag` field holding the answer.

**Flag:** `FLAG{d34d_m3n_t3ll_n0_t4l3s_but_fr33l1sts_d0_7a9f}`

---

## 7. The Decoys Along the Way
Three planted red herrings showed up before the real path was clear: `BlackBeardIsDead123!` (a `decoy_vault_passcode` sitting in shared preferences), `DeadDropKey2024! (Invalid)` (explicitly labeled invalid in a crew roster hint), and an unrelated Waypoint 66 entry, `ISLA_MUERTA_REEF`. None of them feed into the actual key derivation.

---

## 8. Takeaways
- `DELETE` without `VACUUM` on SQLite doesn't erase data — it just unlinks the row from the live table while the bytes stay in the file's free pages, fully recoverable with a plain byte-level search.
- Treat the on-device copy of any sensitive config file as potentially sanitized post-incident; an ADB backup taken earlier can still hold the real values, since Android backups of this kind aren't encrypted by default.
- When a key derivation needs two separate pieces, expect each one to be hidden behind a different technique (HTTP cache headers vs. a database waypoint table) — don't assume both halves are reachable the same way.
- A single app's evidence can scatter decoys at every layer (shared prefs, roster hints, unrelated waypoints); verify each candidate secret actually participates in the stated key-derivation formula before trusting it.
