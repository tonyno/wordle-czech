import md5 from "md5";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  createPlayer,
  GameDoc,
  GameType,
  generateToken,
  getGame,
  getPlayer,
  mergeTokens,
  saveGame,
  updatePlayerStats,
  getPlayerStats,
} from "./playerService";
import { firestore } from "./settingsFirebase";
import {
  GameStateHistory,
  getFinishedGameStatsFromLocalStorage,
  getSettings,
  loadGameStateFromLocalStorageNew,
  saveGameStateToLocalStorage,
  updateFinishedGameStats,
} from "./localStorage";
import { PlayContext } from "./playContext";
import {
  saveAllResultsToFirebase,
  saveGameResultFirebase,
} from "./dataAdapter";
import { PlayState } from "./statuses";
import { auth } from "./settingsFirebase";
import { onAuthStateChanged } from "firebase/auth";
import { getPlayerByGoogleUid, linkGoogleUid } from "./playerService";
import {
  GAME_TYPE_WORDLE5,
  LEGACY_WRITES_ENABLED,
  incrementGuessDistribution,
  EMPTY_DISTRIBUTION,
} from "./statsCalculation";

const TOKEN_KEY = "playerToken";
const MIGRATION_KEY = "tokenMigrationStatus";

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

const getMigrationStatus = (): string | null => {
  return localStorage.getItem(MIGRATION_KEY);
};

const setMigrationStatus = (status: string): void => {
  localStorage.setItem(MIGRATION_KEY, status);
};

/** Wait for Firebase Auth to resolve the persisted session (resolves once). */
const waitForAuthReady = (): Promise<void> =>
  new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe();
      resolve();
    });
  });

export const initializePlayer = async (): Promise<string> => {
  await waitForAuthReady();
  const googleUser = auth.currentUser;
  const googleUid = googleUser?.uid || null;

  // 1. Check for existing token
  const existingToken = getToken();
  if (existingToken) {
    // Verify player exists in Firestore
    try {
      const player = await getPlayer(existingToken);
      if (player) {
        // Link Google UID if signed in but not yet linked
        if (googleUid && !player.googleUid) {
          await linkGoogleUid(existingToken, googleUid);
        }
        return existingToken;
      }
    } catch (err) {
      console.error("Error verifying player, continuing with token:", err);
      return existingToken;
    }
    // Player doesn't exist in Firestore — recreate
    const settings = getSettings(false);
    try {
      await createPlayer(existingToken, {
        nickname: settings.nickname,
        darkMode: settings.darkMode,
        colorBlindMode: settings.colorBlindMode,
        bigFont: settings.bigFont,
      });
      if (googleUid) {
        await linkGoogleUid(existingToken, googleUid);
      }
    } catch (err) {
      console.error("Error recreating player:", err);
    }
    return existingToken;
  }

  // 2. If signed into Google, check if a player already exists for this UID
  if (googleUid) {
    try {
      const existing = await getPlayerByGoogleUid(googleUid);
      if (existing) {
        setToken(existing.token);
        return existing.token;
      }
    } catch (err) {
      console.error("Error looking up player by Google UID:", err);
    }
  }

  // 3. Check for old userId — migration path
  const settings = getSettings(false);
  const oldUserId = settings.userId;

  const token = generateToken();

  try {
    await createPlayer(token, {
      nickname: settings.nickname,
      darkMode: settings.darkMode,
      colorBlindMode: settings.colorBlindMode,
      bigFont: settings.bigFont,
      migratedFromUserId: oldUserId,
    });

    // Link Google UID if already signed in
    if (googleUid) {
      await linkGoogleUid(token, googleUid);
    }

    // Migrate existing localStorage data to Firestore
    if (getMigrationStatus() !== "completed") {
      await migrateLocalStorageToFirestore(token);
      setMigrationStatus("completed");
    }
  } catch (err) {
    console.error("Error during player creation/migration:", err);
    // App still works from localStorage
  }

  setToken(token);
  return token;
};

