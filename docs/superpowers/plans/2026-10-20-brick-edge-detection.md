# Brick edge detection repair

**Goal:** Crop complete individual bricks at their observed outer edges, preserving their bevels and avoiding adjacent bricks.

**Approach:** Keep brightness components as seeds and the existing lattice for cell assignment. Replace pitch-sized square crops with local RGB edge projections on the original image. Share detected rectangles between recognition and image overlays; inspect complete cells when detection needs a fallback.

**Files:** `src/utils/brick-edges.ts` (edge tracing), `src/utils/brick-assistant.ts` (detection and trimming integration), `src/views/BrickAssistantView.vue` (native-resolution crops and overlay rectangles), and brick regression tests.

- [x] Add failing regression fixtures for independent brick sizes, bevels, nearby bricks, and source-image boundaries.
- [x] Implement local edge tracing with support across each side; constrain searches before neighboring bricks and refine after scaling back to original pixels.
- [x] Remove fixed crop insets and wire the same bounds into thumbnails and overlays, including manual-grid fallback.
- [x] Run brick tests, all tests, and production build; review the resulting diff.

**Verification:** Added regressions for dark and equal-brightness bevels, disconnected neighbour strips, dense 10×14 boards, source-frame boundaries, and original-resolution refinement. Independent code review findings were reproduced and fixed. Chromium import verification checks all 16 outlines against source coordinates and checks thumbnail bevel colours. Full tests and production build recorded in the final verification run.
