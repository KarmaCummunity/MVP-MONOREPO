import { FILTER_KEY_SHOW_COMPLETED } from '../adminTasksScreen.constants';
import {
  buildPersistedAdminTaskFilterKeys,
  parseAdminTaskHeaderFilters,
  sanitizeAdminTasksHeaderFilterKeys,
} from '../adminTasksScreen.utils';

describe('sanitizeAdminTasksHeaderFilterKeys', () => {
  it('removes show-completed when any status chip is present', () => {
    expect(
      sanitizeAdminTasksHeaderFilterKeys([
        FILTER_KEY_SHOW_COMPLETED,
        'task_status_done',
      ]),
    ).toEqual(['task_status_done']);
  });

  it('keeps show-completed when no status chips', () => {
    expect(sanitizeAdminTasksHeaderFilterKeys([FILTER_KEY_SHOW_COMPLETED])).toEqual([
      FILTER_KEY_SHOW_COMPLETED,
    ]);
  });
});

describe('parseAdminTaskHeaderFilters', () => {
  it('clears include-done flag when status chips are present (legacy double keys)', () => {
    const parsed = parseAdminTaskHeaderFilters([
      FILTER_KEY_SHOW_COMPLETED,
      'task_status_done',
    ]);
    expect(parsed.statuses).toEqual(['done']);
    expect(parsed.includeDoneWhenNoStatusFilter).toBe(false);
  });
});

describe('buildPersistedAdminTaskFilterKeys', () => {
  it('does not emit show-completed when status filters are set', () => {
    const keys = buildPersistedAdminTaskFilterKeys('all', ['done'], [], true);
    expect(keys).toEqual(['task_status_done']);
  });

  it('emits show-completed only when no status chips and flag is on', () => {
    const keys = buildPersistedAdminTaskFilterKeys('all', [], [], true);
    expect(keys).toEqual([FILTER_KEY_SHOW_COMPLETED]);
  });
});
