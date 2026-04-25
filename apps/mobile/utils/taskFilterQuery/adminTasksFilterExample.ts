import { buildFilterQuery, filterQueryToJson } from './buildFilterQuery';

/**
 * Usage sample matching the spec:
 * (status = open OR in_progress) AND priority = high AND ownership = mine
 *
 * With currentUserId = "user-1", buildFilterQuery produces:
 * - AND of:
 *   - OR group: status in [open, in_progress]
 *   - eq priority high
 *   - eq assigneeUserId user-1
 */
export const adminTasksFilterExampleState = {
  status: ['open', 'in_progress'] as const,
  priority: ['high'] as const,
  ownership: ['mine'] as const,
} as const;

export function getAdminTasksFilterExample() {
  const query = buildFilterQuery(adminTasksFilterExampleState, { currentUserId: 'user-1' });
  const json = filterQueryToJson(query);
  return { query, json };
}
