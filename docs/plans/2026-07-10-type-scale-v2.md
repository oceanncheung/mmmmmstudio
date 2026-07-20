# Type Scale v2 — ground-up rebuild (Figma variables + Cargo tokens)

Status: EXECUTED 2026-07-10 with M base = 22 (Ocean: "let's do 22") — see
section 6 for the as-built table; sections 3-5 kept as the original proposal.
Author: Claude, 2026-07-10. Trigger (Ocean, verbatim): "i also feel like the
whole typeface scale could bump up. for what now the medium is, it should be
between medium and large. [...] the default should still stay at medium [...]
small should be somewhere between the small and medium of current version.
medium should be something between medium and large of current version. [...]
i do think we need to build the font system from the ground up i dont really
like our version right now."

## 0. Two questions Ocean asked, answered

**"Should we update Figma to reflect how Cargo is looking (line spacing)?"**
Yes. Cargo is the product and the look he approved; Figma's Type Scale
variables are stale (still the 18/24-era base sizes, lh/base M=24 vs live 22).
Rather than a separate sync pass, this rebuild kills the drift in one stroke:
the new system's line-height RATIOS are taken from Cargo's current look
(body ~1.146, caption ~1.143, heading ~1.222 at M), applied to the new sizes,
and written to BOTH Figma variables and Cargo tokens. After this, Figma ==
Cargo by construction.

