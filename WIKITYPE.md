# WikiType: Project Documentation and Agent Playbook

> Monkeytype for Wikipedia. Search any topic, then type its Wikipedia article text against a 30-second timer.

This file is the **single source of truth** for building WikiType. It is written for AI coding agents (and humans). Read it fully before touching code, and **update the Progress Log (section 12) after every successful run**.

**Repository:** https://github.com/Dyed-RON/Wikityper.git (branch: `main`)
**Local project folder:** `wikitype/` (the folder containing `package.json`). Run all commands from here.
**Already scaffolded:** Vite + React + TypeScript with **Oxlint** (see Decision Log).

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
10. **Commit and push after every SUCCESSFUL run** (all checks in rule 4 passing), after updating this file's Roadmap and Progress Log so the doc update ships in the same commit:
    ```bash
    git add -A
    git commit -m "Task <id>: <short description>"
    git push origin main
    ```
    - Never commit or push when typecheck, lint, test, or build fails.
    - Never `git push --force`, never rewrite history, never delete branches.
    - If `git push` is rejected, run `git pull --rebase origin main`, re-run the checks, then push again. If there are merge conflicts you cannot resolve safely, stop and log a `FAILED` entry.
    - Record the commit hash in the Progress Log entry.
11. Make sure `.gitignore` excludes `node_modules/`, `dist/`, and any `.env*` files before the first commit.

---

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Runtime / tooling | **Node.js 20+**, npm |
| Language | **TypeScript** (strict mode) |
| Framework | **React 18 + Vite** |
| Styling | **Tailwind CSS v4** via the `@tailwindcss/vite` plugin (plus small custom CSS for caret and animations) |
| State | React hooks (`useReducer` for the typing engine) |
| Animation | CSS transitions (optional: `framer-motion` for the page transition) |
| Testing | **Vitest** + React Testing Library |
| Lint / format | **Oxlint** (already scaffolded; do not add ESLint) + Prettier |
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
- **Text:** a bounded extract from the selected Wikipedia article, progressively revealed as the user approaches the end of the visible passage.
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

### 4.2 Article typing passage
```
GET https://en.wikipedia.org/w/api.php
  ?action=query
  &prop=extracts|pageprops
  &explaintext=1
  &redirects=1
  &exchars=12000
  &titles={title}
  &format=json
  &formatversion=2
  &origin=*
```
Use `query.pages[0].extract` as the source for the typing passage, capped at 12,000 normalized characters.

### 4.3 Text normalization (required before typing)
Implement `normalizeText(raw: string): string` in `src/lib/wikipedia.ts`:
- Replace curly quotes with straight quotes, en/em dashes with `-`, non-breaking spaces with spaces, `…` with `...`.
- Strip characters not typeable on a standard keyboard (or transliterate where simple).
- Remove bracketed citation remnants like `[1]` and pronunciation parentheticals if they contain non-ASCII.
- Collapse all whitespace and newlines into single spaces; trim.
- If the result is shorter than ~200 characters or the page is a disambiguation or missing, show a friendly error and a way back.

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
- When `timeLeft` hits 0, set `status = 'finished'` and **lock input**; the timer is the only way to finish.
- Extend the visible target with additional article text as the user approaches the end. If the fetched extract is exhausted before the timer, continue from its beginning with a paragraph break so typing remains active until time expires.

**Formulas**
- `WPM = (correctChars / 5) / elapsedMinutes`, where `elapsedMinutes = elapsedSeconds / 60` (use at least 1 s elapsed to avoid divide-by-zero).
- `Accuracy % = correctKeystrokes / totalKeystrokes * 100`, rounded; show `100` when there are no keystrokes yet.
- Live WPM updates at least once per second.