const migrateLocalStorageToFirestore = async (
  token: string
): Promise<void> => {
  const history = loadGameStateFromLocalStorageNew();
  if (!history) return;

  const entries = Object.entries(history);
  const gameType: GameType = GAME_TYPE_WORDLE5;

  // Write games in chunks of 500 (Firestore batch limit)
  for (let i = 0; i < entries.length; i++) {
    const [key, item] = entries[i];
    const match = key.match(/^day(\d+)$/);
    if (!match) continue;

    const solutionIndex = parseInt(match[1], 10);
    if (isNaN(solutionIndex)) continue;

    const gameDoc: GameDoc = {
      gameType,
      solutionIndex,
      guesses: item.guesses || [],
      isGameWon: item.isGameWon || false,
      isGameLoose: item.isGameLoose || false,
      solutionMd5: item.solutionMd5 || "",
      startTime: item.startTime || null,
      endTime: item.endTime || null,
    };

    try {
      await saveGame(token, gameType, solutionIndex, gameDoc);
    } catch (err) {
      console.error(`Error migrating game day${solutionIndex}:`, err);
    }
  }

  // Migrate stats
  const localStats = getFinishedGameStatsFromLocalStorage();
  if (localStats && localStats.guessesDistribution) {
    const gamesPlayed = localStats.guessesDistribution.reduce(
      (a, b) => a + b,
      0
    );
    try {
      await updatePlayerStats(token, gameType, {
        guessesDistribution: localStats.guessesDistribution,
        gamesPlayed,
        lastUpdated: Timestamp.now(),
      });
    } catch (err) {
      console.error("Error migrating stats:", err);
    }
  }
};

export const loadTodaysGame = async (
  token: string,
  playContext: PlayContext
): Promise<{
  guesses: string[];
  isGameWon: boolean;
  isGameLoose: boolean;
  startTime?: number;
  endTime?: number;
} | null> => {
  try {
    const game = await getGame(token, GAME_TYPE_WORDLE5, playContext.solutionIndex);
    if (game) {
      return {
        guesses: game.guesses,
        isGameWon: game.isGameWon,
        isGameLoose: game.isGameLoose,
        startTime: game.startTime || undefined,
        endTime: game.endTime || undefined,
      };
    }
  } catch (err) {
    console.error("Error loading game from Firestore:", err);
  }
  return null;
};

const saveGameToFirestore = async (
  token: string,
  gameDoc: GameDoc
): Promise<void> => {
  await saveGame(
    token,
    GAME_TYPE_WORDLE5,
    gameDoc.solutionIndex,
    gameDoc
  );
};

const saveLegacyCollections = (
  playContext: PlayContext,
  guesses: string[],
  isGameWon: boolean,
  numberOfGuesses: number,
  duration?: number
): void => {
  if (!LEGACY_WRITES_ENABLED) return;

  const result: PlayState = isGameWon ? "win" : "loose";

  // Legacy: gameResult collection (read by `statistics` cloud function)
  saveGameResultFirebase(
    playContext,
    "TBD",
    result,
    guesses,
    numberOfGuesses,
    duration
  );

  // Legacy: allResults collection (backward compat)
  saveAllResultsToFirebase();
};

const updateAllStats = async (
  token: string,
  isGameWon: boolean,
  numberOfGuesses: number
): Promise<void> => {
  // Update localStorage stats
  updateFinishedGameStats(isGameWon, numberOfGuesses);

  // Update Firestore player stats
  const existing = await getPlayerStats(token, GAME_TYPE_WORDLE5);
  const dist = existing
    ? incrementGuessDistribution(
        existing.guessesDistribution,
        isGameWon,
        numberOfGuesses
      )
    : incrementGuessDistribution(
        [...EMPTY_DISTRIBUTION],
        isGameWon,
        numberOfGuesses
      );
  const gamesPlayed = (existing?.gamesPlayed || 0) + 1;
  await updatePlayerStats(token, GAME_TYPE_WORDLE5, {
    guessesDistribution: dist,
    gamesPlayed,
    lastUpdated: Timestamp.now(),
  });
};

export type SaveGuessResult = {
  success: boolean;
  errors: string[];
};

