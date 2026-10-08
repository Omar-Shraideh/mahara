# Assets

**You don't need to provide anything.** Every asset the app uses is already in the project and served locally, with no external image or font links.

| Asset | Where used | Required? | Implementation |
|---|---|---|---|
| Mahara logo (teal tile, text lines, gold swipe) | Sidebar, landing top bar, candidate top bar | Yes | Existing design, drawn as inline SVG in `src/components/Logo.js` |
| Favicon | Browser tab | Yes | Same logo as `public/favicon.svg` |
| Mascot, walking with laptop | Start page, "How a session works" | Yes | `public/mascot/walk.webp`, cut from your mascot sheet |
| Mascot, typing | Candidate intro ("Prove your skill in 10 minutes") | Yes | `public/mascot/typing.webp` |
| Mascot, thumbs up | "Invite created" confirmation | Yes | `public/mascot/thumbs.webp` |
| Mascot, pointing at chart | Results page when there are no results yet | Yes | `public/mascot/point.webp` |
| Mascot, magnifying glass | Report → Work tab | Yes | `public/mascot/lens.webp` |
| Mascot, thinking | "Preparing your questions" | Yes | `public/mascot/think.webp` |
| Mascot, cheering | "You're done" (hidden when nothing was submitted) | Yes | `public/mascot/cheer.webp` |
| Fonts: Readex Pro, Alexandria, IBM Plex Mono (Latin and Arabic) | Whole app | Yes | Self-hosted through Fontsource packages, bundled at build time |
| Interface icons (plus, collapse, briefcase, person, invites, results) | Sidebar, top bar, buttons | Yes | Inline SVG paths from the approved design (`src/components/Icon.js`) |
| Sky background, cream panels, level badges | Whole app | Yes | CSS from the approved design (`src/styles.css`) |

## Optional improvements

- **Cleaner mascot cut-outs:** the seven poses were cut out of your sheet automatically. Two have see-through spots: the paper the thinking pose holds, and the chart behind the pointing pose. They sit on cream panels, so this doesn't show. If your illustrator can export each pose as its own transparent PNG or WebP, drop the files into `public/mascot/` with the same names to replace them.
- **Social preview image:** a 1200×630 image is shown when the link is shared in WhatsApp or Slack. It's not needed for judging.