**Unit tests (required):** WPM math, accuracy math, backspace behavior, timer start on first key, lock on finish, and continued typing after passage exhaustion.

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
├─ .oxlintrc.json           # optional Oxlint config
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
# Already done: project created with
#   npm create vite@latest wikitype -- --template react-ts   (Oxlint chosen)
# Run the rest from inside the wikitype/ folder:
npm install tailwindcss @tailwindcss/vite
npm install -D vitest jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  prettier
```

Tailwind v4 setup (no `tailwind.config` or `init` command needed):
1. Add `tailwindcss()` (imported from `@tailwindcss/vite`) to the `plugins` array in `vite.config.ts`.
2. Put `@import "tailwindcss";` at the top of `src/styles/index.css` (or `src/index.css`) and import it in `main.tsx`.

Vitest setup: add a `test` block to `vite.config.ts` with `environment: 'jsdom'` and a setup file that imports `@testing-library/jest-dom`.

Required `package.json` scripts:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit",
  "lint": "oxlint",
  "test": "vitest run",
  "format": "prettier --write ."
}
```
`tsconfig.json` must have `"strict": true`.

---

## 9. Definition of Done (whole project)

- [x] Landing page matches section 3.1, with working live suggestions.
- [x] Selecting a topic fetches and normalizes an article typing passage, then transitions to typing.
- [x] HUD shows live WPM, 30 s countdown (under WPM), and live accuracy (top-right).
- [x] Correct, wrong, and untyped characters styled as specified; caret visible; smooth auto-scroll.
- [x] Input locks at 0 s; results modal shows final WPM and Accuracy with Restart and New topic.
- [x] Error, empty, and loading states handled.
- [x] `typecheck`, `lint`, `test`, `build` all pass.
- [ ] README with run instructions.

---

## 10. Testing Checklist (manual, after each UI phase)

1. [x] Type "alan tur", see suggestions, pick one with the keyboard.
2. [x] Press Enter on a typo query, get a graceful "no results" or closest match.
3. [x] Timer does **not** start until the first keystroke.
4. [x] Make deliberate mistakes; accuracy drops, WPM stays sensible.
5. [x] Hold Backspace; no page navigation, no negative index.
6. [x] Let the timer run out; input is locked, modal appears, Restart works, New topic works.
7. [x] Resize to a narrow viewport; layout holds.

---

## 11. Roadmap (agents: tick items as you complete them)

### Phase 0: Scaffold
- [x] 0.1 Create Vite + React + TS project; enable strict TS (scaffolded manually by the user; confirm `"strict": true` in tsconfig)
- [x] 0.2 Add Tailwind v4, Prettier, Vitest; keep the existing Oxlint setup; add all npm scripts from section 8 (make sure `lint` is `oxlint`)
- [x] 0.3 Create folder structure from section 7 with placeholder files
- [x] 0.4 Verify `typecheck`, `lint`, `test`, `build` all run green

### Phase 1: Data layer
- [x] 1.1 `searchWikipedia(query, signal)` in `lib/wikipedia.ts`
- [x] 1.2 `fetchIntro(title)` in `lib/wikipedia.ts`
- [x] 1.3 `normalizeText` with unit tests
- [x] 1.4 `useDebounce` and `useWikiSearch` hooks (loading, error, empty states)

### Phase 2: Landing page
- [x] 2.1 Black full-screen layout and centered `SearchBar` with the exact placeholder
- [x] 2.2 `SuggestionList` dropdown with keyboard navigation and mouse selection
- [x] 2.3 Enter and select handlers; app state switches to typing view
- [x] 2.4 Smooth landing to typing transition

### Phase 3: Typing engine
- [x] 3.1 Pure `typingEngine.ts` (reducer, WPM, accuracy) with unit tests
- [x] 3.2 `useTypingTest` hook (timer, first-key start, lock at 0)
- [x] 3.3 Continue typing by progressively extending the passage until the timer expires

### Phase 4: Typing page UI
- [x] 4.1 `Hud` (WPM and countdown top-left, accuracy top-right)
- [x] 4.2 `TypingArea` with per-character states and caret
- [x] 4.3 Smooth line auto-scroll
- [x] 4.4 Loading and error states for article fetch

### Phase 5: Results and polish
- [x] 5.1 `ResultsModal` (final WPM, accuracy, Restart, New topic)
- [x] 5.2 Restart (same text, reset state) and New topic (back to landing)
- [x] 5.3 Accessibility and `prefers-reduced-motion`
- [x] 5.4 Responsive pass and final visual polish

### Phase 6: Wrap-up
- [ ] 6.1 Write README (install, dev, build, how it works)
- [ ] 6.2 Final full verification against section 9 and section 10
- [ ] 6.3 (Optional) Deploy to Vercel or Netlify

---

## 12. Progress Log

