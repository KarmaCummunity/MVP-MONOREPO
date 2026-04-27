import {
  ADMIN_TASKS_FILTER_STORAGE_KEY,
  getAdminTasksFilterStorageKey,
} from '../adminTasksScreen.constants';

describe('getAdminTasksFilterStorageKey', () => {
  it('uses legacy base key when user id is missing or empty', () => {
    expect(getAdminTasksFilterStorageKey(undefined)).toBe(ADMIN_TASKS_FILTER_STORAGE_KEY);
    expect(getAdminTasksFilterStorageKey('')).toBe(ADMIN_TASKS_FILTER_STORAGE_KEY);
  });

  it('scopes key by user id', () => {
    const uid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(getAdminTasksFilterStorageKey(uid)).toBe(`${ADMIN_TASKS_FILTER_STORAGE_KEY}:${uid}`);
  });
});
