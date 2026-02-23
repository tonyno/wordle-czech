# Wordle Czech — Major Refactoring Plan

## Context

The app (hadejslova.cz, 600k users) stores all user data in localStorage, which is lost on device change, browser reinstall, or memory pressure. This refactoring makes Firestore the source of truth, with localStorage as a cache. Users get a 10-char alphanumeric token for cross-device access, with optional Google Auth for seamless sync.

## Collection Audit

**Used in code — KEEP:**
- `word` — word of the day (READ client, WRITE cloud function)
- `gameResult` — individual game results for stats aggregation
- `gameStats` — aggregated daily stats (`wordle`, `wordle2`)
- `content` — FAQ content (document `faq`)
- `allResults` — user backup (will keep writing for backward compat)
- `savedGames` — Google-authed user saves (will keep writing for backward compat)
- `sharedResult` — shared results with nickname

**NOT referenced in code — SAFE TO DELETE:**
- `stats` — commented out, unused
- `test_word5` — not referenced
- `test_word6` — not referenced
- `word2` — not referenced
- `faq` — not a top-level collection; FAQ is at `content/faq`

## New Firestore Data Model

```
players/{token}                              # 10-char alphanumeric
  token: string
  googleUid: string | null
  nickname: string
  darkMode: boolean
  colorBlindMode: boolean
  bigFont: boolean
  createdAt: Timestamp
  migratedFromUserId: string | null          # old UUID for traceability

players/{token}/games/{gameId}               # gameId = "wordle5_day{solutionIndex}"
  gameType: "wordle5"                        # future: "wordle6", "sudoku"
  solutionIndex: number
  guesses: string[]
  isGameWon: boolean
  isGameLoose: boolean
  solutionMd5: string
  startTime: number | null
  endTime: number | null

players/{token}/stats/{gameType}             # gameType = "wordle5"
  guessesDistribution: number[7]
  gamesPlayed: number
  lastUpdated: Timestamp
```

**Key design decisions:**
- One Firestore doc per game day — scales to unlimited days, loads only what's needed
- `gameType` prefix in gameId enables future games under same player
- Token as secret: knowing token = access (Firestore rules allow read/write by path, 10-char alphanumeric = 3.6 quadrillion combinations)

## Implementation Steps

### 1. New service layer

**New file: `src/lib/playerService.ts`**
- `generateToken()` — 10-char uppercase alphanumeric via `crypto.getRandomValues`
- `createPlayer(token, settings)` → writes `players/{token}`
- `getPlayer(token)` → reads `players/{token}`
- `getPlayerByGoogleUid(uid)` → queries `players` where `googleUid == uid`
- `linkGoogleUid(token, uid)` → updates player doc
- `saveGame(token, gameType, solutionIndex, gameDoc)` → writes `players/{token}/games/{gameId}`
- `getGame(token, gameType, solutionIndex)` → reads single game doc
- `getGamesRange(token, gameType, fromDay, toDay)` → reads range for history/stats views
- `getPlayerStats(token, gameType)` / `updatePlayerStats(token, gameType, stats)` → read/write stats
- `mergeTokens(sourceToken, targetToken)` → copies games from source to target, merge conflicts: keep winning game (win > loss; fewer guesses wins ties)

**New file: `src/lib/syncService.ts`**
- `initializePlayer()` — on app load:
  1. Check localStorage for `token`
  2. If found, verify player exists in Firestore
  3. If no token but old `userId` exists → generate token, migrate localStorage data to Firestore (batch writes, max 500/batch)
  4. If nothing exists → generate token, create empty player
  5. Return token
- `loadTodaysGame(token, solutionIndex)` — try localStorage cache first, fall back to Firestore
- `saveGuess(token, playContext, guesses, isWon, isLoose, startTime, endTime)` — write to localStorage cache + Firestore + legacy collections (`gameResult`, `allResults`)
- `enterExternalToken(currentToken, enteredToken)` — verify exists, merge, switch localStorage to new token

### 2. Modify existing files

**`src/lib/localStorage.ts`**
- Add `token` field to `SettingsItem`
- Add `getToken()` / `setToken()` helpers
- Add `getMigrationStatus()` / `setMigrationStatus()`
- Keep all existing functions (they become cache layer)

**`src/lib/playContext.ts`**
- Add `gameType: GameType` to `PlayContext` (default `"wordle5"`)

**`src/lib/authorization.ts`** — Rewrite:
- `signInWithGoogle()` — after sign-in, look up player by Google UID; if found, merge and switch to that token; if not, link current token to UID
- `signOutUser()` — keep as-is
- Remove `saveGames()` (replaced by syncService)

**`src/lib/dataAdapter.ts`**
- Keep all existing functions (backward compat writes to `gameResult`, `allResults`, `savedGames`, `sharedResult`)
- Update `saveSharedResult` to work with token
- Keep `useGetWordOfDay`, `useGetFaq`, `useGetStats` unchanged

**`src/components/WordlePlay.tsx`**
- On mount: use `syncService.loadTodaysGame()` instead of `loadGameStateFromLocalStorage()`
- On guess/game end: use `syncService.saveGuess()` instead of direct localStorage + Firebase calls
- Remove `migration1()` call (migration handled by `initializePlayer`)
- Remove direct calls to `saveAllResultsToFirebase()`, `saveGames()`

