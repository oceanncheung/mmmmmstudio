# Phase 3 product, UX, and visual-direction findings

This is a read-only design-director review of the post-Round-80 MM.S source, current published-route evidence, frozen Figma references, and the existing Phase 3 technical findings. It does not authorize Cargo, Figma, or public-site changes.

Machine-readable evidence: `audit/findings/evidence/2026-07-21-phase3-ux-summary.json`.

## Anti-pattern verdict: strong pass

MM.S does **not** read like an AI-generated agency template. Its browser-default links, raw outlines, irregular text blocks, deliberately large whitespace, asymmetric media starts, variable image proportions, and blunt editorial copy form a coherent authorial system. It avoids the familiar AI tells: no generic card grid, hero metrics, glass surfaces, gradient text, icon-over-heading feature rows, testimonial carousel, or rounded conversion panel.

The independent deterministic scan corroborates that judgment:

```text
npx --yes impeccable --json \
  cargo/home.template.html cargo/write.template.html cargo/who.template.html

impeccable 3.2.1
exit 0
findings []
```

The scan is markup-pattern evidence, not proof of runtime usability. Its clean result means the remediation plan should protect the established no-design character rather than “improve” it into conventional agency UI.

## Overall impression

The experience makes an unusually clear first impression: MM.S states what it does, shows personality without a marketing speech, and moves directly into work. The projects feel curated rather than templated because every river retains its own proportions and cadence. Write and Who feel like parts of the same studio without being forced into the homepage’s media grammar.

The largest product gap appears at the opposite end of that strong opening. A compact visitor can read through roughly 9,600px of work and arrive at WTW with no visible contact path. Desktop always retains Email and LinkedIn in the rail; compact mode does not. The visual ending is strong, but the primary client journey does not complete.

## Design health score

| # | Nielsen heuristic | Score | Key evidence |
| --- | --- | ---: | --- |
| 1 | Visibility of system status | 3/4 | Control selections and loading states respond; visual current-route state is absent. |
| 2 | Match between system and real world | 3/4 | Native links and scrolling are familiar; the compact plus is ambiguous without Home’s explanation. |
| 3 | User control and freedom | 3/4 | Native rivers, scrubbers, keyboard input, and Escape support work; compact ending lacks a direct next action. |
| 4 | Consistency and standards | 3/4 | Shared shell is coherent; route orientation and heading hierarchy remain incomplete. |
| 5 | Error prevention | 3/4 | Low-risk interactions are well constrained; known clipping and dead historic routes remain. |
| 6 | Recognition rather than recall | 2/4 | Compact visitors must remember contact links that disappeared near the top. |
| 7 | Flexibility and efficiency | 4/4 | Touch, trackpad, mouse scrubber, keyboard, and presentation controls coexist. |
| 8 | Aesthetic and minimalist design | 4/4 | Distinctive, focused, and free of detected generic-interface patterns. |
| 9 | Error recognition and recovery | 2/4 | Posters help media failure, but the empty 404 and dead legacy routes provide no recovery. |
| 10 | Help and documentation | 2/4 | Home teaches the controls; secondary pages and scrubbers rely on recognition. |
| **Total** |  | **29/40** | **Good foundation; repair the journey gaps without redesigning the voice.** |

The cognitive-load checklist has two failures out of eight, a moderate result:

- The open panel exposes 13 choices, although its four clear groups make this manageable and the tool is optional.
- Compact visitors must remember top-of-page contact links throughout a 13-project journey.

The long page, expressive media, and optional control panel are not inherently excessive. The real extraneous load is recall: location, project destinations, and how to contact the studio after the initial navigation has gone.

## What is working and must remain

- **The arrival works.** At 390px and 1440px, the first viewport communicates the studio, exposes Work/Write/Who and contact links, introduces the control panel, and begins EVIIVE without a generic hero.
- **Rivers have the right interaction character.** Compact users see a partial next item and retain native `pan-x pan-y`. Expanded fine-pointer users get 12 description-aligned scrubbers with track click, drag, and keyboard input, while trackpad scrolling remains native.
- **The panel is a brand idea, not settings chrome.** Theme, face, scale, and shape are visibly grouped and immediately alter the editorial surface. Its playfulness earns the space it occupies.
- **The three routes form one studio.** Work is visual and kinetic, Write is sparse and irregular, and Who moves from studio statement to people. Shared navigation and controls connect them without making them look identical.
- **The ending image is strong.** WTW is an effective final project. The approved square 504×504 second asset must remain square and unclipped.
- **Withered Green is protected motion.** Exactly four direct body paragraphs rotate through Cargo’s native `eye-roll` effect; the heading does not. The rotation is intentional and must not be treated as accidental motion or normalized away.

## P1 — The compact portfolio journey ends without a contact path

The audited compact Home is 9,611px tall. WTW ends at 9,547.09375px and the page retains the intended approximately 64px bottom padding. By that point, the compact Work/Write/Who/Email/LinkedIn block has released with the introduction. The sticky header contains only MM.S, the clock, and the control-panel plus.

That is a direct break in the stated visitor journey. A prospective client who reaches the strongest proof point has to return nearly the entire page to find Email or LinkedIn. Desktop does not have this problem because the rail remains visible.

Recommendation: add a compact-only closing echo after WTW using the existing raw Email and LinkedIn links, optionally with one short sentence in MM.S’s voice. Preserve the 64px final-space contract. Do not add a rounded CTA, oversized “Let’s work together” block, generic footer columns, or any other agency-template ending.

