import { sessionUserIdString } from "./posts-session-user.util";

describe("sessionUserIdString", () => {
  it("returns undefined for nullish input", () => {
    expect(sessionUserIdString(undefined)).toBeUndefined();
    expect(sessionUserIdString(null)).toBeUndefined();
  });

  it("prefers userId then id then sub when strings", () => {
    expect(sessionUserIdString({ userId: "a", id: "b", sub: "c" })).toBe("a");
    expect(sessionUserIdString({ id: "b", sub: "c" })).toBe("b");
    expect(sessionUserIdString({ sub: "c" })).toBe("c");
  });

  it("ignores non-string claim values", () => {
    expect(sessionUserIdString({ userId: { nested: 1 }, id: "ok" })).toBe("ok");
    expect(sessionUserIdString({ userId: "" })).toBeUndefined();
  });
});
