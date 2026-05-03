/**
 * Pure helpers for task completion posts / notifications — who counts as a "performer"
 * vs the creator, aligned with assignment post rules in TasksSideEffectsService.
 */

function normalizeUserId(id: string): string {
  return id.trim().toLowerCase();
}

function dedupeAssigneesPreserveOrder(assigneeUUIDs: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const raw of assigneeUUIDs) {
    const n = normalizeUserId(raw);
    if (seen.has(n)) {
      continue;
    }
    seen.add(n);
    deduped.push(raw.trim());
  }
  return deduped;
}

function isDelegatedAssignment(
  assigneeUUIDs: string[],
  createdByUuid: string | null,
): boolean {
  if (!createdByUuid) {
    return false;
  }
  const c = normalizeUserId(createdByUuid);
  return assigneeUUIDs.some((id) => normalizeUserId(id) !== c);
}

/** Same performer list as assignment-side `assigneeTargetsExcludingCreatorWhenDelegated` for completion finalization. */
export function resolvePerformerIdsForTaskCompletion(
  assignees: string[],
  created_by: string | null,
): string[] {
  const deduped = dedupeAssigneesPreserveOrder(assignees);
  const delegated = isDelegatedAssignment(assignees, created_by);
  if (!delegated || !created_by) {
    return deduped;
  }
  const cn = normalizeUserId(created_by);
  return deduped.filter((id) => normalizeUserId(id) !== cn);
}

export function hasNonCreatorPerformer(
  performerIds: string[],
  creatorId: string,
): boolean {
  const c = normalizeUserId(creatorId);
  return performerIds.some((id) => normalizeUserId(id) !== c);
}

/** Creator-only task completed by the creator — skip "notify creator" completion noise. */
export function isSoloSelfComplete(
  performerIds: string[],
  creatorId: string,
): boolean {
  if (!creatorId || performerIds.length !== 1) {
    return false;
  }
  return normalizeUserId(performerIds[0]) === normalizeUserId(creatorId);
}