### 12.1 Current Status
- **Phase:** 6 (verification in progress)
- **Last completed task:** 5.4
- **Current task:** 6.2 (product behavior verified; final sign-off pending README)
- **Next task:** 6.1
- **Known issues / blockers:** README is still the Vite template; complete task 6.1, then rerun the final verification for section 9.
- **Last updated:** 2026-10-18

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

#### [2026-10-18 22:17] Run #23: PARTIAL
- **Tasks:** 6.2 (requested before 6.1)
- **What was done:** Completed product verification against sections 9 and 10, fixing timer-only completion, the visible empty-search state, and caret-based passage scrolling.
- **Files changed:** `WIKITYPE.md`, `src/App.tsx`, `src/App.test.tsx`, `src/components/TypingArea.tsx`, `src/components/TypingArea.test.tsx`, `src/lib/typingEngine.ts`, `src/lib/typingEngine.test.ts`, `src/styles/index.css`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 47 tests passed. Browser checks covered typo suggestions/keyboard selection, no-results and missing-topic recovery, first-key timer start, incorrect/correct typing and Backspace accuracy, caret auto-scroll at 360px, natural timer expiry/input lock/results, and New topic. App integration tests cover Restart.
- **Issues / notes:** All product behavior checks pass. The README requirement in section 9 is still unmet; complete 6.1, then repeat final sign-off for 6.2.
- **Commit:** to be recorded after commit.
- **Next task:** 6.1

#### [2026-10-18 22:16] Run #22: FAILED
- **Tasks:** 6.2 verification regression test
- **What was done:** Added an auto-scroll regression test after browser verification exposed that the caret's `offsetTop` was relative to its positioned character span.
- **Files changed:** `src/components/TypingArea.tsx`, `src/components/TypingArea.test.tsx`
- **Verification:** Typecheck, lint, and tests passed; production build failed with `TS2339` because the test's `closest()` result was typed as `Element`. Adding the correct `HTMLElement` generic fixed the test's style access; Run #23 passed all four validation steps.
- **Issues / notes:** None remaining in this fix.
- **Next task:** Complete section 6.2 verification.

#### [2026-10-18 22:12] Run #21: PARTIAL
- **Tasks:** 6.2 (requested before 6.1)
- **What was done:** Final-verified the implemented product behaviors and corrected two gaps: the reducer no longer finishes when the target ends, and empty searches now display "No results".
- **Files changed:** `WIKITYPE.md`, `src/App.tsx`, `src/App.test.tsx`, `src/lib/typingEngine.ts`, `src/lib/typingEngine.test.ts`, `src/styles/index.css`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 46 tests passed. Browser verified live "alan tur" suggestions and keyboard selection, empty/missing-topic handling, 30s before the first keystroke, accuracy/backspace behavior, and layout at 360px. The App integration test verifies timeout, lock, restart, and New topic.
- **Issues / notes:** Product behaviors in sections 9 and 10 are verified. Overall section 9 remains incomplete because the README is still the Vite template; final section 6.2 sign-off must be repeated after task 6.1.
- **Commit:** to be recorded after commit.
- **Next task:** 6.1

#### [2026-10-18 22:01] Run #20: SUCCESS
- **Tasks:** User-requested continuous typing passage enhancement
- **What was done:** Fetch a bounded article extract, reveal additional text in chunks as the user approaches the end, and keep typing active until the timer expires; update the behavior documentation.
- **Files changed:** `WIKITYPE.md`, `src/App.tsx`, `src/App.test.tsx`, `src/hooks/useTypingTest.ts`, `src/hooks/useTypingTest.test.ts`, `src/lib/typingEngine.ts`, `src/lib/typingEngine.test.ts`, `src/lib/wikipedia.ts`, `src/lib/wikipedia.test.ts`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 44 tests passed.
- **Issues / notes:** User-directed behavior supersedes early finish specified for v1.
- **Commit:** `e4ebe5e815e09cf90c9fa67316e0c1d0d4789ee9`
- **Next task:** 6.1

#### [2026-10-18 22:00] Run #19: FAILED
- **Tasks:** User-requested continuous typing passage enhancement (in progress)
- **What was done:** Isolated the App integration case and confirmed typed-character state after progression changes.
- **Files changed:** `src/App.test.tsx`
- **Verification:** `npm run test -- --run src/App.test.tsx` timed out because `findByRole` was used after switching to fake timers; replacing it with a synchronous query made the targeted test pass.
- **Issues / notes:** Run the complete validation chain.
- **Next task:** Complete passage extension verification.

