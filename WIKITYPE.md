# WikiType: Project Documentation and Agent Playbook

> Monkeytype for Wikipedia. Search any topic, then type its Wikipedia intro against a 30-second timer.

This file is the **single source of truth** for building WikiType. It is written for AI coding agents (and humans). Read it fully before touching code, and **update the Progress Log (section 12) after every successful run**.

---

## 1. Agent Operating Rules (READ FIRST)

1. **Read this whole document** before starting any task.
2. **Pick the first unchecked task** in section 11 (Roadmap). Do not skip ahead unless a task is blocked.
3. **Work in small, verifiable steps.** One task = one coherent change.
4. **A run is "successful" only when all of these pass:**
   ```bash
   npm run typecheck && npm run lint && npm run test && npm run build
   ```
   (Tasks before the tooling exists only need what is available; note this in the log.)
5. **After every successful run, you MUST:**
   - Tick the finished task(s) in section 11.
   - Append an entry to the Progress Log (section 12) using the template there.
   - Update "Current Status" (section 12.1).
6. **After a failed run:** do not tick anything. Append a log entry with status `FAILED`, the error summary, and what you tried. Fix it in the next run.
7. **Do not change the stack, folder structure, or specs in this document without logging the reason** in section 13 (Decision Log).
8. **Never commit secrets.** The Wikipedia API needs no key.
9. Keep the UI exactly as specified in sections 3 to 5. Do not add features outside the spec until all Roadmap phases are done.

---

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Runtime / tooling | **Node.js 20+**, npm |
| Language | **TypeScript** (strict mode) |
| Framework | **React 18 + Vite** |
| Styling | **Tailwind CSS** (plus small custom CSS for caret and animations) |
| State | React hooks (`useReducer` for the typing engine) |
| Animation | CSS transitions (optional: `framer-motion` for the page transition) |
| Testing | **Vitest** + React Testing Library |
| Lint / format | ESLint + Prettier |
| Data source | Wikipedia public APIs (no API key) |

---

## 3. Product Overview

### 3.1 Landing Page
- **Solid black background** (`#000`), minimalist, nothing but the essentials.
- Centered **search bar** with placeholder: `What are you interested in?`
- **Real-time suggestions:** autocomplete dropdown while typing (debounced).
- **Navigation:** selecting a suggestion (click, or arrow keys + Enter) or pressing Enter on the typed query loads that topic and **smoothly transitions** to the typing page.

### 3.2 Typing Page
- **HUD**
  - Top-left: live **WPM**, with the **30-second countdown** directly beneath it.
  - Top-right: live **accuracy %**.
- **Text:** the lead introduction (summary) of the selected Wikipedia article.
- **Rendering (Monkeytype style):**
  - Untyped characters: dimmed.
  - Correct characters: highlighted (white or green).
  - Incorrect characters: red.
  - A visible caret at the current position.
- **Auto-scroll:** the text window scrolls smoothly as the user progresses.
- **End of test:** when the timer reaches 0, input locks automatically and a **modal** shows final WPM and accuracy, with **Restart** (same text) and **New topic** (back to landing) actions.

---

## 4. Wikipedia API Integration

All requests are made from the browser. `origin=*` is required for CORS.

### 4.1 Search suggestions
```
GET https://en.wikipedia.org/w/api.php
  ?action=opensearch
  &search={query}
  &limit=8
  &namespace=0
  &format=json
  &origin=*
```
Response: `[query, titles[], descriptions[], urls[]]`. Use `titles` for the dropdown.

### 4.2 Article intro
```
GET https://en.wikipedia.org/w/api.php
  ?action=query
  &prop=extracts
  &exintro=1
  &explaintext=1
  &redirects=1
  &titles={title}
  &format=json
  &formatversion=2
  &origin=*
```
Use `query.pages[0].extract`.

### 4.3 Text normalization (required before typing)
Implement `normalizeText(raw: string): string` in `src/lib/wikipedia.ts`:
- Replace curly quotes with straight quotes, en/em dashes with `-`, non-breaking spaces with spaces, `…` with `...`.
- Strip characters not typeable on a standard keyboard (or transliterate where simple).
- Remove bracketed citation remnants like `[1]` and pronunciation parentheticals if they contain non-ASCII.
- Collapse all whitespace and newlines into single spaces; trim.
- If the result is shorter than ~200 characters, append the next available paragraph (fall back to `exintro=0` truncated to ~1200 chars). If still too short or the page is a disambiguation or missing, show a friendly error and a way back.