**"We have a baseline setting, increment 8pt I think — do we need a new
baseline system?"** What actually exists: (a) the old 24px baseline grid —
already deliberately retired (2026-07-06, "looks loosen", lh moved to ~1.15);
(b) the Space token ladder 4/6/8/16/24/32/40/64/128/192/256 — that is
SPACING, not a type baseline, and it is size-independent. Recommendation:
**no new baseline system.** Line heights follow the ratio rules below,
rounded to whole px. The Space ladder stays untouched (component gaps like
the 8px desc gap don't care about font size). If true vertical rhythm is ever
wanted back, that is a separate decision — and it would fight the tight 1.15
feel Ocean prefers, so I advise against it.

## 1. Current state (serif reference; Cargo live = the look Ocean likes)

| scale | caption | base | heading |
|---|---|---|---|
| S | 12/14 | 16/19 | 28/34 |
| M (default) | 14/16 | 19.2/22 | 36/44 |
| L | 18/20 | 24/28 | 56/64 |
| XL | 24/27 | 32/38 | 72/82 |

Figma "Type Scale" collection is STALE vs this table: font/size/base M=18
(not 19.2), font/lh/base M=24 (not 22), font/lh/heading M=48 (not 44).
Only font/lh/caption (14/16/20/27) is current. Face variants exist as
variables: `*-sans` (x0.966), `*-mono` (x0.90); gothic ALIASES the serif
vars (keep that mechanism — it is correct).

Known unbound stragglers on the Figma canvas (bypass variables, need the
sweep in Phase F3): the montran map-caption "blurb" (explicit 14/lh18);
the Project Description component master (title/blurb/url 18/24, tagline
14/16 — check whether master text is variable-bound; if not, bind the
MASTER once and all band instances follow).

## 2. Generative rules for v2 (the "system", not just numbers)

1. **Serif is the reference.** Derived faces (x-height normalization,
   unchanged): sans = serif x 0.966, mono = serif x 0.90, gothic = serif.
   Round to 1 decimal. Gothic stays an ALIAS in Figma.
2. **Roles derive from base**: caption = base x 0.73, heading = base x 1.875
   (both are the current M proportions Ocean has been approving all week —
   the sizes shift, the optics don't).
3. **Scale ladder**: keep the current progressive ratio shape
   (S->M x1.2, M->L x1.25, L->XL x1.333) but shift the whole ladder up a
   half-step, anchored at **new M base = 21.6** (geometric mean of current
   M 19.2 and L 24 — "something between medium and large").
4. **Line heights**: ratio rules from Cargo's current look — body x1.146,
   caption x1.143, heading x1.222 — rounded to whole px. No grid snapping.
5. **Default stays M** (panel slider default unchanged).

## 3. Proposed number table (serif; THE thing Ocean approves/tweaks)

| scale | caption | base | heading |
|---|---|---|---|
| S | 13/15 | 18/21 | 34/41 |
| M (default) | 16/18 | 21.6/25 | 40/49 |
| L | 20/23 | 27/31 | 51/62 |
| XL | 26/30 | 36/41 | 68/83 |

Sanity vs Ocean's brief: new S base 18 sits between old S 16 and old M 19.2;
new M 21.6 between old M 19.2 and old L 24; new L 27 between old L 24 and
old XL 32; new XL 36 extends the ladder (and equals the old M heading).
New M caption 16 ~ old L-ish; new M heading 40 between old M 36 and old L 56.

Derived faces at M (formula applies to every cell): base 21.6/20.9/19.4/21.6
(serif/sans/mono/gothic), caption 16/15.5/14.4/16, heading 40/38.6/36/40.

Tunable knobs at review: M base 21.6 could snap to 21 or 22 (21.6 = 1.35rem,
keeps the Cargo-rem lineage of 19.2 = 1.2rem); heading rounding (40 vs 41);
caption XL 26 vs 27. Ocean's first instinct ("small can become what the
current medium font is") would make S base 19.2 instead of 18 — flagged as
ALT-A; he then said "somewhere between", which 18 satisfies.

## 4. Execution — Figma first (per Ocean: "create a whole new system on
## figma and have cargo to reflect"), then Cargo, same session

### Phase F (Figma, file aaJEv2Z8j6HaegMHou4N09)
- F1. Update "Type Scale" collection variables via setValueForMode, all 4
  modes (Medium 4:4, Small 51:4, Large 51:5, XL 51:6):
  font/size/base 5:26, font/size/caption 5:27, font/size/heading 41:312,
  font/lh/caption 51:271, font/lh/base 51:272, font/lh/heading 51:273,
  plus the six `-sans` / `-mono` size variables (117:253-255, 121:253-255)
  with the derived values. Gothic aliases (117:256-258) untouched.
  Pure variable-value edits worked with Serif=TNR live on 2026-07-10
  (lh/caption sync) — expect no font-load gate. IF any call throws the
  unloaded-font error, flip Serif->Tinos first (workflow in project
  CLAUDE.md), batch, flip back.
- F2. Component masters: verify Project Description master text binds
  size/lh to the variables; bind if raw (this is a TEXT-node edit -> needs
  the Tinos flip). Same check for intro/heading/panel components.
- F3. Sweep unbound text: findAll TEXT on pages main + libraries where
  fontSize in {12,14,16,18,19.2,24,28,32,36,56,72} and no boundVariables —
  produce a list, rebind/update each (Tinos flip session), per the
  "component updates must be propagated" rule. Known: montran blurb 14/18.
- F4. Screenshot spot-check of the rework frame at all 4 modes.

### Phase C (Cargo)
- C1. Regenerate the four `[data-scale]` blocks in local tokens.css from the
  table (16 size values x 3 roles + 3 lh per row; faces from the formula).
- C2. Splice into Cargo Site CSS region 2 (TOKENS) via the CodeMirror recipe
  (PLAYBOOK 3.2; nudge + 2.5s wait before Escape).
- C3. Panel exception (DECISION for Ocean): the panel face buttons/title are
  SIZE-LOCKED fixed px (14/13.5/12.6/14, title 18) so they don't ride the
  slider. Default proposal: bump the locks to the new M caption set
  (16/15.5/14.4/16, title 20) so the panel matches the new optics.
- C4. Verify matrix live (single JS pass, no rAF in hidden tabs): 4 scales x
  4 faces computed fontSize/lineHeight on base/caption/heading probes ==
  table; 5-theme spot; mobile (<=760) spot via editor mobile toggle;
  reload -> re-verify (persistence); axes reset to white/serif/m/straight.
- C5. Reflow check at M: intro col-4 line wraps, desc plate height, caption
  3-line fit in the montran tile (new caption 16/18 -> 3 lines = 54px — the
  tile absorbs it, gap drops 14->8, still bottom-anchored), rail link
  wrapping, clock overlap. Screenshot evidence at 1440-equivalent.

### Phase D (docs)
- DEPLOY.md round entry; PLAYBOOK section-1 type matrix + 3.4 recipe values;
  project CLAUDE.md status; tokens.css header comment (new source-of-truth
  table + date).

## 5. Risks / notes
- Cargo's own Bodycopy rem (19.2 = 1.2rem) no longer anchors anything —
  our CSS fully overrides; the 21.6 = 1.35rem lineage is cosmetic.
- Reflow: +12% M body size shrinks the effective measure; col widths are
  --u-based and unchanged — expect ~1 extra wrapped line per paragraph.
  If the intro gets too tall, that is a layout decision, not a token one.
- The XL heading 68/83 is large on 1440 — check the intro at XL before
  sign-off (C5 covers it).
- Panel geometry (row heights 20/24/32/36) is spacing, NOT type — untouched.
- Mobile uses the same type tokens (only --u changes) — C4 covers it.

## 6. AS EXECUTED — 2026-07-10, same session (Ocean: "let's do 22")

Final serif table (M anchored at 22; S/L/XL anchors kept, ratios stay
progressive 1.222/1.227/1.333):

| scale | caption | base | heading |
|---|---|---|---|
| S | 13/15 | 18/21 | 34/41 |
| M (default) | 16/18 | 22/25 | 41/50 |
| L | 20/23 | 27/31 | 51/62 |
| XL | 26/30 | 36/41 | 68/83 |

- F1 done: 12 variables x 4 modes, 0 errors, no Tinos flip (float edits are
  TNR-safe). F2/F3 findings: desc master + montran blurb were ALREADY
  variable-bound — canvas self-updated; only unbound old-size texts are the
  two slider "a-max" 28px glyphs (panel iconography, locked by design, left
  as is). Sweep clean.
- C1-C4 done: Cargo token blocks + banner replaced; panel locks bumped
  (buttons 16/15.5/14.4/16, title 20; slider a's stay 14/28); full matrix
  verified post-reload (every cell exact); axes reset; strays 0.
- Consequence handled: montran caption width 516 -> 526 (16px text needs a
  500px box for the 3-line wrap, per Figma's own hug reflow 493->500).
  Caption->image gap now 8 = Figma-exact.
- NOT published — Ocean reviews and cmd+P.
