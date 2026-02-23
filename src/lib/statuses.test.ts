import { getGuessStatuses, getStatuses, getGameStateFromGuesses } from "./statuses";
import { PlayContext } from "./playContext";

const ctx = (solution: string): PlayContext => ({
  solution,
  solutionIndex: 1,
});

describe("getGuessStatuses", () => {
  it("marks all correct for exact match", () => {
    expect(getGuessStatuses(ctx("ROBOT"), "ROBOT")).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("marks absent letters", () => {
    expect(getGuessStatuses(ctx("ROBOT"), "XXXXX")).toEqual([
      "absent",
      "absent",
      "absent",
      "absent",
      "absent",
    ]);
  });

  it("marks present letters in wrong position", () => {
    // solution ROBOT, guess TOBOR — T,O,B present; O correct; R present
    const statuses = getGuessStatuses(ctx("ROBOT"), "TOBOR");
    expect(statuses[0]).toBe("present"); // T is in solution but not at index 0
    expect(statuses[1]).toBe("correct"); // O is correct at index 1
    expect(statuses[2]).toBe("correct"); // B is correct at index 2
    expect(statuses[3]).toBe("correct"); // O is correct at index 3
    expect(statuses[4]).toBe("present"); // R is in solution but not at index 4
  });

  it("handles duplicate letters — only marks as many present as exist in solution", () => {
    // solution ABCDE, guess AAXXX — first A correct, second A absent (only 1 A in solution)
    const statuses = getGuessStatuses(ctx("ABCDE"), "AAXXX");
    expect(statuses[0]).toBe("correct");
    expect(statuses[1]).toBe("absent");
  });

  it("handles duplicate letters in solution", () => {
    // solution AALMA, guess AMALA
    const statuses = getGuessStatuses(ctx("AALMA"), "AMALA");
    expect(statuses[0]).toBe("correct"); // A correct at index 0
    expect(statuses[1]).toBe("present"); // M is in solution at index 3
    expect(statuses[2]).toBe("present"); // A is in solution (index 3 has A)
    expect(statuses[3]).toBe("present"); // L is in solution at index 2
    expect(statuses[4]).toBe("correct"); // A correct at index 4
  });
});

describe("getStatuses (keyboard statuses)", () => {
  it("returns correct for a correctly placed letter", () => {
    const result = getStatuses(ctx("ROBOT"), ["RXXXX"]);
    expect(result["R"]).toBe("correct");
    expect(result["X"]).toBe("absent");
  });

  it("returns present for a misplaced letter", () => {
    const result = getStatuses(ctx("ROBOT"), ["XRXXX"]);
    expect(result["R"]).toBe("present");
  });

  it("correct overrides present across multiple guesses", () => {
    const result = getStatuses(ctx("ROBOT"), ["XRXXX", "RXXXX"]);
    expect(result["R"]).toBe("correct");
  });
});

describe("getGameStateFromGuesses", () => {
  const pc = ctx("ROBOT");

  it("returns notStarted for empty guesses", () => {
    expect(getGameStateFromGuesses(pc, [])).toBe("notStarted");
  });

  it("returns notStarted for null/undefined", () => {
    expect(getGameStateFromGuesses(pc, null as any)).toBe("notStarted");
  });

  it("returns win when last guess matches solution", () => {
    expect(getGameStateFromGuesses(pc, ["XXXXX", "ROBOT"])).toBe("win");
  });

  it("returns loose after 6 wrong guesses", () => {
    expect(
      getGameStateFromGuesses(pc, [
        "XXXXX",
        "XXXXX",
        "XXXXX",
        "XXXXX",
        "XXXXX",
        "XXXXX",
      ])
    ).toBe("loose");
  });

  it("returns playing when still in progress", () => {
    expect(getGameStateFromGuesses(pc, ["XXXXX", "XXXXX"])).toBe("playing");
  });

  it("returns win on first guess", () => {
    expect(getGameStateFromGuesses(pc, ["ROBOT"])).toBe("win");
  });

  it("returns win on 6th guess", () => {
    expect(
      getGameStateFromGuesses(pc, [
        "XXXXX",
        "XXXXX",
        "XXXXX",
        "XXXXX",
        "XXXXX",
        "ROBOT",
      ])
    ).toBe("win");
  });
});
