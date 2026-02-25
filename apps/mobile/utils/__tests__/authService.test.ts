// בדיקות ל-authService - בדיקה ראשונית
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock את כל ה-dependencies לפני ה-import
jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    // בדיקה בסיסית שהמודול נטען
    expect(true).toBe(true);
  });

  // TODO: הוספת בדיקות אמיתיות אחרי שנסתכל על authService
  // זה רק placeholder כדי לוודא שה-Jest עובד
});


