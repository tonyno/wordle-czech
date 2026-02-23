# CLAUDE.md

## Project Overview

Czech Wordle clone — a word guessing game with Czech words. React SPA with Firebase backend (Firestore, Auth, Hosting, Functions).

## Tech Stack

- React 17, TypeScript 4.5, MUI v5, Tailwind CSS
- Firebase (Firestore, Auth, Hosting, Cloud Functions)
- Create React App (react-scripts v5)

## Commands

```bash
# Root (React app)
npm start          # Dev server
npm run build      # Production build
npm test           # Jest + React Testing Library

# Firebase Functions (cd functions/)
npm run build      # Compile TypeScript
npm run lint       # ESLint (Google style)
npm run dev        # Watch mode + emulator
npm run serve      # Build + emulator
```

## Project Structure

- `src/components/` — React UI components (grid, keyboard, statistics, modals, etc.)
- `src/lib/` — Business logic and utilities (Firebase adapter, localStorage, auth, word lists)
- `src/constants/` — Constants and word lists
- `functions/src/` — Firebase Cloud Functions (TypeScript)
- `data_prepare/`, `data_calculate/` — Offline data/stats scripts

## Key Conventions

- Czech UI, English code
- Component files in `src/components/`, logic in `src/lib/`
- ESLint: `react-app` preset in root, Google style in `functions/`
- TypeScript strict mode enabled
- State: React state + localStorage (cache) + Firestore (source of truth)
- Sensitive config: copy `settingsFirebase.example.ts` → `settingsFirebase.ts`, `wordlist.example.ts` → `wordlist.ts`

## Data Model — Players Collection

Players are identified by a 10-char alphanumeric token stored in localStorage and used as Firestore document ID.

```
players/{token}                              # PlayerDoc
players/{token}/games/{gameId}               # GameDoc (gameId = "wordle5_day{N}")
players/{token}/stats/{gameType}             # PlayerStats (gameType = "wordle5")
```

### Key services

- `src/lib/playerService.ts` — CRUD for player docs, games, stats, token generation, merge logic
- `src/lib/syncService.ts` — Orchestrates init, migration from old localStorage/userId, dual-write (new player model + legacy collections)
- `src/lib/PlayerContext.tsx` — React context providing `{ token, loading, refreshToken }`

### Token-based identification

- Token = 10-char uppercase alphanumeric (A-Z, 0-9), generated via `crypto.getRandomValues`
- Knowing token = access (Firestore rules allow read/write by path)
- Optional Google Auth links `googleUid` to player doc for seamless cross-device sync

### GameType system

- Current: `"wordle5"` — 5-letter Czech Wordle
- Designed for future games under the same player (e.g., `"wordle6"`, `"sudoku"`)

### Migration flow (existing users)

1. On first visit after deploy, `initializePlayer()` detects old `userId` but no `token`
2. Generates token, creates player doc with `migratedFromUserId`
3. Batch-writes localStorage games to Firestore
4. Old localStorage data preserved, old collections still receive writes (dual-write)

### Dual-write strategy

Every game save writes to:
1. localStorage (cache)
2. `players/{token}/games/` (new source of truth)
3. `gameResult/` (legacy, for stats aggregation)
4. `allResults/` (legacy, backward compat)

### Cloud Functions

- `statistics` — existing, writes to `gameStats/wordle` and `gameStats/wordle2`
- `statisticsNew` — new, writes one doc per day to `dailyStats/wordle5_day{N}`
