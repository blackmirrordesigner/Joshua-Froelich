# Cyrus Reigns Records — Website

Static website for Cyrus Reigns Records. Christian Rock aesthetic: dark theme, gold accents, first EP (Ezekiel 34, Isaiah 2, Jeremiah 23) with sermon text and Shakespearean rhymed versions.

## Structure

- **Root:** `index.html` (home), `about.html`, `music.html`, `merch.html`, `contact.html`
- **Track pages:** `ezekiel-34.html`, `isaiah-2.html`, `jeremiah-23.html`
- **Assets:** `assets/css/styles.css`, `assets/js/main.js`, `assets/audio/`, `assets/images/`

## Audio (MP3s)

Place your track files in `assets/audio/` with these names:

- `ezekiel-34.mp3`
- `isaiah-2.mp3`
- `jeremiah-23.mp3`

If the files are missing, the HTML5 audio player will show but playback will fail until you add them.

## Deploy (Netlify)

1. Push this folder to a GitHub repository.
2. Sign up at [Netlify](https://www.netlify.com) and connect the repo.
3. Build settings:
   - **Build command:** leave empty
   - **Publish directory:** `.` (root) or the directory that contains `index.html`
4. Deploy. Your site will be live at `*.netlify.app`.
5. Optional: add a custom domain (e.g. cyrusreignsrecords.com) in Netlify → Domain settings.

## Optional

- **Contact form:** Replace the form `action` in `contact.html` with your Formspree or Google Form URL.
- **Merch:** Update "Buy Now" links in `merch.html` to your store or a Google Form.
- **Images:** Add `joshua-bio.jpg`, `simion-bio.jpg` in `assets/images/` for the About page; add merch images in `assets/images/merch/` (or rely on placeholders).

## Cover art (releases)

Place EP and track art in `assets/images/releases/`:

- **EP:** `first-ep-cover.jpg` or `first-ep-cover.svg` — used in the Latest Release slider and Music page. Recommended: 800×800 or 1200×1200 px.
- **Tracks:** `ezekiel-34.jpg`, `isaiah-2.jpg`, `jeremiah-23.jpg` (or `.svg`) — one image per track for the slider and Music cards. Same dimensions as above.

SVG placeholders are included by default so the slider and Music page work without replacing files. Replace with your own art when ready.
- **Analytics:** Add Google Analytics snippet in the `<head>` of each page if desired.

## Tech

- HTML5, CSS3, vanilla JS
- Bootstrap 5 (CDN), Font Awesome (CDN)
- No build step; open `index.html` in a browser or use Live Server for local preview.
