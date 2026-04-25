import { buildFilterQuery, filterQueryToJson } from '../buildFilterQuery';
import { filterQueryToHttpParams } from '../toHttpParams';
import { taskFilterStateToApiTaskFilters } from '../toApiTaskFilters';
import { getAdminTasksFilterExample, adminTasksFilterExampleState } from '../adminTasksFilterExample';

describe('buildFilterQuery', () => {
  it('combines same category with OR and categories with AND (spec example)', () => {
    const { query, json } = getAdminTasksFilterExample();

    expect(query.op).toBe('and');
    expect(query.clauses).toHaveLength(3);

    const orStatus = query.clauses[0];
    expect(orStatus && 'op' in orStatus && orStatus.op).toBe('or');
    if (orStatus && 'op' in orStatus && orStatus.op === 'or') {
      expect(orStatus.clauses).toEqual([
        { kind: 'eq', field: 'status', value: 'open' },
        { kind: 'eq', field: 'status', value: 'in_progress' },
      ]);
    }

    expect(query.clauses[1]).toEqual({ kind: 'eq', field: 'priority', value: 'high' });
    expect(query.clauses[2]).toEqual({ kind: 'eq', field: 'assigneeUserId', value: 'user-1' });

    expect(json).toEqual({
      op: 'and',
      clauses: [
        {
          op: 'or',
          clauses: [
            { op: 'eq', field: 'status', value: 'open' },
            { op: 'eq', field: 'status', value: 'in_progress' },
          ],
        },
        { op: 'eq', field: 'priority', value: 'high' },
        { op: 'eq', field: 'assigneeUserId', value: 'user-1' },
      ],
    });
  });

  it('never ANDs two alternative status values in one clause', () => {
    const q = buildFilterQuery({ status: ['open', 'in_progress'] });
    const statusPart = q.clauses[0];
    expect(statusPart && 'op' in statusPart && statusPart.op).toBe('or');
  });

  it('maps multi status to an OR group of eq clauses', () => {
    const q = buildFilterQuery({ status: ['open', 'done'] });
    const first = q.clauses[0];
    expect(first && 'op' in first && first.op).toBe('or');
    if (first && 'op' in first && first.op === 'or') {
      expect(first.clauses).toEqual([
        { kind: 'eq', field: 'status', value: 'open' },
        { kind: 'eq', field: 'status', value: 'done' },
      ]);
    }
  });

  it('merges due date min/max as AND within category', () => {
    const q = buildFilterQuery({
      dueDate: { min: '2026-01-01', max: '2026-12-31' },
    });
    expect(q.clauses).toHaveLength(2);
    expect(q.clauses[0]).toMatchObject({ kind: 'gte', field: 'dueDate' });
    expect(q.clauses[1]).toMatchObject({ kind: 'lte', field: 'dueDate' });
  });

  it('produces http params for API client', () => {
    const q = buildFilterQuery(adminTasksFilterExampleState, { currentUserId: 'user-1' });
    const params = filterQueryToHttpParams(q);
    expect(params.getAll('status')).toEqual(['open', 'in_progress']);
    expect(params.get('priority')).toBe('high');
    expect(params.get('assignee')).toBe('user-1');
  });

  it('serializes text search', () => {
    const q = buildFilterQuery({ textSearch: { text: '  sprint ' } });
    const j = filterQueryToJson(q);
    expect(j).toEqual({
      op: 'contains',
      field: 'searchText',
      value: 'sprint',
    });
  });

  it('maps filter state to getTasks-style params', () => {
    const api = taskFilterStateToApiTaskFilters(adminTasksFilterExampleState, {
      currentUserId: 'user-1',
      sort: 'created_desc',
    });
    expect(api).toEqual({
      sort: 'created_desc',
      status: ['open', 'in_progress'],
      priority: 'high',
      assignee: 'user-1',
    });
  });
});
