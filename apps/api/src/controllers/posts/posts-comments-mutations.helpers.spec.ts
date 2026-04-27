import { parseAddCommentInput } from "./posts-comments-mutations.helpers";

describe("parseAddCommentInput", () => {
  it("rejects missing user_id", () => {
    const r = parseAddCommentInput({ user_id: "", text: "hi" });
    expect(r).toEqual({ ok: false, error: "user_id is required" });
  });

  it("rejects empty text", () => {
    const r = parseAddCommentInput({ user_id: "u1", text: "   " });
    expect(r).toEqual({ ok: false, error: "Comment text is required" });
  });

  it("rejects text over 2000 chars", () => {
    const r = parseAddCommentInput({
      user_id: "u1",
      text: "x".repeat(2001),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("2000");
    }
  });

  it("returns trimmed text on success", () => {
    const r = parseAddCommentInput({ user_id: "u1", text: "  ok  " });
    expect(r).toEqual({ ok: true, user_id: "u1", text: "ok" });
  });
});
