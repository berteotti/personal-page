# Implementation notes

## Stack and structure

Vite serves a React and TypeScript app. React Router maps `/about`, `/photos/:photoId`, and `/travels` to detail dialogs rendered inside a persistent desk layout. Motion handles dragging. CSS builds the paper objects and their responsive composition. Three.js renders the rubber duck from a fixed overhead camera, with an SVG fallback when WebGL is unavailable. `src/content.ts` holds editable page content; `src/layout.ts` holds default arrangements, position math, and saved-layout validation.

Each desktop object is draggable. On phones, only its visible handle starts a drag so the desk can scroll normally. Arrow keys move a focused object on desktop or a focused handle on phones; Shift increases the step. Movement is bounded by the desk. A move updates normalized coordinates (0 to 1 across the available space) and stacking order. Separate `localStorage` keys hold desktop and mobile layouts. Invalid or unavailable storage falls back to the defaults. Reset restores the current layout.

Details use native dialogs. The URL controls which one is open, and the desk stays mounted beneath them. In-app close uses browser history; a direct link closes to `/`. Unknown detail paths offer a way home. The host must return `index.html` for all app routes to make direct links work.

## Build sequence

1. Create the visual assets and content module.
2. Compose and style the desk objects at desktop and mobile widths.
3. Add drag, keyboard movement, local persistence, reset, and routed dialogs.
4. Verify each route and interaction in a browser; compare both viewports to the approved concept.

## Verification checklist

- Run `bun run build` and `bun test`.
- Inspect the desktop desk and mobile desk in a browser, including image loading and readable text.
- Drag two objects, open a detail, use Back and Forward, and verify positions.
- Reload `/about` and `/photos/01`; test an unknown path.
- Test reset, narrow resize, touch scrolling away from handles, and keyboard movement.
- Check dialog Escape, focus restoration, and reduced-motion behavior.

The project instructions request elevated permission to run tests outside the sandbox. Ask for that escalation before running `bun test` outside it.
