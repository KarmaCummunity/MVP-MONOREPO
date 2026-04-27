import {
  buildPersistedAdminTaskFilterKeys,
  parseAdminTaskHeaderFilters,
  sanitizeAdminTasksHeaderFilterKeys,
} from '../adminTasksScreen.utils';

describe('sanitizeAdminTasksHeaderFilterKeys', () => {
  it('returns keys as is since show-completed is removed', () => {
    expect(
      sanitizeAdminTasksHeaderFilterKeys([
        'task_status_done',
      ]),
    ).toEqual(['task_status_done']);
  });
});

describe('parseAdminTaskHeaderFilters', () => {
  it('parses status chips correctly', () => {
    const parsed = parseAdminTaskHeaderFilters([
      'task_status_done',
    ]);
    expect(parsed.statuses).toEqual(['done']);
  });

  it('parses priority and category chips correctly', () => {
    const parsed = parseAdminTaskHeaderFilters([
      'task_priority_high',
      'task_category_פיתוח',
    ]);
    expect(parsed.priorities).toEqual(['high']);
    expect(parsed.categories).toEqual(['פיתוח']);
  });
});

describe('buildPersistedAdminTaskFilterKeys', () => {
  it('emits correct keys for statuses', () => {
    const keys = buildPersistedAdminTaskFilterKeys('all', ['done'], [], []);
    expect(keys).toEqual(['task_status_done']);
  });

  it('emits correct keys for multiple filters', () => {
    const keys = buildPersistedAdminTaskFilterKeys('me', ['open'], ['high'], ['פיתוח']);
    expect(keys).toContain('task_assign_me');
    expect(keys).toContain('task_status_open');
    expect(keys).toContain('task_priority_high');
    expect(keys).toContain('task_category_פיתוח');
  });
});