**`src/App.tsx`**
- Add `useEffect` calling `syncService.initializePlayer()` on mount
- Store token in React context (new `PlayerContext`)
- Add `<TokenDisplay />` at bottom of page
- Pass token down to components that need it

**`src/components/settings/Settings.tsx`**
- Remove "Zatim nefunkcni" label
- Working Google login: sign in → link token → show success
- Show token with copy button and share button (Web Share API)
- Add "Enter token from another device" input with merge button
- Remove old userId display

### 3. New UI components

**New: `src/components/TokenDisplay.tsx`**
- Small footer bar showing token with copy/share buttons
- "Enter code from another device" button that opens modal

**New: `src/components/modals/EnterTokenModal.tsx`**
- Text input for 10-char token
- Verify button → calls `syncService.enterExternalToken()`
- Shows merge result (X games merged, Y conflicts resolved)
- Error handling (invalid token, network error)

**New: `src/lib/PlayerContext.tsx`**
- React context providing `{ token, player, refreshPlayer }` to component tree

### 4. Cloud function — new per-day stats

**`functions/src/index.ts`**
- Add new scheduled function `statisticsNew` (runs alongside existing `statistics`)
- Reads from same `gameResult/day{X}/result` source
- Writes to `dailyStats/wordle5_day{index}` — one doc per day (no size limit issues)
- Existing `statistics` function continues writing to `gameStats/wordle` and `gameStats/wordle2` unchanged

### 5. Statistics views — load efficiently

**`src/components/statistics/statisticsLib.ts`**
- Add function to load player's games for a date range from Firestore (for history view)
- Personal stats: load from `players/{token}/stats/wordle5` instead of localStorage
- All-users stats: keep loading from `gameStats/wordle` + `gameStats/wordle2` (existing)

### 6. Migration safety

Migration flow for existing user (first visit after deployment):
1. `initializePlayer()` detects `settings.userId` but no `token` in localStorage
2. Generates 10-char token, collision-checked against Firestore
3. Reads all data from localStorage (`actualGameState`, `stats`, `settings`)
4. Creates `players/{token}` with `migratedFromUserId: oldUuid`
5. Batch-writes each day's game to `players/{token}/games/wordle5_day{X}`
6. Writes stats to `players/{token}/stats/wordle5`
7. Stores token in localStorage, sets `migrationStatus: "completed"`
8. Old localStorage data never deleted
9. Continues writing to old collections for backward compat

**Safety guarantees:**
- Migration is idempotent (checked by `migrationStatus` key)
- If Firestore write fails mid-migration, app still works from localStorage; migration retries next load
- Old collections keep receiving writes (dual-write)
- No existing Firestore collections modified in structure

### 7. Firestore security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // New player collection - token as secret
    match /players/{token} {
      allow read, write: if true;  // Knowing the path = having access
      match /games/{gameId} {
        allow read, write: if true;
      }
      match /stats/{gameType} {
        allow read, write: if true;
      }
    }
    // Keep existing rules for other collections unchanged
  }
}
```

### 8. Update CLAUDE.md

Add sections on:
- New data model (`players` collection with subcollections)
- Token-based identification system
- `playerService.ts` and `syncService.ts` architecture
- `GameType` system for future multi-game support
- Migration flow
- Dual-write strategy to legacy collections

## Files to create
- `src/lib/playerService.ts`
- `src/lib/syncService.ts`
- `src/lib/PlayerContext.tsx`
- `src/components/TokenDisplay.tsx`
- `src/components/modals/EnterTokenModal.tsx`

## Files to modify
- `src/lib/localStorage.ts` — add token field, migration status
- `src/lib/playContext.ts` — add gameType
- `src/lib/authorization.ts` — rewrite for token + Google linking
- `src/lib/dataAdapter.ts` — keep legacy writes, update sharedResult
- `src/components/WordlePlay.tsx` — rewire to syncService
- `src/components/WordlePlayWrapper.tsx` — pass token from context
- `src/App.tsx` — add PlayerContext, token init, TokenDisplay
- `src/components/settings/Settings.tsx` — new token UI, working Google auth
- `src/components/statistics/statisticsLib.ts` — load from Firestore
- `functions/src/index.ts` — add statisticsNew function
- `CLAUDE.md` — update with new architecture
- `firestore.rules` (if exists) — add players collection rules

## Verification plan
1. **New user flow:** Open app in incognito → token generated and shown at bottom → play a game → verify data in Firestore `players/{token}/games/`
2. **Existing user migration:** Copy current localStorage → deploy → reload → verify token created, games migrated to Firestore, old localStorage intact
3. **Cross-device:** Copy token → open on another browser → enter token → verify games merged correctly
4. **Google Auth:** Sign in with Google → verify `googleUid` linked to player doc → sign in on another device → verify same token loaded
5. **Merge conflicts:** Play day X on device A (win in 3) and device B (lose) → merge → verify winning game kept
6. **Legacy compat:** After refactoring, verify `gameResult`, `allResults`, `savedGames` still receive writes on game end
7. **Stats:** Verify personal stats load from Firestore, all-users stats unchanged
8. **Offline:** Disable network → play game → verify localStorage cache works → re-enable → verify synced to Firestore