#### [2026-10-18 21:58] Run #18: FAILED
- **Tasks:** User-requested continuous typing passage enhancement (in progress)
- **What was done:** Fixed the Backspace path and added per-keystroke extension tests; hooked full-passage data into typing.
- **Files changed:** Phase 3 typing engine/hook tests and Phase 4 App/Wikipedia integration tests
- **Verification:** Typecheck and lint passed; tests failed (43 passed, one failed): the App timer-results integration test showed 0% accuracy where 100% was expected after a typed character. Build was not run because the chain stopped.
- **Issues / notes:** Investigate the App integration test's key/typing state before proceeding.
- **Next task:** Complete passage extension verification.

#### [2026-10-18 21:57] Run #17: FAILED
- **Tasks:** User-requested continuous typing passage enhancement (in progress)
- **What was done:** Added bounded full-article passage fetching, progressive target extension, and related engine/API tests.
- **Files changed:** `src/App.tsx`, `src/App.test.tsx`, `src/hooks/useTypingTest.ts`, `src/hooks/useTypingTest.test.ts`, `src/lib/typingEngine.ts`, `src/lib/typingEngine.test.ts`, `src/lib/wikipedia.ts`, `src/lib/wikipedia.test.ts`
- **Verification:** Typecheck and lint passed; tests failed (40 passed, 4 failed): Backspace was incorrectly returned early from the handler; two hook tests batched key actions while assuming separate renders; the App test imported `act` from Vitest instead of Testing Library. Build was not run because the chain stopped.
- **Issues / notes:** Fixed Backspace dispatch and revised the test harness to issue separate key events; the full validation chain is pending.
- **Next task:** Complete passage extension verification.

#### [2026-10-18 21:52] Run #16: SUCCESS
- **Tasks:** User-requested landing-page layout refinement
- **What was done:** Moved the WikiType brand into a top-anchored header while retaining the tagline and search experience in the vertical center of the landing page.
- **Files changed:** `src/App.tsx`, `src/styles/index.css`, `WIKITYPE.md`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 39 tests passed with no lint warnings.
- **Issues / notes:** Roadmap status is unchanged; this is a verified UI refinement.
- **Commit:** `9248c9bcfcddf5ca442b42f33b4633d12e501e25`
- **Next task:** 6.1

#### [2026-10-18 21:45] Run #15: SUCCESS
- **Tasks:** 5.1–5.4
- **What was done:**
  - Added the results dialog with final WPM and accuracy, keyboard focus management, focus trapping, Escape-to-New-topic, Restart, and New topic actions.
  - Wired restart to reset the same typing passage and restore input focus; New topic clears the selected article and query and returns to landing.
  - Added responsive result-card styles and verified reduced-motion behavior remains respected; added component and app-flow tests.
- **Files changed:** `src/App.tsx`, `src/App.test.tsx`, `src/components/ResultsModal.tsx`, `src/components/ResultsModal.test.tsx`, `src/components/TypingArea.tsx`, `src/components/TypingPage.css`, `WIKITYPE.md`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 39 tests passed with no lint warnings.
- **Issues / notes:** None.
- **Commit:** `54e131a16bca6b701bacffabe1053ae9284c4496`
- **Next task:** 6.1

#### [2026-10-18 21:44] Run #14: FAILED
- **Tasks:** 5.1–5.4 (in progress)
- **What was done:** Added the results modal flow, restart/new-topic actions, accessible keyboard focus handling, and responsive modal styles.
- **Files changed:** `src/App.tsx`, `src/App.test.tsx`, `src/components/ResultsModal.tsx`, `src/components/TypingArea.tsx`, `src/components/TypingPage.css`, `src/components/ResultsModal.test.tsx`
- **Verification:** Typecheck and lint passed; tests failed in two App integration cases because the Wikipedia module mock lacked the `searchWikipedia` export. The remaining component tests passed; build was not run because the chain stopped.
- **Issues / notes:** Extended the App test mock to provide the search function; the full chain passed in Run #15.
- **Next task:** 5.1