### 4.4 Robustness
- Debounce suggestions by ~200 ms; cancel stale requests with `AbortController`.
- Handle empty results ("No results"), network errors (retry button), and loading states.

---

## 5. Typing Engine Specification

Implement as a pure, testable module (`src/lib/typingEngine.ts`) plus a hook (`useTypingTest`).

**State:** `target: string`, `typed: string`, `status: 'idle' | 'running' | 'finished'`, `startedAt`, `timeLeft` (starts at 30), `correctKeystrokes`, `totalKeystrokes`.

**Rules**
- Timer starts on the **first keystroke**, not on page load.
- Characters are compared one by one at the same index; a wrong char shows red but the caret still advances (Monkeytype default). Backspace removes the last typed char (correction does not erase the mistake from `totalKeystrokes`).
- Ignore modifier keys, arrows, and function keys. Prevent default for Space and Backspace to avoid page scroll and navigation.
- Input is captured via a hidden, auto-focused `<input>` or a key listener; clicking the text area refocuses it.
- When `timeLeft` hits 0, set `status = 'finished'` and **lock input**.
- If the user finishes the whole passage before 30 s, finish the test early (or load more text; pick early finish for v1).

**Formulas**
- `WPM = (correctChars / 5) / elapsedMinutes`, where `elapsedMinutes = elapsedSeconds / 60` (use at least 1 s elapsed to avoid divide-by-zero).
- `Accuracy % = correctKeystrokes / totalKeystrokes * 100`, rounded; show `100` when there are no keystrokes yet.
- Live WPM updates at least once per second.

**Unit tests (required):** WPM math, accuracy math, backspace behavior, timer start on first key, lock on finish, early finish.

---

## 6. UI / UX Details

- Font: monospace for the typing text (e.g. `JetBrains Mono` or system mono); clean sans for the rest.
- Palette: black `#000` background, dim gray `#52525b` for untyped text, white or green `#4ade80` for correct, red `#ef4444` for wrong, muted accent for the caret.
- HUD is large and quiet: WPM and timer top-left, accuracy top-right.
- Typing text block: centered, max width about 900 px, large line height; show roughly 3 lines and **scroll lines upward smoothly** (CSS `transform` transition) as the caret moves to a new line.
- Landing to typing transition: fade and slide (about 300 ms). Respect `prefers-reduced-motion`.
- Results modal: centered card with backdrop blur, big WPM and Accuracy numbers, buttons **Restart** and **New topic**; `Esc` and `Tab+Enter` shortcuts are a nice-to-have.
- Fully keyboard accessible (the dropdown uses `role="listbox"` and arrow-key navigation).
- Responsive down to about 360 px width.

---

## 7. Project Structure

```
wikitype/
├─ WIKITYPE.md              # this file (keep updated)
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ tailwind.config.ts
├─ .eslintrc.cjs / eslint.config.js
├─ .prettierrc
└─ src/
   ├─ main.tsx
   ├─ App.tsx               # simple state-based routing: landing | typing
   ├─ components/
   │  ├─ SearchBar.tsx
   │  ├─ SuggestionList.tsx
   │  ├─ Hud.tsx
   │  ├─ TypingArea.tsx
   │  └─ ResultsModal.tsx
   ├─ hooks/
   │  ├─ useDebounce.ts
   │  ├─ useWikiSearch.ts
   │  └─ useTypingTest.ts
   ├─ lib/
   │  ├─ wikipedia.ts       # API calls + normalizeText
   │  └─ typingEngine.ts    # pure logic
   ├─ types/index.ts
   └─ styles/index.css
```

---

## 8. Setup Commands (Phase 0)

```bash
npm create vite@latest wikitype -- --template react-ts
cd wikitype
npm install
npm install -D tailwindcss postcss autoprefixer vitest jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  prettier eslint
npx tailwindcss init -p
```

