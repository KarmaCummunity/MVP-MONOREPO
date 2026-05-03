import {
  hasNonCreatorPerformer,
  isSoloSelfComplete,
  resolvePerformerIdsForTaskCompletion,
} from "./task-completion-participants";

describe("task-completion-participants", () => {
  const creator = "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA";
  const worker = "BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB";

  describe("resolvePerformerIdsForTaskCompletion", () => {
    it("returns deduped assignees when not delegated", () => {
      expect(
        resolvePerformerIdsForTaskCompletion([creator, creator], creator),
      ).toEqual([creator]);
    });

    it("excludes creator when delegated", () => {
      expect(
        resolvePerformerIdsForTaskCompletion([creator, worker], creator),
      ).toEqual([worker]);
    });

    it("returns all deduped when no creator", () => {
      expect(
        resolvePerformerIdsForTaskCompletion([creator, worker], null),
      ).toEqual([creator, worker]);
    });
  });

  describe("hasNonCreatorPerformer", () => {
    it("is false when only creator", () => {
      expect(hasNonCreatorPerformer([creator], creator)).toBe(false);
    });

    it("is true when another performer present", () => {
      expect(hasNonCreatorPerformer([creator, worker], creator)).toBe(true);
      expect(hasNonCreatorPerformer([worker], creator)).toBe(true);
    });
  });

  describe("isSoloSelfComplete", () => {
    it("is true for single assignee who is creator", () => {
      expect(isSoloSelfComplete([creator], creator)).toBe(true);
    });

    it("is false for delegated performer list", () => {
      expect(isSoloSelfComplete([worker], creator)).toBe(false);
    });

    it("is false for empty or multi", () => {
      expect(isSoloSelfComplete([], creator)).toBe(false);
      expect(isSoloSelfComplete([creator, worker], creator)).toBe(false);
    });
  });
});
