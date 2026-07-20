# Phase 1 capture log

All external-system actions in this log were read-only.

| Capture | Method | Result |
|---|---|---|
| Repository and stable versions | Local Git plus read-only GitHub API/CLI queries | Branch, refs, strict `git fsck`, immutable releases, rulesets, Round 69 protection, and Round 80 parity recorded |
| Local Cargo sources | Canonical build/validation scripts and direct hashing | All named-page, shared-component, test-mirror, site-head, and complete-CSS validations passed |
| Cargo saved draft | Authenticated Cargo API `GET` requests using the existing Dia session | Exact Home/Who/Write bodycopy, local CSS, complete global CSS, site head, and media metadata saved; no token persisted |
| Published site | HTTP/2 `GET`, header/cache/range probes, and Playwright viewport capture | Home/Write/Who responses, extracted Cargo state, screenshots, and raw console evidence saved |
| Figma | Read-only Figma bridge calls and node screenshots | Approved endpoints, variables, components, and relevant page inventories saved; full Home traversal limitation recorded |
| Freight | Public `HEAD`/`GET`, `ffprobe`, and streaming SHA-256 | 103 referenced objects reachable and hashed; 99 media objects dimensioned; payloads not retained |

The root checksum index was generated only after all capture sections and documentation were complete. Any later section refresh must follow `INVALIDATION.md`.
