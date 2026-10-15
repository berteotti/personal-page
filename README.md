# Personal Desk

An interactive personal page built with React, TypeScript, Vite, React Router, and Motion.

```sh
bun install
bun run dev
```

Open the URL printed by Vite. Other commands: `bun run build` for type checking and a production build, `bun test` for layout validation, and `bun run preview` to view the built site.

The page starts with clearly labeled sample content. Edit `src/content.ts` and replace the images in `public/images/` with your own. See [goals](docs/GOALS.md), [implementation notes](docs/IMPLEMENTATION.md), and the [content checklist](docs/CONTENT.md).

When deploying to a static host, configure its SPA fallback so requests such as `/about` and `/photos/01` serve `index.html`. Otherwise those direct links will return a server 404 before React loads.

Pushing to `main` deploys https://leothe.dev automatically: the `Build` workflow publishes `dist/` to the `build` branch, and the Raspberry Pi serving the site picks up new commits within a minute. `https://leothe.dev/version.txt` shows the deployed commit.

Alternatively, deploy to Cloudflare Workers with the account and SPA fallback in `wrangler.jsonc`:

```sh
bun run deploy
```

The desk note and `/about` use `public/fonts/leonardo-hand.woff2`, traced from Leonardo’s separated alphabet and punctuation in `IMG_8482.jpg`. It includes A–Z, a–z, spaces, and `. , ! ? : ; ' " - ( ) & @`; typographic quotation marks reuse the photographed quote strokes. W/w are retained from `IMG_8481.jpg` because they are missing from the new sheet. Digits, accented letters, and other unsupported characters use the existing fallback font stack.

To regenerate it, run `python3 scripts/build-handwriting-font.py /path/to/IMG_8482.jpg /path/to/IMG_8481.jpg` with Pillow, numpy, scipy, scikit-image, fonttools, and brotli installed. These are only needed for font generation; the website serves the finished font directly. The source photos are not included in the site.
