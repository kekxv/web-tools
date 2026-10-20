# Recognition consistency and themes

Goal: Use observed tile rectangles for recognition and solver input, independent of bevel hue.

- [ ] Extract the pixel-to-board pipeline into brick-recognition.ts so real crops, accepted rectangles, and solver IDs share one source.
- [ ] Add behavioral tests for offset detected rectangles, empty fallback cells, manual grid changes and blue/green/purple themes.
- [ ] Replace green-only fallback evidence with pale face and contrasting border structure; keep glare/background rejection.
- [ ] Verify detection, classification and findMoves together on themed boards; run full tests and build.

Existing uncommitted changes are preserved. Equal grid divisions only locate fallback search windows or supply empty background thumbnails.
