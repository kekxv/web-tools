# Screenshot fixtures

`board-photo`, `board-full` and `row-pair` are crops of screenshots of a third-party puzzle game,
used only as input for the tests in this folder. They are not part of this project's code, they
carry no licence from the game's rights holder, and they are not used by the app.

To keep them as small and as low-resolution as the pipeline tolerates:

- `board-photo`: the board region of a photograph of a tablet, scaled to 240 px wide and reduced
  to 12 colours. Photographed at an angle, with a reflection on the glass.
- `board-full`: a full board screenshot, scaled to 240 px wide and reduced to 12 colours.
- `row-pair`: two rows of the same screenshot at 397 px wide, 48 colours, so the matcher still
  reads the icons; used for the grouping test.

Each file is gzipped 8-bit RGB (no PNG decoder needed in the tests): width and height are given in
`brick-real-screenshots.test.ts`. Regenerate one by cropping the source screenshot, scaling it,
reducing its palette and then `ffmpeg -i crop.png -f rawvideo -pix_fmt rgb24 out.rgb && gzip -9 out.rgb`.
