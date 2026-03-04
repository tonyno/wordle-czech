import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "./settingsFirebase";
import {
  GAME_TYPE_WORDLE5,
  computeGuessDistribution,
} from "./statsCalculation";

export type GameType = "wordle5";

export type PlayerDoc = {
  token: string;
  googleUid: string | null;
  nickname: string;
  darkMode: boolean;
  colorBlindMode: boolean;
  bigFont: boolean;
  createdAt: Timestamp;
  migratedFromUserId: string | null;
};

export type GameDoc = {
  gameType: GameType;
  solutionIndex: number;
  guesses: string[];
  isGameWon: boolean;
  isGameLoose: boolean;
  solutionMd5: string;
  startTime: number | null;
  endTime: number | null;
};

export type PlayerStats = {
  guessesDistribution: number[];
  gamesPlayed: number;
  lastUpdated: Timestamp;
};

export type AllGamesDoc = {
  gameType: GameType;
  lastUpdated: Timestamp;
  games: Record<string, GameDoc>;
};

const TOKEN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TOKEN_LENGTH = 10;

export const generateToken = (): string => {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join("");
};

export const gameId = (
  gameType: GameType,
  solutionIndex: number
): string => {
  return `${gameType}_day${solutionIndex}`;
};

export const createPlayer = async (
  token: string,
  settings: {
    nickname?: string;
    darkMode?: boolean;
    colorBlindMode?: boolean;
    bigFont?: boolean;
    migratedFromUserId?: string;
  }
): Promise<void> => {
  const playerDoc: PlayerDoc = {
    token,
    googleUid: null,
    nickname: settings.nickname || "",
    darkMode: settings.darkMode || false,
    colorBlindMode: settings.colorBlindMode || false,
    bigFont: settings.bigFont || false,
    createdAt: Timestamp.now(),
    migratedFromUserId: settings.migratedFromUserId || null,
  };
  await setDoc(doc(firestore, "players", token), playerDoc);
};

export const getPlayer = async (
  token: string
): Promise<PlayerDoc | null> => {
  const snap = await getDoc(doc(firestore, "players", token));
  return snap.exists() ? (snap.data() as PlayerDoc) : null;
};

export const getPlayerByGoogleUid = async (
  uid: string
): Promise<{ token: string; player: PlayerDoc } | null> => {
  const mappingSnap = await getDoc(doc(firestore, "googleUidToToken", uid));
  if (!mappingSnap.exists()) return null;
  const { token } = mappingSnap.data() as { token: string };
  const player = await getPlayer(token);
  if (!player) return null;
  return { token, player };
};

export const savePlayerSettings = async (
  token: string,
  settings: { darkMode: boolean; colorBlindMode: boolean; bigFont: boolean; nickname: string }
): Promise<void> => {
  await setDoc(doc(firestore, "players", token), settings, { merge: true });
};

export const linkGoogleUid = async (
  token: string,
  uid: string
): Promise<void> => {
  await setDoc(
    doc(firestore, "players", token),
    { googleUid: uid },
    { merge: true }
  );
  await setDoc(doc(firestore, "googleUidToToken", uid), { token });
};

const allGamesDocRef = (token: string, gameType: GameType) =>
  doc(firestore, "players", token, "games", gameType);

export const getAllGames = async (
  token: string,
  gameType: GameType
): Promise<AllGamesDoc | null> => {
  const snap = await getDoc(allGamesDocRef(token, gameType));
  return snap.exists() ? (snap.data() as AllGamesDoc) : null;
};

export const saveGame = async (
  token: string,
  gameType: GameType,
  solutionIndex: number,
  gameDoc: GameDoc
): Promise<void> => {
  const dayKey = `day${solutionIndex}`;
  await setDoc(
    allGamesDocRef(token, gameType),
    {
      gameType,
      lastUpdated: Timestamp.now(),
      games: { [dayKey]: gameDoc },
    },
    { merge: true }
  );
};

