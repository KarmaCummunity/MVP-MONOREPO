import { scalarForLog } from "./posts-scalar-for-log.util";

describe("scalarForLog", () => {
  it("stringifies primitives", () => {
    expect(scalarForLog("a")).toBe("a");
    expect(scalarForLog(42)).toBe("42");
    expect(scalarForLog(true)).toBe("true");
  });

  it("returns empty for nullish", () => {
    expect(scalarForLog(null)).toBe("");
    expect(scalarForLog(undefined)).toBe("");
  });

  it("JSON-stringifies objects", () => {
    expect(scalarForLog({ x: 1 })).toBe('{"x":1}');
  });
});
