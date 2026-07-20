# touchbaes sticker room

Files:

- `index.html` is the normal static version. It references the lightweight WebP files in `assets/optimized/`.
- `cargo-snippet.html` is the Cargo page snippet. The WebP images are inlined, so it can be pasted into a Cargo page Code View without separate asset URLs.
- `assets/` keeps the original PNG working copies.
- `assets/optimized/` contains the display-sized transparent WebP scene, stickers, and tweezer cursor used by `index.html`.

Current behavior:

- no labels, buttons, start screen, or page background
- transparent page, body, game, and board backgrounds
- desktop layout with the four loose stickers on the left of the scene
- mobile layout with the loose stickers below the scene so they do not cover it
- scene keeps its original `1586 / 1752` ratio
- loose sticker assets are casually scattered around the scene
- target shadows fade in only while a sticker is being held
- tweezer appears only after the pointer enters the game area
- tweezer handle is oriented toward the lower-right side
- pick and done bubbles appear around the tweezer interaction
- click or touch, hold, drag, and drop stickers onto the scene
- mobile touch pickup uses a slightly larger invisible hit area and a more forgiving snap zone
- placed stickers persist in browser storage
