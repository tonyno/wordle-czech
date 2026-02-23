import md5 from "md5";
import {
  updateFinishedGameStats,
  getFinishedGameStatsFromLocalStorage,
  saveGameStateToLocalStorage,
  loadGameStateFromLocalStorage,
  loadGameStateFromLocalStorageNew,
  getMyHistoricalResultToGraphs,
  firstTimeVisit,
  GameStateItem,
} from "./localStorage";
import { PlayContext } from "./playContext";

const makeCtx = (solution: string, index: number): PlayContext => ({
  solution,
  solutionIndex: index,
});

beforeEach(() => {
  localStorage.clear();
});

describe("updateFinishedGameStats + getFinishedGameStatsFromLocalStorage", () => {
  it("returns empty stats when nothing stored", () => {
    const stats = getFinishedGameStatsFromLocalStorage();
    expect(stats.guessesDistribution).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("increments correct index on win (guess index 0 = first attempt)", () => {
    updateFinishedGameStats(true, 0);
    const stats = getFinishedGameStatsFromLocalStorage();
    expect(stats.guessesDistribution).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });

  it("increments index 6 on loss", () => {
    updateFinishedGameStats(false, 5);
    const stats = getFinishedGameStatsFromLocalStorage();
    expect(stats.guessesDistribution).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });

  it("accumulates across multiple calls", () => {
    updateFinishedGameStats(true, 2);
    updateFinishedGameStats(true, 2);
    updateFinishedGameStats(false, 5);
    const stats = getFinishedGameStatsFromLocalStorage();
    expect(stats.guessesDistribution).toEqual([0, 0, 2, 0, 0, 0, 1]);
  });
});

describe("saveGameStateToLocalStorage + loadGameStateFromLocalStorage", () => {
  it("round-trips game state via current-game key", () => {
    const ctx = makeCtx("ROBOT", 42);
    saveGameStateToLocalStorage(["XXXXX", "ROBOT"], ctx, true, false, 1000, 2000);
    const loaded = loadGameStateFromLocalStorage(ctx);
    expect(loaded).not.toBeNull();
    expect(loaded!.guesses).toEqual(["XXXXX", "ROBOT"]);
    expect(loaded!.solutionMd5).toBe(md5("ROBOT"));
    expect(loaded!.startTime).toBe(1000);
    expect(loaded!.endTime).toBe(2000);
  });

  it("returns null when solution has changed (different word, same index check via md5)", () => {
    const ctx1 = makeCtx("ROBOT", 42);
    saveGameStateToLocalStorage(["XXXXX"], ctx1, false, false);

    const ctx2 = makeCtx("MOTOR", 43);
    const loaded = loadGameStateFromLocalStorage(ctx2);
    // Should fall back to history lookup for day43, which doesn't exist
    expect(loaded).toBeNull();
  });

  it("falls back to history when current-game md5 doesn't match", () => {
    const ctx = makeCtx("ROBOT", 42);
    saveGameStateToLocalStorage(["XXXXX"], ctx, false, false);

    // Now overwrite the current-game key with different solution
    const ctx2 = makeCtx("MOTOR", 99);
    saveGameStateToLocalStorage(["YYYYY"], ctx2, false, false);

    // Loading with original context should find it in history
    const loaded = loadGameStateFromLocalStorage(ctx);
    expect(loaded).not.toBeNull();
    expect(loaded!.guesses).toEqual(["XXXXX"]);
  });
});

describe("loadGameStateFromLocalStorageNew", () => {
  it("returns undefined when no history exists", () => {
    expect(loadGameStateFromLocalStorageNew()).toBeUndefined();
  });

  it("returns history after saving a game", () => {
    const ctx = makeCtx("ROBOT", 5);
    saveGameStateToLocalStorage(["XXXXX"], ctx, false, false);
    const history = loadGameStateFromLocalStorageNew();
    expect(history).toBeDefined();
    expect(history!["day5"]).toBeDefined();
    expect(history!["day5"].guesses).toEqual(["XXXXX"]);
  });
});

describe("firstTimeVisit", () => {
  it("returns true when no data", () => {
    expect(firstTimeVisit()).toBe(true);
  });

  it("returns false after saving a game", () => {
    saveGameStateToLocalStorage(["X"], makeCtx("ROBOT", 1), false, false);
    expect(firstTimeVisit()).toBe(false);
  });
});

describe("getMyHistoricalResultToGraphs", () => {
  it("returns guess count for a win (1-based)", () => {
    const item: GameStateItem = { guesses: ["A", "B"], isGameWon: true };
    expect(getMyHistoricalResultToGraphs(item)).toBe(2);
  });

  it("returns 1 for first-guess win", () => {
    const item: GameStateItem = { guesses: ["A"], isGameWon: true };
    expect(getMyHistoricalResultToGraphs(item)).toBe(1);
  });

  it("returns 7 for a loss (6 guesses, not won)", () => {
    const item: GameStateItem = {
      guesses: ["A", "B", "C", "D", "E", "F"],
      isGameWon: false,
      isGameLoose: true,
    };
    expect(getMyHistoricalResultToGraphs(item)).toBe(7);
  });

  it("returns null for in-progress game (less than 6 guesses, not won)", () => {
    const item: GameStateItem = { guesses: ["A", "B"], isGameWon: false };
    expect(getMyHistoricalResultToGraphs(item)).toBeNull();
  });

  it("returns null when guesses is missing", () => {
    expect(getMyHistoricalResultToGraphs({} as GameStateItem)).toBeNull();
  });

  it("returns null for null input", () => {
    expect(getMyHistoricalResultToGraphs(null as any)).toBeNull();
  });
});
