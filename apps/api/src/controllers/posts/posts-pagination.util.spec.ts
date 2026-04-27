import {
  parseCountTotal,
  parseLimit,
  parseLimitOffset,
} from "./posts-pagination.util";

describe("posts-pagination.util", () => {
  describe("parseLimitOffset", () => {
    it("uses defaults for empty or invalid input", () => {
      expect(parseLimitOffset("", "", { limit: 20, offset: 0 })).toEqual({
        limit: 20,
        offset: 0,
      });
      expect(parseLimitOffset("abc", "xyz", { limit: 20, offset: 0 })).toEqual({
        limit: 20,
        offset: 0,
      });
    });

    it("parses valid integers", () => {
      expect(parseLimitOffset("10", "5", { limit: 20, offset: 0 })).toEqual({
        limit: 10,
        offset: 5,
      });
    });

    it("rejects non-positive limit", () => {
      expect(parseLimitOffset("0", "0", { limit: 20, offset: 0 })).toEqual({
        limit: 20,
        offset: 0,
      });
    });
  });

  describe("parseLimit", () => {
    it("returns default when invalid", () => {
      expect(parseLimit("", 50)).toBe(50);
      expect(parseLimit("0", 50)).toBe(50);
    });

    it("parses positive limit", () => {
      expect(parseLimit("25", 50)).toBe(25);
    });
  });

  describe("parseCountTotal", () => {
    it("parses string and number totals", () => {
      expect(parseCountTotal("42")).toBe(42);
      expect(parseCountTotal(7)).toBe(7);
      expect(parseCountTotal(undefined)).toBe(0);
    });
  });
});
