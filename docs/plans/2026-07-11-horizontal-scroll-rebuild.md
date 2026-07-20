# Horizontal river rebuild

Ocean: "the scroll is super stuttering. could you review other docs and check
if there's other codes that's affecting the horizontal scroll? we need to strip
them and re-build from the ground up"

## Findings

- Round 15 left `scroll-snap-type: x mandatory` and `scroll-snap-stop: always`
  in Site CSS after the Round 15c JavaScript stepper was removed. DEPLOY.md
  already records that small trackpad deltas rubber-band back to the current
  item. This is the primary stutter mechanism.
- The bodycopy's tweezer overlay uses a capture-phase `scroll` listener on
  `window`, so horizontal scrolling in every river schedules overlay geometry
  work. Only the Touchbaes river can actually move the game iframe relative to
  the overlay.
- No wheel handler, `scrollLeft` animation, `scrollTo`, or smooth-scroll code
  remains in the current bodycopy after Round 15d.

## Rebuild

1. Use native `overflow-x:auto` only. Explicitly disable snap and smooth
   behavior; keep hidden scrollbars and the existing geometry.
2. Remove the global descendant-scroll listener from the tweezer overlay.
   Listen only to the Touchbaes river that contains the game iframe.
3. Reload the Cargo editor and verify: no stepper, no snap, no global scroll
   capture, all rivers still overflow horizontally, offset geometry persists,
   and the tweezer script remains present.

Draft only. Never publish.

## As built

- Completed all three phases in the Cargo draft.
- Reload verification passed for both the full global CSS document and the
  page bodycopy; exact evidence is recorded in DEPLOY.md Round 15e.