#### [2026-10-18 21:40] Run #12: SUCCESS
- **Tasks:** 4.3, 4.4
- **What was done:**
  - Added a measured caret-based transform inside a fixed, three-line text viewport for smooth passage scrolling; reduced-motion users receive no scroll animation.
  - Connected topic selection to abortable, normalized Wikipedia intro fetching and the HUD/typing passage.
  - Added loading, friendly error, Retry, and New topic states, with tests for loading and retry recovery.
- **Files changed:** `src/App.tsx`, `src/App.test.tsx`, `src/components/TypingArea.tsx`, `src/components/TypingPage.css`, `WIKITYPE.md`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 35 tests passed with no lint warnings.
- **Issues / notes:** None.
- **Commit:** `9a4e190f98d5cd74f781e76b56bfb59c1d00398d`
- **Next task:** 5.1

#### [2026-10-18 21:35] Run #11: SUCCESS
- **Tasks:** 4.1, 4.2
- **What was done:**
  - Added a responsive HUD displaying WPM, the countdown beneath it, and accuracy.
  - Added a focused hidden input for keyboard capture and per-character untyped/correct/incorrect rendering with a visible caret.
  - Added component tests for metric values, character states, caret placement, input focus, and disabled state.
- **Files changed:** `src/components/Hud.tsx`, `src/components/Hud.test.tsx`, `src/components/TypingArea.tsx`, `src/components/TypingArea.test.tsx`, `src/components/TypingPage.css`, `WIKITYPE.md`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 34 tests passed with no lint warnings.
- **Issues / notes:** Smooth line auto-scroll remains task 4.3.
- **Commit:** `dacd1bbd3b1110c98fcb580b1e6baa5cfa2acf24`
- **Next task:** 4.3

#### [2026-10-18 21:33] Run #10: FAILED
- **Tasks:** 4.1, 4.2 (in progress)
- **What was done:** Added the HUD and typing passage components with styles and tests.
- **Files changed:** `src/components/Hud.tsx`, `src/components/TypingArea.tsx`, `src/components/TypingPage.css`, component tests
- **Verification:** `npm run typecheck` and `npm run lint` passed; `npm run test` failed because rendered DOM from prior tests remained mounted, causing ambiguous accessible-label queries; build was not run because the chain stopped.
- **Issues / notes:** Added explicit RTL cleanup after each test; verified in Run #11.
- **Next task:** 4.1

#### [2026-10-18 21:29] Run #9: SUCCESS
- **Tasks:** 2.2–2.4
- **What was done:**
  - Connected debounced Wikipedia search results to an accessible listbox with arrow-key navigation and mouse selection.
  - Added Enter handling that selects the highlighted result or submitted query and switches app state to the typing view.
  - Added a 300 ms fade/slide page transition with a reduced-motion fallback and covered the query-submit transition in tests.
- **Files changed:** `src/App.tsx`, `src/App.test.tsx`, `src/components/SearchBar.tsx`, `src/components/SuggestionList.tsx`, `src/styles/index.css`, `WIKITYPE.md`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 29 tests passed with no lint warnings.
- **Issues / notes:** The typing view is intentionally a route shell until Phase 4 supplies article loading and typing UI.
- **Commit:** `a3e02ca36bc857807a38ff07048c8d6c1c5f2962`
- **Next task:** 4.1

#### [2026-10-18 21:27] Run #8: SUCCESS
- **Tasks:** 3.1–3.3
- **What was done:**
  - Implemented the pure typing reducer, keystroke tracking, WPM/accuracy calculations, countdown expiration, and early finish on passage completion.
  - Added `useTypingTest` with first-character timer start, one-second updates, keyboard filtering/default prevention, input locking, and reset behavior.
  - Added reducer and hook tests, including timer, backspace, metrics, lock, and early-finish cases.
- **Files changed:** `src/lib/typingEngine.ts`, `src/lib/typingEngine.test.ts`, `src/hooks/useTypingTest.ts`, `src/hooks/useTypingTest.test.ts`, `WIKITYPE.md`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 28 tests passed with no lint warnings.
- **Issues / notes:** Phase 2's uncommitted UI work was preserved and not included.
- **Commit:** `c6de6ea5aaa0ce5a97b241c5b00088b577e357e6`
- **Next task:** 2.2

