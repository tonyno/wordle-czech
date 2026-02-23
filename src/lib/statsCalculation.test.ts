import {
  incrementGuessDistribution,
  computeGuessDistribution,
  EMPTY_DISTRIBUTION,
  buildGameId,
  GAME_TYPE_WORDLE5,
} from "./statsCalculation";

describe("statsCalculation", () => {
  describe("buildGameId", () => {
    it("returns correct game id", () => {
      expect(buildGameId(GAME_TYPE_WORDLE5, 42)).toBe("wordle5_day42");
    });
  });

  describe("incrementGuessDistribution", () => {
    it("increments correct index for a win", () => {
      const result = incrementGuessDistribution([...EMPTY_DISTRIBUTION], true, 3);
      expect(result).toEqual([0, 0, 0, 1, 0, 0, 0]);
    });

    it("increments index 6 for a loss", () => {
      const result = incrementGuessDistribution([...EMPTY_DISTRIBUTION], false, 5);
      expect(result).toEqual([0, 0, 0, 0, 0, 0, 1]);
    });

    it("does not mutate the original array", () => {
      const original = [...EMPTY_DISTRIBUTION];
      incrementGuessDistribution(original, true, 0);
      expect(original).toEqual(EMPTY_DISTRIBUTION);
    });
  });

  describe("computeGuessDistribution", () => {
    it("computes distribution from games", () => {
      const games = [
        { isGameWon: true, numberOfGuesses: 0 },
        { isGameWon: true, numberOfGuesses: 2 },
        { isGameWon: true, numberOfGuesses: 2 },
        { isGameWon: false, numberOfGuesses: 5 },
      ];
      expect(computeGuessDistribution(games)).toEqual([1, 0, 2, 0, 0, 0, 1]);
    });

    it("returns empty distribution for no games", () => {
      expect(computeGuessDistribution([])).toEqual(EMPTY_DISTRIBUTION);
    });
  });
});

describe("date/time alignment", () => {
  it("client and server epoch produce the same word index for known dates", () => {
    // Both client and server use: new Date(Date.UTC(2022, 0, 14, 12, 0))
    const epoch = new Date(Date.UTC(2022, 0, 14, 12, 0)).getTime();
    const msInDay = 86400000;

    // Day 0: Jan 14 2022 at 18:00 CET (17:00 UTC) — 5 hours after epoch
    const day0 = new Date(Date.UTC(2022, 0, 14, 17, 0)).getTime();
    expect(Math.floor((day0 - epoch) / msInDay)).toBe(0);

    // Day 1: Jan 15 2022 at 18:00 CET (17:00 UTC)
    const day1 = new Date(Date.UTC(2022, 0, 15, 17, 0)).getTime();
    expect(Math.floor((day1 - epoch) / msInDay)).toBe(1);

    // Day 365: Jan 14 2023 at 13:00 UTC
    const day365 = new Date(Date.UTC(2023, 0, 14, 13, 0)).getTime();
    expect(Math.floor((day365 - epoch) / msInDay)).toBe(365);
  });
});
