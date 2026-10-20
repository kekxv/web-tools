# Dynamic board corners implementation plan

Goal: Preserve empty perimeter cells using enclosed board boundaries, including perspective.
Architecture: Fit four straight inner edges of the existing board colour region. Validate enclosure and residuals; map tile centres through the corner homography to infer full row/column counts. Fall back to the existing lattice when evidence is insufficient. Preserve confirmed dimensions through rectification.

- [x] Add synthetic framed-board tests with empty perimeter rows/columns, moved corners and perspective; verify failure.
- [x] Fit and validate inner edges in brick-assistant.ts and assign cells in board coordinates.
- [x] Preserve framed geometry through automatic rectification in BrickAssistantView.vue.
- [x] Run brick regressions, full suite and build; inspect diff.

Constraints: retain current uncommitted work; no new dependencies; no assumption that the image boundary is the board boundary. Four straight edges correct planar perspective, not radial lens distortion.

Verification: synthetic rectangular and trapezoidal frames retain a 7×6 board with only the middle 3×3 occupied; corner movement and rectification preserve cell identities. Existing unframed/cropped-board regressions pass. Fixed the perspective transform to solve one shared eight-parameter mapping. Confirmed geometry is scoped to its source canvas, so re-detection retains it and new imports do not reuse it.
