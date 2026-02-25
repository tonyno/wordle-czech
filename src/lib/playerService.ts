import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
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
  const q = query(
    collection(firestore, "players"),
    where("googleUid", "==", uid)
  );
  const snap = await getDocs(q);
  console.log("SNAP: ", snap);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { token: docSnap.id, player: docSnap.data() as PlayerDoc };
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
};

export const saveGame = async (
  token: string,
  gameType: GameType,
  solutionIndex: number,
  gameDoc: GameDoc
): Promise<void> => {
  const id = gameId(gameType, solutionIndex);
  await setDoc(
    doc(firestore, "players", token, "games", id),
    gameDoc
  );
};

export const getGame = async (
  token: string,
  gameType: GameType,
  solutionIndex: number
): Promise<GameDoc | null> => {
  const id = gameId(gameType, solutionIndex);
  const snap = await getDoc(
    doc(firestore, "players", token, "games", id)
  );
  return snap.exists() ? (snap.data() as GameDoc) : null;
};

export const getGamesRange = async (
  token: string,
  gameType: GameType,
  fromDay: number,
  toDay: number
): Promise<Map<number, GameDoc>> => {
  const result = new Map<number, GameDoc>();
  const gamesRef = collection(firestore, "players", token, "games");
  const q = query(
    gamesRef,
    where("gameType", "==", gameType),
    where("solutionIndex", ">=", fromDay),
    where("solutionIndex", "<=", toDay)
  );
  const snap = await getDocs(q);
  snap.forEach((d) => {
    const game = d.data() as GameDoc;
    result.set(game.solutionIndex, game);
  });
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
  const sourceGamesRef = collection(
    firestore,
    "players",
    sourceToken,
    "games"
  );
  const sourceSnap = await getDocs(sourceGamesRef);

  let merged = 0;
  let conflicts = 0;
  const batch = writeBatch(firestore);

  for (const sourceDoc of sourceSnap.docs) {
    const sourceGame = sourceDoc.data() as GameDoc;
    const targetGameRef = doc(
      firestore,
      "players",
      targetToken,
      "games",
      sourceDoc.id
    );
    const targetSnap = await getDoc(targetGameRef);

    if (targetSnap.exists()) {
      const targetGame = targetSnap.data() as GameDoc;
      // Conflict resolution: win > loss; fewer guesses wins ties
      const sourceWins = sourceGame.isGameWon;
      const targetWins = targetGame.isGameWon;
      if (sourceWins && !targetWins) {
        batch.set(targetGameRef, sourceGame);
        conflicts++;
      } else if (sourceWins && targetWins) {
        if (sourceGame.guesses.length < targetGame.guesses.length) {
          batch.set(targetGameRef, sourceGame);
          conflicts++;
        } else {
          conflicts++;
        }
      } else {
        conflicts++;
      }
    } else {
      batch.set(targetGameRef, sourceGame);
      merged++;
    }
  }

  if (merged > 0 || conflicts > 0) {
    await batch.commit();
  }

  // Merge stats
  const sourceStats = await getPlayerStats(sourceToken, GAME_TYPE_WORDLE5);
  const targetStats = await getPlayerStats(targetToken, GAME_TYPE_WORDLE5);
  if (sourceStats && !targetStats) {
    await updatePlayerStats(targetToken, GAME_TYPE_WORDLE5, sourceStats);
  } else if (sourceStats && targetStats) {
    // Recalculate stats from merged games
    const allGames = await getDocs(
      collection(firestore, "players", targetToken, "games")
    );
    const finishedGames: { isGameWon: boolean; numberOfGuesses: number }[] = [];
    allGames.forEach((d) => {
      const g = d.data() as GameDoc;
      if (g.gameType === GAME_TYPE_WORDLE5 && (g.isGameWon || g.isGameLoose)) {
        finishedGames.push({
          isGameWon: g.isGameWon,
          numberOfGuesses: g.guesses.length - 1,
        });
      }
    });
    const dist = computeGuessDistribution(finishedGames);
    await updatePlayerStats(targetToken, GAME_TYPE_WORDLE5, {
      guessesDistribution: dist,
      gamesPlayed: finishedGames.length,
      lastUpdated: Timestamp.now(),
    });
  }

  return { merged, conflicts };
};