export const saveAllGames = async (
  token: string,
  gameType: GameType,
  games: Record<string, GameDoc>
): Promise<void> => {
  const allGamesDoc: AllGamesDoc = {
    gameType,
    lastUpdated: Timestamp.now(),
    games,
  };
  await setDoc(allGamesDocRef(token, gameType), allGamesDoc);
};

export const getGame = async (
  token: string,
  gameType: GameType,
  solutionIndex: number
): Promise<GameDoc | null> => {
  const allGames = await getAllGames(token, gameType);
  if (!allGames) return null;
  const dayKey = `day${solutionIndex}`;
  return allGames.games[dayKey] || null;
};

export const getGamesRange = async (
  token: string,
  gameType: GameType,
  fromDay: number,
  toDay: number
): Promise<Map<number, GameDoc>> => {
  const result = new Map<number, GameDoc>();
  const allGames = await getAllGames(token, gameType);
  if (!allGames) return result;
  for (const [key, game] of Object.entries(allGames.games)) {
    const match = key.match(/^day(\d+)$/);
    if (!match) continue;
    const idx = parseInt(match[1], 10);
    if (idx >= fromDay && idx <= toDay) {
      result.set(idx, game);
    }
  }
  return result;
};

export const getPlayerStats = async (
  token: string,
  gameType: GameType
): Promise<PlayerStats | null> => {
  const snap = await getDoc(
    doc(firestore, "players", token, "stats", gameType)
  );
  return snap.exists() ? (snap.data() as PlayerStats) : null;
};

export const updatePlayerStats = async (
  token: string,
  gameType: GameType,
  stats: PlayerStats
): Promise<void> => {
  await setDoc(
    doc(firestore, "players", token, "stats", gameType),
    stats
  );
};

export const mergeTokens = async (
  sourceToken: string,
  targetToken: string
): Promise<{ merged: number; conflicts: number }> => {
  const sourceAllGames = await getAllGames(sourceToken, GAME_TYPE_WORDLE5);
  const targetAllGames = await getAllGames(targetToken, GAME_TYPE_WORDLE5);

  const sourceGames = sourceAllGames?.games || {};
  const targetGames = targetAllGames?.games || {};

  let merged = 0;
  let conflicts = 0;
  const mergedGames: Record<string, GameDoc> = { ...targetGames };

  for (const [dayKey, sourceGame] of Object.entries(sourceGames)) {
    const targetGame = targetGames[dayKey];
    if (targetGame) {
      // Conflict resolution: win > loss; fewer guesses wins ties
      if (sourceGame.isGameWon && !targetGame.isGameWon) {
        mergedGames[dayKey] = sourceGame;
        conflicts++;
      } else if (sourceGame.isGameWon && targetGame.isGameWon) {
        if (sourceGame.guesses.length < targetGame.guesses.length) {
          mergedGames[dayKey] = sourceGame;
        }
        conflicts++;
      } else {
        conflicts++;
      }
    } else {
      mergedGames[dayKey] = sourceGame;
      merged++;
    }
  }

  if (merged > 0 || conflicts > 0) {
    await saveAllGames(targetToken, GAME_TYPE_WORDLE5, mergedGames);
  }

  // Recalculate stats from merged games
  const finishedGames: { isGameWon: boolean; numberOfGuesses: number }[] = [];
  for (const game of Object.values(mergedGames)) {
    if (game.isGameWon || game.isGameLoose) {
      finishedGames.push({
        isGameWon: game.isGameWon,
        numberOfGuesses: game.guesses.length - 1,
      });
    }
  }
  if (finishedGames.length > 0) {
    const dist = computeGuessDistribution(finishedGames);
    await updatePlayerStats(targetToken, GAME_TYPE_WORDLE5, {
      guessesDistribution: dist,
      gamesPlayed: finishedGames.length,
      lastUpdated: Timestamp.now(),
    });
  }

  return { merged, conflicts };
};