Required `package.json` scripts:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit",
  "lint": "eslint .",
  "test": "vitest run",
  "format": "prettier --write ."
}
```
`tsconfig.json` must have `"strict": true`.

---

## 9. Definition of Done (whole project)

- [ ] Landing page matches section 3.1, with working live suggestions.
- [ ] Selecting a topic fetches and normalizes the intro, then transitions to typing.
- [ ] HUD shows live WPM, 30 s countdown (under WPM), and live accuracy (top-right).
- [ ] Correct, wrong, and untyped characters styled as specified; caret visible; smooth auto-scroll.
- [ ] Input locks at 0 s; results modal shows final WPM and Accuracy with Restart and New topic.
- [ ] Error, empty, and loading states handled.
- [ ] `typecheck`, `lint`, `test`, `build` all pass.
- [ ] README with run instructions.

---

## 10. Testing Checklist (manual, after each UI phase)

1. Type "alan tur", see suggestions, pick one with the keyboard.
2. Press Enter on a typo query, get a graceful "no results" or closest match.
3. Timer does **not** start until the first keystroke.
4. Make deliberate mistakes; accuracy drops, WPM stays sensible.
5. Hold Backspace; no page navigation, no negative index.
6. Let the timer run out; input is locked, modal appears, Restart works, New topic works.
7. Resize to a narrow viewport; layout holds.

---

## 11. Roadmap (agents: tick items as you complete them)

### Phase 0: Scaffold
- [ ] 0.1 Create Vite + React + TS project; enable strict TS
- [ ] 0.2 Add Tailwind, ESLint, Prettier, Vitest; add all npm scripts from section 8
- [ ] 0.3 Create folder structure from section 7 with placeholder files
- [ ] 0.4 Verify `typecheck`, `lint`, `test`, `build` all run green

### Phase 1: Data layer
- [ ] 1.1 `searchWikipedia(query, signal)` in `lib/wikipedia.ts`
- [ ] 1.2 `fetchIntro(title)` in `lib/wikipedia.ts`
- [ ] 1.3 `normalizeText` with unit tests
- [ ] 1.4 `useDebounce` and `useWikiSearch` hooks (loading, error, empty states)

### Phase 2: Landing page
- [ ] 2.1 Black full-screen layout and centered `SearchBar` with the exact placeholder
- [ ] 2.2 `SuggestionList` dropdown with keyboard navigation and mouse selection
- [ ] 2.3 Enter and select handlers; app state switches to typing view
- [ ] 2.4 Smooth landing to typing transition

### Phase 3: Typing engine
- [ ] 3.1 Pure `typingEngine.ts` (reducer, WPM, accuracy) with unit tests
- [ ] 3.2 `useTypingTest` hook (timer, first-key start, lock at 0)
- [ ] 3.3 Early finish when the passage is completed

### Phase 4: Typing page UI
- [ ] 4.1 `Hud` (WPM and countdown top-left, accuracy top-right)
- [ ] 4.2 `TypingArea` with per-character states and caret
- [ ] 4.3 Smooth line auto-scroll
- [ ] 4.4 Loading and error states for article fetch

### Phase 5: Results and polish
- [ ] 5.1 `ResultsModal` (final WPM, accuracy, Restart, New topic)
- [ ] 5.2 Restart (same text, reset state) and New topic (back to landing)
- [ ] 5.3 Accessibility and `prefers-reduced-motion`
- [ ] 5.4 Responsive pass and final visual polish

### Phase 6: Wrap-up
- [ ] 6.1 Write README (install, dev, build, how it works)
- [ ] 6.2 Final full verification against section 9 and section 10
- [ ] 6.3 (Optional) Deploy to Vercel or Netlify

---

## 12. Progress Log

### 12.1 Current Status
- **Phase:** 0 (not started)
- **Last completed task:** none
- **Next task:** 0.1
- **Known issues / blockers:** none
- **Last updated:** (date and agent)

### 12.2 Entry Template (copy for each run, newest first)

```
#### [YYYY-MM-DD HH:MM] Run #N: STATUS (SUCCESS | FAILED | PARTIAL)
- **Tasks:** e.g. 0.1, 0.2
- **What was done:** 1 to 3 bullets
- **Files changed:** list
- **Verification:** commands run and results (typecheck / lint / test / build)
- **Issues / notes:** anything the next agent must know
- **Next task:** e.g. 0.3
```

### 12.3 Log Entries

_(No runs yet. The first agent adds its entry here.)_

---

## 13. Decision Log

Record any deviation from this document (stack change, spec change, new dependency) with date and reason.

| Date | Decision | Reason |
|---|---|---|
| (none yet) | | |

---

## 14. Copy-Paste Prompt for Launching an Agent

```
You are building the WikiType project. Read WIKITYPE.md in the repo root completely.
Follow the Agent Operating Rules in section 1. Take the next unchecked task in the
Roadmap (section 11). Implement it, then run:
  npm run typecheck && npm run lint && npm run test && npm run build
If everything passes, tick the task(s) in section 11, update Current Status
(section 12.1), and append a Progress Log entry (section 12.3) using the template.
If anything fails, fix it; if you cannot, log a FAILED entry with details and stop.
Do not do work outside the Roadmap. Do not edit the spec without a Decision Log entry.
```

For parallel agents, give each a different **phase** and have them only edit files in their own area. Tell them to re-read this file before logging, so entries do not overwrite each other.