#### [2026-10-18 21:26] Run #7: FAILED
- **Tasks:** 3.1–3.3 (in progress)
- **What was done:**
  - Implemented the typing reducer, metrics, countdown/keyboard hook, and Phase 3 tests.
  - Fixed a test setup issue and impure render-time clock read discovered during validation.
- **Files changed:** `src/lib/typingEngine.ts`, `src/hooks/useTypingTest.ts`, and Phase 3 tests
- **Verification:** `npm run typecheck` passed; `npm run lint` passed with one `react/purity` warning; `npm run test` failed because `App.test.tsx` briefly imported a missing `App` module while Phase 2 work was in progress, and one countdown test advanced timers before the hook interval was installed; build was not run because the chain stopped.
- **Issues / notes:** The countdown test and lint warning are fixed. The Phase 2 app/test files have since resolved; rerun the full suite. No Phase 2 files were edited.
- **Next task:** 3.1

#### [2026-10-18 21:24] Run #6: SUCCESS
- **Tasks:** 2.1
- **What was done:**
  - Replaced the Vite starter screen with WikiType's solid-black, full-height landing view.
  - Added a centered, controlled SearchBar with the exact specified placeholder, autofocus, accessible label, and responsive styling.
  - Updated the landing-page smoke test.
- **Files changed:** `src/App.tsx`, `src/App.test.tsx`, `src/components/SearchBar.tsx`, `src/styles/index.css`, `WIKITYPE.md`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 15 tests passed with no lint warnings.
- **Issues / notes:** The SearchBar's controlled query state is ready for Phase 2.2 suggestions.
- **Commit:** `2b807d952617d8595edeeb828ca2353874ad89f4`
- **Next task:** 2.2

#### [2026-10-18 21:18] Run #5: SUCCESS
- **Tasks:** 0.3, 0.4, 1.1–1.4
- **What was done:** Re-ran the complete prescribed validation chain against the preserved shared worktree after excluding the concurrent Phase 2 stylesheet and UI files from this task's changes.
- **Files changed:** `src/hooks/useDebounce.ts`, `src/hooks/useWikiSearch.ts`, `src/hooks/useWikiSearch.test.ts`, `src/lib/wikipedia.ts`, `src/lib/wikipedia.test.ts`, `src/types/index.ts`, `tsconfig.app.json`, `tsconfig.node.json`, `WIKITYPE.md`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 15 tests passed, no lint warnings.
- **Issues / notes:** Concurrent Phase 2.1 files remain untouched and unstaged.
- **Commit:** `8f9333d609e70fe6bd40a045166f9916981ed3fb`
- **Next task:** 2.1

#### [2026-10-18 21:16] Run #4: SUCCESS
- **Tasks:** 0.3, 0.4, 1.1–1.4
- **What was done:**
  - Confirmed the section 7 scaffold structure and enabled strict TypeScript checking in both TypeScript projects.
  - Implemented the Wikipedia OpenSearch/article API, fallback intro fetching, and keyboard-safe text normalization.
  - Added debounced, abortable search hooks and tests for API behavior, normalization, loading, empty/error states, and stale requests.
- **Files changed:** `src/hooks/useDebounce.ts`, `src/hooks/useWikiSearch.ts`, `src/hooks/useWikiSearch.test.ts`, `src/lib/wikipedia.ts`, `src/lib/wikipedia.test.ts`, `src/types/index.ts`, `tsconfig.app.json`, `tsconfig.node.json`, `WIKITYPE.md`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 15 tests passed with no lint warnings.
- **Issues / notes:** Concurrent Phase 2.1 UI edits were left untouched and unstaged.
- **Commit:** `8f9333d609e70fe6bd40a045166f9916981ed3fb`
- **Next task:** 2.1

#### [2026-10-18 21:13] Run #3: SUCCESS
- **Tasks:** 0.3, 0.4, 1.1–1.4
- **What was done:** The full validation chain passed after fixing the first test failure. Oxlint emitted one `no-control-regex` warning, subsequently resolved and verified in Run #4.
- **Files changed:** Phase 0 scaffold and Phase 1 data layer files
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed; 15 tests passed.
- **Issues / notes:** Included in the final verified changes recorded in Run #4.
- **Commit:** `8f9333d609e70fe6bd40a045166f9916981ed3fb`
- **Next task:** 2.1

