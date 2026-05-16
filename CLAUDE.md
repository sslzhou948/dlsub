# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Chrome Extension (Manifest V3) that adds bilingual (English + Chinese) subtitle translations to deeplearning.ai course videos. Uses a BYOK (Bring Your Own Key) model — users supply their own OpenAI-compatible API key. Zero runtime npm dependencies; no server infrastructure.

**Current status**: Planning/documentation complete; development not yet started. Read `HANDOFF.md` first to understand the current phase before doing any work.

## Commands

These will be available after Phase 0 initialization:

```bash
npm install          # Install dev dependencies (Jest, Playwright, ESLint, Prettier)
npm test             # Run Jest unit tests
npm test -- --coverage  # Run tests with coverage report
npx playwright test  # Run E2E tests
npm run lint         # ESLint check
npm run format       # Prettier format
```

To load the extension in Chrome: go to `chrome://extensions/`, enable Developer mode, click "Load unpacked", select the project root.

## Architecture

```
Content Script (runs on learn.deeplearning.ai/courses/*/lesson/*)
  └─ SubtitleObserver    — MutationObserver on .vds-captions DOM node
  └─ TranslationCache    — In-memory LRU cache (max 500 entries, key: cueId+text)
  └─ MessageBus          — sendMessage to Service Worker for API calls
  └─ TranslationOverlay  — Injects translated <span> as sibling inside .vds-captions
  └─ ControlPanel        — Embedded UI in .vds-controls-group

Service Worker
  └─ Receives TRANSLATE messages from content script
  └─ Reads chrome.storage.sync for API key/endpoint config
  └─ Calls OpenAI-compatible /v1/chat/completions

Options Page (React SPA)
  └─ API key, base URL, model configuration
```

**Key design decisions:**
- MutationObserver (not textTrack events) because Vidstack replaces DOM nodes rather than updating text
- Translation requests go through the Service Worker to bypass CSP restrictions on Content Scripts
- Translated text appended as sibling node (not replacing existing node) to avoid breaking Vidstack state
- 300ms debounce on subtitle changes (Vidstack may fire multiple DOM mutations per cue)
- Cache key is `cueId + text` (VTT sequence number + subtitle text)

## Critical DOM Selectors

```javascript
'.vds-captions[data-part="captions"]'   // Subtitle container to observe
'.vds-captions [data-part="cue"]'        // Current subtitle text node
'.vds-controls-group'                    // Where control panel icons are injected
'[aria-label="Video Player"]'            // Player root container
```

URL match pattern for the content script: `https://learn.deeplearning.ai/courses/*/lesson/*`

## Development Plan

The project follows strict TDD: write tests first, then implement. Phases are defined in `docs/dev-plan.md`:

| Phase | Module |
|-------|--------|
| 0 | Project init (npm, Jest, Playwright, manifest.json, constants.js) |
| 1 | `src/shared/storage.js` |
| 2 | `src/shared/messages.js` |
| 3 | `src/content/translation-cache.js` |
| 4 | `src/background/service-worker.js` |
| 5 | `src/content/subtitle-observer.js` |
| 6 | `src/content/translation-overlay.js` |
| 7 | `src/content/control-panel.js` |
| 8 | `src/content/index.js` |
| 9 | `src/options/` |
| 10 | Playwright E2E tests |
| 11 | Release prep |

After completing each phase, update `HANDOFF.md` to reflect the new status.

## Key Documentation

- `HANDOFF.md` — current session state and next steps (read this first)
- `docs/dev-plan.md` — detailed phase-by-phase task list with test cases
- `docs/architecture.md` — full file structure and module responsibilities
- `docs/research-report.md` — DOM analysis of deeplearning.ai, CSS selectors, risks
- `docs/PRD.md` — v1.0 scope and explicitly out-of-scope features
