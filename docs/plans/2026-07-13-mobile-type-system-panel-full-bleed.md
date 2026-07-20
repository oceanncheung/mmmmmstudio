# Mobile type system, panel interaction, and full-bleed plan

Date: 2026-07-13
Status: implemented in Cargo draft and Figma; not published

## Goals

- Give compact layouts their own S/M/L/XL type ladder while keeping expanded
  layouts on the established desktop ladder.
- Return fresh compact visits to Medium, matching the expanded default, without
  overwriting a visitor's saved choice.
- Make the compact panel grow by content at larger type scales instead of
  compressing its top and side padding.
- Close the compact panel on an intentional outside tap while allowing a scroll
  gesture that starts outside the panel to continue without dismissal.
- Match the Figma header's visible plus size and clock relationship while
  retaining an honest 44px touch target.
- Use the fullest supported iOS Safari treatment without claiming that a normal
  Safari tab can remove or make its system bars transparent.

## Implemented system

- Figma Type Scale now contains eight modes: Desktop and Mobile, each with
  Small, Medium, Large, and Extra Large.
- Mobile serif body/caption/heading values are 17/16/32, 20/17/38, 24/20/45,
  and 30/25/56, with dedicated leading. Sans, Mono, and Gothic retain their
  established optical multipliers.
- The slider set has eight Context/Scale variants. The compact control-panel
  source uses Compact/Medium; desktop uses Expanded/Medium.
- Compact panel padding and header height increase only at Large and Extra
  Large. The panel remains Hug height and retains 44px interaction rows.
- The compact plus remains visually 22/24/26/28px across S/M/L/XL inside a
  44px target. The visible clock-to-icon gap remains 12px.
- Outside click closes the open compact tray; clicks inside or on its toggle do
  not. Native click cancellation after a pan means background scrolling does
  not dismiss the tray.
- The runtime ensures `viewport-fit=cover`, uses safe-area-aware header
  padding, fixes page and overscroll backgrounds to the final theme, and sets
  `black-translucent` for standalone Home Screen mode. Normal Safari tabs keep
  Apple-controlled system chrome.

## Verification contract

- Local matrix: 320, 390, 430, 431, 600, 760, 768, 1023, and 1024px.
- Compact fresh default is Medium at 20px serif body; expanded is Medium at
  22px serif body.
- Compact panel heights are 221/221/229/237px for S/M/L/XL, including border.
- Full-width mode has no side borders; bounded modes retain them.
- Outside scroll keeps the panel open; outside tap closes it.
- Cargo draft CSS and bodycopy must survive a real editor reload before the
  round is considered saved.

