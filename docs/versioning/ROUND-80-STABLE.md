# Round 80 stable baseline

Recorded on 2026-07-20 as the next stable MM.S version after the protected
Round 69 gold baseline.

## Identity

- Published release label: Round 80.
- Shared runtime: `responsive-70` on Home, Who, and Write.
- Head marker: `data-mms-ios-edge-head="49"`.
- Home inventory: 68 unique media IDs; V7 6/6; Touchbaes 7/7.
- Expanded Home: 12 desktop scrubbers and zero page-level overflow.
- Pointer exit: normal 8px scrubber thumb with 1px border and no retained
  focus.
- Keyboard focus: separate 10px thumb with 2px visible border.

## Important implementation note

Round 80 is a verified composite release. Canonical `cargo/panel.js` uses
`control.blur()` for pointer interaction, but Cargo retained the previous
inline bodycopy handler during publication. The deployed `cargo/site-head.html`
therefore includes one narrowly scoped pointer-only blur safeguard. Keep that
safeguard until a future public bodycopy is independently proven to contain
the canonical blur implementation.

## Canonical local hashes

| Artifact | SHA-256 |
| --- | --- |
| `cargo/tokens.css` | `70178291f00dfeacaae9fc7c0fde2d7f444cb26456d969b7d2523d0274a71d98` |
| `cargo/site.css` | `c47485c1c3b55fc6b5cb577a7ad3c2115cd2cb6fdc7f3f1261ef20ae6a51f6f1` |
| `cargo/panel.js` | `a5e7f492f987804df0b1ea999ae4d25aeabf49dbe81c39e6749cb8cfd9f68987` |
| `cargo/site-head.html` | `d677c1a7e81a20482d1aa02959284f51775f0fe39411521ef91d9a972657fd56` |
| `cargo/home.template.html` | `cbe9b02a07759db7490e5f8690215331fc082474987aa0188d393a26b98a7b34` |
| `cargo/home.html` | `6d5b6f84023ac825fda7ef4934cbdb470ccd210013905a766a3d6744b00e1d32` |
| `cargo/who.html` | `d15ae1d4af733983a70f3182e8374b5daad0d54301e9e713783c26976dbbe383` |
| `cargo/write.html` | `58bfea2fa9b1ea37351cd0205d661aa7d9235dbc92f49699201b99aacad91ef2` |
| `cargo/test.html` | `3c4fbcec48707a024225a86cfe2d89cc37d91bbd50d349d547d10b6e2bd7fba5` |

The immutable Round 69 files remain in `cargo/gold/round-69/` and are not
modified by this baseline.
