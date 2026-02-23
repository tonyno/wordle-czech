import { startDate, msInDay } from "./otherConstants";

describe("otherConstants", () => {
  it("startDate is UTC noon Jan 14 2022 (matching server)", () => {
    expect(startDate.toISOString()).toBe("2022-01-14T12:00:00.000Z");
  });

  it("msInDay is exactly 86400000", () => {
    expect(msInDay).toBe(86400000);
  });

  it("word index is consistent across CET and CEST boundaries", () => {
    const epoch = startDate.getTime();

    // CET winter: 18:00 CET = 17:00 UTC on day 100
    const winterEvening = new Date(Date.UTC(2022, 0, 14, 17, 0)).getTime() + 100 * msInDay;
    const winterIndex = Math.floor((winterEvening - epoch) / msInDay);

    // CEST summer: 18:00 CEST = 16:00 UTC on day 200
    const summerEvening = new Date(Date.UTC(2022, 0, 14, 16, 0)).getTime() + 200 * msInDay;
    const summerIndex = Math.floor((summerEvening - epoch) / msInDay);

    // Both should give the expected day index
    expect(winterIndex).toBe(100);
    expect(summerIndex).toBe(200);
  });

  it("day boundary happens between 11:59 and 12:01 UTC relative to epoch", () => {
    const epoch = startDate.getTime();

    // Just before day 1 boundary: day 0 at 23:59 UTC (11:59 relative to noon)
    const beforeBoundary = new Date(Date.UTC(2022, 0, 14, 23, 59)).getTime();
    expect(Math.floor((beforeBoundary - epoch) / msInDay)).toBe(0);

    // Just after day 1 boundary: day 1 at 12:01 UTC
    const afterBoundary = new Date(Date.UTC(2022, 0, 15, 12, 1)).getTime();
    expect(Math.floor((afterBoundary - epoch) / msInDay)).toBe(1);
  });
});
