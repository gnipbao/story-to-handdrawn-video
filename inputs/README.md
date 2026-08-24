# inputs/

Drop the ordered page images for the `render-uploaded` GitHub Actions workflow here.

- Supported: `.png`, `.jpg`, `.jpeg`, `.webp`
- Playback order is filename order (`sort -V`), so name them `01.png`, `02.png`, …
- Identical images are de-duplicated by the importer

Then run **Actions → render-uploaded → Run workflow** and download the `out/*.mp4` artifact.
