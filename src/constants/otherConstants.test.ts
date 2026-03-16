export {};

describe("otherConstants", () => {
  const originalDate = global.Date;

  afterEach(() => {
    global.Date = originalDate;
    jest.resetModules();
  });

  function mockTimezone(janOffset: number, julOffset: number, currentOffset: number) {
    const RealDate = global.Date;
    const MockDate = class extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super();
        } else {
          // @ts-ignore
          super(...args);
        }
      }
      getTimezoneOffset() {
        // Determine which "kind" of date this is by checking month
        const month = this.getMonth();
        if (month === 0) return janOffset;
        if (month === 6) return julOffset;
        return currentOffset;
      }
      getFullYear() {
        return new RealDate().getFullYear();
      }
    } as any;
    MockDate.UTC = RealDate.UTC;
    MockDate.now = RealDate.now;
    MockDate.parse = RealDate.parse;
    global.Date = MockDate;
  }

  function loadModule() {
    let mod: typeof import("./otherConstants");
    jest.isolateModules(() => {
      mod = require("./otherConstants");
    });
    return mod!;
  }

  describe("startDate represents 18:00 Prague time on Jan 14 2022", () => {
    it("in winter (CET, UTC+1): startDate is 17:00 UTC", () => {
      // Prague winter: Jan offset=-60, Jul offset=-120, current=-60
      mockTimezone(-60, -120, -60);
      const { startDate } = loadModule();

      expect(startDate.getUTCFullYear()).toBe(2022);
      expect(startDate.getUTCMonth()).toBe(0);
      expect(startDate.getUTCDate()).toBe(14);
      expect(startDate.getUTCHours()).toBe(17); // 18:00 CET = 17:00 UTC
      expect(startDate.getUTCMinutes()).toBe(0);
    });

    it("in summer (CEST, UTC+2): startDate is 16:00 UTC", () => {
      // Prague summer: Jan offset=-60, Jul offset=-120, current=-120
      mockTimezone(-60, -120, -120);
      const { startDate } = loadModule();

      expect(startDate.getUTCFullYear()).toBe(2022);
      expect(startDate.getUTCMonth()).toBe(0);
      expect(startDate.getUTCDate()).toBe(14);
      expect(startDate.getUTCHours()).toBe(16); // 18:00 CEST = 16:00 UTC
      expect(startDate.getUTCMinutes()).toBe(0);
    });
  });

  describe("isDST detection", () => {
    it("returns false in winter (CET)", () => {
      // In winter: current offset matches max(jan, jul) → not DST
      mockTimezone(-60, -120, -60);
      const { startDate } = loadModule();
      // Winter → isDST false → UTC hour 17
      expect(startDate.getUTCHours()).toBe(17);
    });

    it("returns true in summer (CEST)", () => {
      // In summer: current offset differs from max(jan, jul) → DST
      mockTimezone(-60, -120, -120);
      const { startDate } = loadModule();
      // Summer → isDST true → UTC hour 16
      expect(startDate.getUTCHours()).toBe(16);
    });
  });

  it("msInDay is exactly 86400000", () => {
    const { msInDay } = loadModule();
    expect(msInDay).toBe(86400000);
  });
});
