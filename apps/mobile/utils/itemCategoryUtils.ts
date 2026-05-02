/**
 * Utility functions for item category handling
 * פונקציות עזר לטיפול בקטגוריות פריטים
 */

/**
 * Maps category ID to Hebrew label
 * ממפה מזהה קטגוריה לתווית בעברית
 */
export const getCategoryLabel = (category: string | null | undefined): string => {
  if (!category) return 'חפצים';
  
  const categoryMap: Record<string, string> = {
    'furniture': 'רהיטים',
    'clothes': 'בגדים',
    'books': 'ספרים',
    'dry_food': 'אוכל יבש',
    'games': 'משחקים',
    'electronics': 'חשמל ואלקטרוניקה',
    'toys': 'צעצועים',
    'sports': 'ספורט',
    'art': 'אמנות',
    'kitchen': 'מטבח',
    'bathroom': 'אמבטיה',
    'garden': 'גינה',
    'tools': 'כלים',
    'baby': 'תינוקות',
    'pet': 'חיות מחמד',
    'other': 'אחר',
    'general': 'חפצים',
  };
  
  return categoryMap[category] || 'חפצים';
};

/**
 * Validates if a category is valid
 * בודק אם קטגוריה תקינה
 */
export const isValidCategory = (category: string | null | undefined): boolean => {
  if (!category) return false;
  
  const validCategories = [
    'furniture',
    'clothes',
    'books',
    'dry_food',
    'games',
    'electronics',
    'toys',
    'sports',
    'art',
    'kitchen',
    'bathroom',
    'garden',
    'tools',
    'baby',
    'pet',
    'other',
    'general',
  ];
  
  return validCategories.includes(category);
};



