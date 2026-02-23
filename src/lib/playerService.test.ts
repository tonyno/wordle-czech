// Polyfill crypto.getRandomValues for jsdom test environment
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    },
  });
}

import { generateToken, gameId } from "./playerService";

describe("generateToken", () => {
  it("returns a 10-character string", () => {
    const token = generateToken();
    expect(token).toHaveLength(10);
  });

  it("contains only uppercase alphanumeric characters", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Z0-9]{10}$/);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("gameId", () => {
  it("formats correctly", () => {
    expect(gameId("wordle5", 0)).toBe("wordle5_day0");
    expect(gameId("wordle5", 123)).toBe("wordle5_day123");
  });
});
