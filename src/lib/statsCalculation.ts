import { GameType } from "./playerService";

export const GAME_TYPE_WORDLE5: GameType = "wordle5";

/**
 * Feature flag for legacy dual-write to gameResult/ and allResults/ collections.
 * The `statistics` cloud function reads from gameResult/.
 * The `statisticsNew` cloud function reads from players/{token}/games/ (new model).
 * Set to false once statisticsNew fully replaces statistics.
 */
export const LEGACY_WRITES_ENABLED = true;

export const EMPTY_DISTRIBUTION = [0, 0, 0, 0, 0, 0, 0];

export const buildGameId = (gameType: GameType, dayIndex: number): string => {
  return `${gameType}_day${dayIndex}`;
};

/**
 * Increments a guess distribution array in place (returns new array).
 * Index 0-5 = won on guess 1-6, index 6 = lost.
 * @param numberOfGuesses 0-based index (0 = first guess, 5 = sixth guess)
 */
export const incrementGuessDistribution = (
  existing: number[],
  isGameWon: boolean,
  numberOfGuesses: number
): number[] => {
  const dist = [...existing];
  const index = isGameWon ? numberOfGuesses : 6;
  dist[index] += 1;
  return dist;
};

/**
 * Computes full guess distribution from a list of finished games.
 */
export const computeGuessDistribution = (
  games: { isGameWon: boolean; numberOfGuesses: number }[]
): number[] => {
  const dist = [...EMPTY_DISTRIBUTION];
  for (const game of games) {
    const index = game.isGameWon ? game.numberOfGuesses : 6;
    dist[index] += 1;
  }
  return dist;
};
