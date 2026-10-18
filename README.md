# WikiType

WikiType is a browser-based typing test using Wikipedia articles. Search for a topic, choose a suggestion, and type for 30 seconds while tracking your words per minute and accuracy.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0` (required by Vite 8)
- npm
- Internet access to use the Wikipedia API

## Getting started

From the project directory, install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite in your browser.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot reload. |
| `npm run typecheck` | Run the TypeScript type check. |
| `npm run lint` | Check the project with Oxlint. |
| `npm run test` | Run the Vitest test suite. |
| `npm run build` | Type-check and create a production build in `dist/`. |
| `npm run preview` | Serve the production build locally (run `npm run build` first). |
| `npm run format` | Format project files with Prettier. |

To run the full verification sequence:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## How it works

1. The landing page searches Wikipedia as you type. Suggestions are debounced, and stale searches are cancelled. Use the arrow keys and Enter to choose a suggestion, or press Enter to search the entered topic.
2. WikiType loads a plain-text Wikipedia article extract through the public MediaWiki API, then normalizes it for typing. No API key or server is required.
3. The typing test starts with the first character typed. Correct and incorrect characters are highlighted separately; Backspace lets you correct the current input without erasing recorded keystrokes.
4. The passage grows as you approach its visible end. If the fetched extract runs out, it repeats from the beginning. The 30-second timer ends the test and locks input.
5. The results show WPM and accuracy. Restart replays the same passage; New topic returns to search.

## Tech stack

React, TypeScript, and Vite; Tailwind CSS v4; Vitest with React Testing Library; Oxlint; and the public English Wikipedia API.