Decision gate: Ocean must choose between two plain links, one short contact sentence, or an explicitly intentional no-contact ending.

## P2 — Thirteen projects can only be traversed serially

Home contains 13 bands across 9,611px compact and 11,466px expanded documents. The serial rhythm is appropriate for discovery, but project bands expose only `data-band` values, not stable fragment destinations. The separate content audit also confirms that discoverable historic `/work/*` project URLs now end at an empty 404.

This makes targeted review inefficient. A client sent to “look at Montran” must scan the entire page, and no current project can be shared directly.

Recommendation: first add stable invisible fragments and map historic project paths. Only after that, consider an optional raw-text project index if Ocean wants a non-linear path. Do not replace the rivers with filters, cards, thumbnails, or a conventional portfolio grid.

Decision gate: decide whether serial editorial discovery is intentionally exclusive or whether an optional project list belongs in the experience.

## P2 — Work, Write, and Who do not show visual current location

The shared navigation correctly sets `aria-current="page"`, but every visible link uses the same default underline treatment. Home has no project headings; Write and Who have content headings but no route-level heading. A direct visitor can infer location only from the page content.

This is especially noticeable on Write: the route opens directly into “More self help books” rather than visually identifying itself as Write. The enigmatic opening is good editorially, but the navigation should still communicate where the visitor is.

Recommendation: add a visual-neutral current-link state through existing type or underline logic and repair the semantic route/project hierarchy without altering the visible layout. Avoid tabs, pills, breadcrumbs, or extra header bars.

Decision gate: Ocean must approve the visible current-link treatment. The semantic route heading can remain visually hidden if that better protects the composition.

## P2 — Random Pics interrupts the expanded rhythm through clipping

The geometry audit records Random Pics as the only repeated expanded media clip: up to 288.953125px at 1024px, 12.1875px at the default 1440px state, and 8.34375px at the widest references. The published expanded screenshot shows its caption/reel unit competing with the persistent introduction instead of reading as a clean standalone interlude.

The absence of a conventional project title is not the defect; it gives the page a useful non-work interruption. The defect is that the complete caption, 12px gap, and reel do not fit their owning band.

Recommendation: correct the band’s intrinsic expanded height while preserving the centered, untitled, offbeat interlude. Confirm the current Figma grouping before changing visible geometry.

## P3 — The compact plus is only explained on Home

Home explicitly says “Have fun with the + control panel.” Write and Who present the same plus trigger without that cue. The accessible name is already correct, so screen-reader users hear “open site controls”; this is a visual first-time-discovery issue only.

The control panel is optional, so this does not block reading. A visitor who enters directly through Write or Who may nevertheless assume the plus means add/create and miss one of the site’s defining interactions.

Recommendation: preserve the approved plus. If direct-entry testing confirms confusion, add a restrained contextual or one-time cue on the secondary pages rather than permanently labeling or redesigning it.

Decision gate: decide whether the panel should remain a discoverable surprise on Write/Who or receive a compact cue.

## River and scrubber conclusion

No interaction redesign is warranted. The current combination is directionally correct:

- touch and trackpad use native rivers;
- a visible next-item sliver teaches compact horizontal movement;
- fine-pointer desktops add a scrollbar-like proportional thumb;
- keyboard users can operate the supplemental scrollbar role;
- no wheel interception, forced stepping, snapping, or animated correction is needed.

The scrubber’s visual restraint is consistent with the site. It can look like a rule before interaction, but the proportional thumb, pointer cursor, and immediate river response are sufficient. Do not add arrows, carousel dots, floating instructions, or persistent “drag” labels unless physical usability testing finds a real failure.

## Secondary-page information architecture

Write and Who successfully avoid becoming miniature portfolio pages. Who’s expanded composition creates a useful introduction-to-people sequence by settling the founder profiles near the viewport bottom. Write’s staggered widths and whitespace feel authored rather than responsive-template driven.

Two protections are essential:

- Cargo’s five-piece Write structure is authoritative; the sixth mobile Clout instance in Figma is an accidental duplicate and must not be copied.
- Figma shows Withered Green’s static zero-degree resting endpoint. Cargo’s four rotating body paragraphs are an intentional runtime exception and must remain.

The remaining IA work is shared, not page-specific: visible current location, semantic hierarchy, project destinations, and recovery from old routes.

## Persona red flags

- **Prospective creative client:** understands the studio and range quickly, but cannot jump to a known project and reaches a compact ending without a contact path.
- **Confused first-timer:** Home explains the control panel; direct Write/Who entry leaves both the plus and current route visually ambiguous.
- **Distracted mobile visitor:** native swiping and persistent settings survive interruption, but contact navigation disappears long before the 9,611px journey ends.

## Decision order before remediation

1. Approve or reject a compact-only closing contact echo after WTW.
2. Decide whether the serial Work experience gains stable fragments only or also an optional raw-text project index.
3. Approve a minimal visible current-route treatment.
4. Decide whether direct compact entry to Write and Who needs a control-panel cue.
5. Confirm the Random Pics caption/reel grouping before its expanded height is corrected.

## Protected contracts

- Round 69 gold remains immutable.
- Preserve the personal plain-HTML/no-design identity; do not standardize it into a generic agency site.
- Browser-default links, asymmetry, variable proportions, and intentional awkwardness are not defects by themselves.
- Native rivers remain native, and expanded scrubbers remain supplemental.
- WTW `wtw-02` remains 504×504 and unclipped.
- Withered Green retains exactly four rotating direct body-paragraph spans and no rotating heading.

No Cargo or Figma content was edited, deployed, or published during this review.
