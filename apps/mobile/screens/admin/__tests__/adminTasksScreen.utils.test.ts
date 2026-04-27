import {
  buildPersistedAdminTaskFilterKeys,
  canonicalTaskCategory,
  formatTaskListStatusHebrew,
  normalizeAdminTaskFromApi,
  parseAdminTaskHeaderFilters,
  sanitizeAdminTasksHeaderFilterKeys,
} from '../adminTasksScreen.utils';
import type { AdminTask } from '../adminTasksScreen.types';

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

describe('formatTaskListStatusHebrew', () => {
  it('maps known workflow statuses (no legacy reports status)', () => {
    expect(formatTaskListStatusHebrew('archived')).toBe('בארכיון');
    expect(formatTaskListStatusHebrew('open')).toBe('פתוחה');
  });
});

describe('canonicalTaskCategory', () => {
  it('maps legacy slugs to Hebrew categories used in the form', () => {
    expect(canonicalTaskCategory('knowledge_offer')).toBe('תרומת מידע');
    expect(canonicalTaskCategory('report')).toBe('דיווח');
    expect(canonicalTaskCategory('moderation')).toBe('דיווח');
    expect(canonicalTaskCategory('דיווח')).toBe('דיווח');
    expect(canonicalTaskCategory('תרומת מידע')).toBe('תרומת מידע');
  });
});

describe('normalizeAdminTaskFromApi', () => {
  it('converts legacy reports status to open and דיווח when appropriate', () => {
    const base: AdminTask = {
      id: 'a',
      title: 't',
      status: 'open',
      priority: 'medium',
      assignees: [],
      tags: [],
    };
    const out = normalizeAdminTaskFromApi({
      ...base,
      status: 'reports' as AdminTask['status'],
      category: 'report',
    } as AdminTask);
    expect(out.status).toBe('open');
    expect(out.category).toBe('דיווח');
  });
});

describe('parseAdminTaskHeaderFilters legacy status chip', () => {
  it('maps persisted task_status_reports to category דיווח', () => {
    const parsed = parseAdminTaskHeaderFilters(['task_status_reports']);
    expect(parsed.statuses).toEqual([]);
    expect(parsed.categories).toEqual(['דיווח']);
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