#### [2026-10-18 21:11] Run #2: FAILED
- **Tasks:** 0.3, 0.4, 1.1–1.4 (in progress)
- **What was done:**
  - Added the remaining scaffold placeholders and moved the global stylesheet under `src/styles/`.
  - Implemented the Wikipedia search/article API, text normalization, and debounced search hooks with unit tests.
  - Enabled strict TypeScript checking in both project configs.
- **Files changed:** `src/`, `tsconfig.app.json`, `tsconfig.node.json`
- **Verification:** `npm run typecheck` passed; `npm run lint` completed with two warnings; `npm run test` failed (14 passed, one failed: whitespace was removed rather than collapsed); build was not run because the chain stopped.
- **Issues / notes:** Fix normalization whitespace ordering and address the two Oxlint warnings before the next full run.
- **Next task:** 0.3

#### [2026-10-18 20:56] Run #1: SUCCESS
- **Tasks:** 0.2
- **What was done:**
  - Added Tailwind CSS v4 and the Vite plugin, including the CSS import.
  - Added Vitest, jsdom, React Testing Library, jest-dom setup, and a scaffold smoke test; retained Oxlint and added all required npm scripts.
  - Added `.env*` to `.gitignore`.
- **Files changed:** `.gitignore`, `package.json`, `package-lock.json`, `src/index.css`, `src/App.test.tsx`, `src/test/setup.ts`, `vite.config.ts`, `WIKITYPE.md`
- **Verification:** `npm run typecheck && npm run lint && npm run test && npm run build` — all passed (1 test); `npm install` reported 0 vulnerabilities.
- **Issues / notes:** None.
- **Commit:** `4726e9797293800631d74a7c20fba0e1e95c5eab`
- **Next task:** 0.3

#### [2026-10-18 12:51] Run #0: SUCCESS (manual)
- **Tasks:** 0.1
- **What was done:** Project scaffolded with `create-vite` (React + TypeScript template, Oxlint, npm). Dev server confirmed running at http://localhost:5173/.
- **Files changed:** entire initial scaffold
- **Verification:** `npm run dev` starts cleanly; 0 vulnerabilities reported by npm.
- **Issues / notes:** Oxlint chosen instead of ESLint (see Decision Log).
- **Next task:** 0.2

_(Agents add new entries above this line, newest first.)_

---

## 13. Decision Log

Record any deviation from this document (stack change, spec change, new dependency) with date and reason.

| Date | Decision | Reason |
|---|---|---|
| 2026-10-18 | Use **Oxlint** instead of ESLint; keep Prettier | Chosen in the create-vite prompt; faster, already wired up |
| 2026-10-18 | Use **Tailwind v4** with `@tailwindcss/vite` (no `tailwind.config`, no `init`) | Current Tailwind setup for Vite; the old `npx tailwindcss init -p` no longer exists |
| 2026-10-18 | Agents commit and push to `main` after each successful run | User wants automatic pushes and restore points; repo: github.com/Dyed-RON/Wikityper |
| 2026-10-18 | Keep typing active until the 30-second timer expires, extending the visible passage progressively and wrapping through the fetched extract if needed | User-directed behavior change supersedes the original early-finish rule |

---

## 14. Copy-Paste Prompt for Launching an Agent

```
You are building the WikiType project. Read WIKITYPE.md in the repo root completely.
Follow the Agent Operating Rules in section 1. Take the next unchecked task in the
Roadmap (section 11). Implement it, then run:
  npm run typecheck && npm run lint && npm run test && npm run build
If everything passes, tick the task(s) in section 11, update Current Status
(section 12.1), append a Progress Log entry (section 12.3) using the template, then
commit and push to origin main as described in rule 10 (never force-push), and put
the commit hash in the log entry.
If anything fails, fix it; if you cannot, log a FAILED entry with details and stop
(do not push broken code).
Stack notes: Oxlint (not ESLint) and Tailwind v4 are already decided; see section 13.
Do not do work outside the Roadmap. Do not edit the spec without a Decision Log entry.
```

For parallel agents, give each a different **phase** and have them only edit files in their own area. Tell them to re-read this file before logging, so entries do not overwrite each other.