export const saveGuess = async (
  token: string,
  playContext: PlayContext,
  guesses: string[],
  isGameWon: boolean,
  isGameLoose: boolean,
  startTime?: number,
  endTime?: number
): Promise<SaveGuessResult> => {
  const errors: string[] = [];

  // 1. Save to localStorage (cache)
  saveGameStateToLocalStorage(
    guesses,
    playContext,
    isGameWon,
    isGameLoose,
    startTime,
    isGameWon || isGameLoose ? endTime : undefined
  );

  // 2. Save to Firestore (new player model)
  const gameDoc: GameDoc = {
    gameType: GAME_TYPE_WORDLE5,
    solutionIndex: playContext.solutionIndex,
    guesses,
    isGameWon,
    isGameLoose,
    solutionMd5: md5(playContext.solution),
    startTime: startTime || null,
    endTime: endTime || null,
  };

  try {
    await saveGameToFirestore(token, gameDoc);
  } catch (err) {
    console.error("Error saving game to Firestore:", err);
    errors.push("Firestore game save failed");
  }

  // 3. On game end, do legacy writes + stats update
  if (isGameWon || isGameLoose) {
    const numberOfGuesses = guesses.length - 1;
    const duration =
      startTime && endTime ? endTime - startTime : undefined;

    saveLegacyCollections(
      playContext,
      guesses,
      isGameWon,
      numberOfGuesses,
      duration
    );

    try {
      await updateAllStats(token, isGameWon, numberOfGuesses);
    } catch (err) {
      console.error("Error updating player stats:", err);
      errors.push("Stats update failed");
    }
  }

  return { success: errors.length === 0, errors };
};

export const enterExternalToken = async (
  currentToken: string,
  enteredToken: string
): Promise<{ success: boolean; totalGames: number; merged: number; conflicts: number; error?: string }> => {
  // Validate format
  if (!/^[A-Z0-9]{10}$/.test(enteredToken)) {
    return { success: false, totalGames: 0, merged: 0, conflicts: 0, error: "Neplatný formát kódu. Kód musí mít 10 znaků (A-Z, 0-9)." };
  }

  if (enteredToken === currentToken) {
    return { success: false, totalGames: 0, merged: 0, conflicts: 0, error: "Nelze sloučit se stejným kódem." };
  }

  // Verify target token exists and count its games
  let totalGames = 0;
  try {
    const player = await getPlayer(enteredToken);
    if (!player) {
      return { success: false, totalGames: 0, merged: 0, conflicts: 0, error: "Kód nebyl nalezen." };
    }
    const stats = await getPlayerStats(enteredToken, GAME_TYPE_WORDLE5);
    if (stats) {
      totalGames = stats.gamesPlayed;
    }
  } catch (err) {
    return { success: false, totalGames: 0, merged: 0, conflicts: 0, error: "Chyba při ověřování kódu." };
  }

  // Merge current into target (copies any games from current device to target)
  try {
    const result = await mergeTokens(currentToken, enteredToken);
    totalGames += result.merged; // add newly merged games to total
    // Switch to new token
    setToken(enteredToken);
    return { success: true, totalGames, merged: result.merged, conflicts: result.conflicts };
  } catch (err) {
    return { success: false, totalGames: 0, merged: 0, conflicts: 0, error: "Chyba při slučování dat." };
  }
};

/**
 * Loads all games for a player from Firestore and returns them
 * in the GameStateHistory format (compatible with statisticsLib).
 */
export const loadAllGamesFromFirestore = async (
  token: string
): Promise<GameStateHistory> => {
  const gamesRef = collection(firestore, "players", token, "games");
  const snap = await getDocs(gamesRef);
  const history: GameStateHistory = {};
  snap.forEach((d) => {
    const game = d.data() as GameDoc;
    const key = "day" + game.solutionIndex;
    history[key] = {
      guesses: game.guesses,
      isGameWon: game.isGameWon,
      isGameLoose: game.isGameLoose,
      solutionMd5: game.solutionMd5,
      startTime: game.startTime || undefined,
      endTime: game.endTime || undefined,
    };
  });
  return history;
};

/**
 * Hook that returns game history from database
 */
export const useGameHistory = (
  token: string | null
): { history: GameStateHistory | undefined; loading: boolean } => {
  const [history, setHistory] = useState<GameStateHistory | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    loadAllGamesFromFirestore(token)
      .then((data) => {
        if (!cancelled) {
          setHistory(data);
        }
      })
      .catch((err) => {
        console.error("Error loading games from Firestore:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return { history, loading };
};

/**
 * Hook that returns personal stats: tries localStorage first,
 * falls back to Firestore player stats.
 */
export const usePersonalStats = (
  token: string | null
): {
  stats: { guessesDistribution: number[] } | undefined;
  loading: boolean;
} => {
  const [stats, setStats] = useState<
    { guessesDistribution: number[] } | undefined
  >(undefined);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getPlayerStats(token, GAME_TYPE_WORDLE5)
      .then((data) => {
        if (!cancelled && data) {
          setStats({
            guessesDistribution: data.guessesDistribution,
          });
        }
      })
      .catch((err) => {
        console.error("Error loading stats from Firestore:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return { stats, loading };
};
