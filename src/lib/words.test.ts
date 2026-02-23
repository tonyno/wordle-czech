import { isWinningWord, isWordInWordList, getWordIndex, getSolutionIndexFromUrlSafe } from "./words";

describe("isWinningWord", () => {
  it("returns true for exact match", () => {
    expect(isWinningWord("ROBOT", "ROBOT")).toBe(true);
  });

  it("returns false for non-match", () => {
    expect(isWinningWord("ROBOT", "MOTOR")).toBe(false);
  });

  it("is case sensitive", () => {
    expect(isWinningWord("ROBOT", "robot")).toBe(false);
  });
});

describe("isWordInWordList", () => {
  it("accepts the solution itself", () => {
    expect(isWordInWordList("ROBOT", "ROBOT")).toBe(true);
  });

  it("rejects random strings", () => {
    expect(isWordInWordList("ROBOT", "ZZZZZ")).toBe(false);
  });
});

describe("getWordIndex", () => {
  it("returns a non-negative number", () => {
    expect(getWordIndex()).toBeGreaterThanOrEqual(0);
  });

  it("returns an integer", () => {
    expect(Number.isInteger(getWordIndex())).toBe(true);
  });
});

describe("getSolutionIndexFromUrlSafe", () => {
  it("returns -1 for undefined", () => {
    expect(getSolutionIndexFromUrlSafe(undefined)).toBe(-1);
  });

  it("returns -1 for negative numbers", () => {
    expect(getSolutionIndexFromUrlSafe("-1")).toBe(-1);
  });

  it("returns -1 for non-numeric strings", () => {
    expect(getSolutionIndexFromUrlSafe("abc")).toBe(-1);
  });

  it("returns 0 for '0'", () => {
    expect(getSolutionIndexFromUrlSafe("0")).toBe(0);
  });

  it("returns the number for valid index within range", () => {
    const result = getSolutionIndexFromUrlSafe("5");
    // 5 is definitely <= current word index (we're years past launch)
    expect(result).toBe(5);
  });

  it("returns -1 for index beyond current day", () => {
    expect(getSolutionIndexFromUrlSafe("999999")).toBe(-1);
  });
});
