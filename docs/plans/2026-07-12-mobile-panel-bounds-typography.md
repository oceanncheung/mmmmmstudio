# Mobile control panel bounds and typography

Date: 2026-07-12
Status: approved for Cargo draft implementation

## Ocean's instruction

> "This sounds like a plan. Let’s go with it."

> "The word control is always in sans where it should be changing with the
> theme’s current chosen typeface. The pencil edit button: when the control
> panel is opened (meaning the button is chosen/clicked), the pencil should be
> color filled with its inverse color as strokes (color obviously depend on
> the theme color change). Also right now on the control panel the font size
> slider doesn’t have the font change as well and I think they have the same
> font size on both sides need fixing."

> "Let’s have the pencil icon after the word control panel and before the
> smily face"

## Implementation

- Keep the 390px Figma sheet edge-to-edge through 430px.
- Cap compact panel width at 430px. At wider compact viewports, move the
  remaining width outside the panel and align the tray toward the right edge.
- Keep the normal content-driven panel at roughly 273px high and cap portrait
  coverage at 48svh. Reflow the typeface and shape rows side-by-side below
  560px viewport height, targeting roughly 212px plus safe-area constraints.
- Keep 44px hit targets and the established optical sizes: 24px swatches,
  14px/28px slider labels, 26px typeface artwork, and 36px shape artwork.
- Explicitly give the portaled dialog `--font-family-base` inheritance and a
  local Cargo font-scale fallback. The panel title and slider labels must
  respond to all four face modes.
- Preserve Cargo's native `pencil-3` glyph. In the open state, fill its native
  compound path with theme ink and trace it with the theme background so the
  selected treatment inverts correctly for every color pairing.
- Reorder the compact introduction cue to: `control panel`, pencil, smiley.
- Advance the panel runtime guard to `responsive-31` in both mirrors.

## Verification

- Local: 320x568, 390x844, 430x932, 480x900, 768x1024, 844x390, and 1024x900.
- Confirm width is viewport-bound through 430px and exactly 430px afterward.
- Confirm portrait panel coverage is at most 48svh and short landscape uses
  the three-row reflow without reducing 44px targets.
- Test serif, sans, mono, and gothic: title and slider labels share the active
  family; slider labels remain optically distinct at 14px and 28px.
- Test white, girly, quirky, contrast, and black with the panel open: native
  pencil fill equals theme ink and its stroke equals theme background.
- Confirm intro order and zero page-level overflow.
- Deploy local bodycopy and managed CSS to Cargo draft only. Reload and repeat
  the computed-style checks. Never publish this round.
