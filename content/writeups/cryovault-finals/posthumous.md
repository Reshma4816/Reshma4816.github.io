---
title: "Posthumous"
date: 2026-10-12T14:30:00+05:30
description: "Replay a discarded native cleanup routine by loading the app's own JNI library at its exact captured address behind a fake JNIEnv, rather than reverse-engineering eight state machines by hand."
category: "Mobile Security"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{47d39b16109ab778ae92bdf7d02bea9030525849e61cad16}"
author: "Reshma Al (Coldcoffee)"
tools: "jadx, readelf, objdump, pyelftools, ctypes, cryptography"
tags:
  - "Mobile Security"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{47d39b16109ab778ae92bdf7d02bea9030525849e61cad16}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{47d39b16109ab778ae92bdf7d02bea9030525849e61cad16}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. What Actually Happened in the App
`Posthumous.apk` is a small Android app backed by a native x86-64 JNI library. It builds a randomized object graph, runs some simulated native allocations, writes a diagnostic snapshot to disk, and then calls a cleanup method whose 72-byte return value — the real "delivery material" needed to decrypt a separate envelope — is immediately thrown away. `capture.bin` is a snapshot taken exactly one line **before** that discarded cleanup call. The entire challenge is: replay the discarded cleanup on the captured state, recover the 72 bytes, and use them to decrypt `delivery.enc`.

---

## 2. Why Replaying Beats Reverse Engineering
The native library drives eight distinct state-machine/finalizer pairs, called back into deterministic Java logic through JNI. Fully reverse-engineering all eight by hand is possible but slow and error-prone. Since the actual compiled library ships in the APK, and the capture records the exact native heap state, the faster and more reliable path is to **run the real native code itself** — loaded at its own captured virtual address, with a small fake JNI environment standing in for the Android runtime, rather than reimplementing its logic from disassembly.

---

## 3. Parsing the Capture
`capture.bin` is a small custom container holding two sections: a big-endian "object export" describing the app's Java-side object graph (key objects, a parent-linked value stack, and "T" objects each carrying a native handle, an id, and some state), and a native arena dump — the actual raw bytes of the library's heap at the moment of the snapshot, prefixed with the arena's own base address, used length, a pointer into the library's code, and an allocation counter.

Reading the Java side closely explains exactly what the discarded cleanup call needs to do: finalize every "ownerless" object first (sorted by id), release ownership subtrees in a specific child order, then loop up to 1000 times advancing all the native state machines together until four designated "root" objects all report completion — at which point the return value is built from each root's collected native output word, a running accumulator value, and each root's own counter, all packed big-endian.

---

## 4. Recovering the Library's Load Address
The native arena dump deliberately includes the address of a specific, known function inside the library as one of its header words. Since that function's offset within the compiled file is also known from static analysis, subtracting the two gives the library's exact load base at capture time — confirmed independently by checking that every function-pointer pair stored throughout the captured heap resolves to the correct, matching pair of real function offsets once that base is applied.

---

## 5. Replaying the Native Code Directly
With the load address known, the actual replay setup is: `mmap` a region at that exact address, copy in the library's loadable segments from the file, and manually apply its relocation table (both the "relative" relocations and the handful of PLT-resolved libc symbols it needs); `mmap` a second region at the arena's own captured address and copy in the dumped heap bytes; set a few known global variables inside the library (arena pointer, used length, allocation counter); and build a minimal fake JNI function table whose only two populated slots are the one the library uses to call back into Java logic, and one that always reports "no pending exception."

The callback slot is wired to a small Python re-implementation of the app's deterministic Java method — a splitmix64-style finalizer mixed with a rotating accumulator and a per-object value stack lookup, reconstructed directly from the decompiled bytecode. With all of that in place, calling the library's own exported functions in the right order (first finalizing orphaned objects in the correct sorted order, then looping the state-machine-advance function until all four roots report done) reproduces exactly what the discarded cleanup call would have returned — using the real compiled logic throughout, not a reimplementation of it.

---

## 6. Recovering the Material and Decrypting
The replay converges after a modest number of rounds, and packing the nine resulting 64-bit values together (four root outputs, the accumulator, then four root counters, all big-endian per the app's own serialization) gives the 72-byte delivery material. Feeding that into the stated envelope recipe — HKDF-SHA256 with the material as input keying material, a provided salt and info string, feeding AES-256-GCM with a provided nonce and an AAD equal to the SHA-256 of the capture file itself — decrypts `delivery.enc` cleanly, with the GCM tag verifying the entire chain end-to-end.

**Flag:** `isfcr{47d39b16109ab778ae92bdf7d02bea9030525849e61cad16}`

---

## 7. Takeaways
- When a native library's own compiled code is available, loading and running it directly at its original address — rather than reverse-engineering and reimplementing its logic — is often both faster and strictly more reliable, since it sidesteps any chance of subtly misunderstanding a state machine's behavior.
- A captured heap snapshot that includes an absolute pointer into a library's own code is a free, exact anchor for recovering that library's load address, far more reliable than guessing or brute-forcing it.
- Faithfully replaying discarded program state requires getting every detail of the replay environment right — exact memory addresses, correct relocation handling, and a JNI shim that matches only the specific function-table slots actually exercised, since getting any of these wrong tends to fail loudly rather than silently.
- Authenticated encryption at the very end of a multi-step native-replay chain is what actually proves correctness — a GCM tag verifying confirms every earlier step (address recovery, relocation, callback modeling, output serialization) was exactly right, not just plausible.
