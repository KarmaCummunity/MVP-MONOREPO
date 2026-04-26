import type { ItemType } from './itemsScreen.types';

export const ITEM_CATEGORY_DEFS: ReadonlyArray<{
  id: ItemType;
  icon: string;
  labelKey: string;
}> = [
  { id: 'clothes', icon: 'shirt-outline', labelKey: 'donationScreen.categories.clothes' },
  { id: 'books', icon: 'library-outline', labelKey: 'donationScreen.categories.books' },
  { id: 'furniture', icon: 'bed-outline', labelKey: 'donationScreen.categories.furniture' },
  { id: 'dry_food', icon: 'restaurant-outline', labelKey: 'donationScreen.categories.dry_food' },
  { id: 'games', icon: 'game-controller-outline', labelKey: 'donationScreen.categories.games' },
  { id: 'electronics', icon: 'phone-portrait-outline', labelKey: 'donationScreen.categories.electronics' },
  { id: 'toys', icon: 'happy-outline', labelKey: 'donationScreen.categories.toys' },
  { id: 'sports', icon: 'football-outline', labelKey: 'donationScreen.categories.sports' },
  { id: 'art', icon: 'color-palette-outline', labelKey: 'donationScreen.categories.art' },
  { id: 'kitchen', icon: 'cafe-outline', labelKey: 'donationScreen.categories.kitchen' },
  { id: 'bathroom', icon: 'water-outline', labelKey: 'donationScreen.categories.bathroom' },
  { id: 'garden', icon: 'leaf-outline', labelKey: 'donationScreen.categories.garden' },
  { id: 'tools', icon: 'construct-outline', labelKey: 'donationScreen.categories.tools' },
  { id: 'baby', icon: 'baby-outline', labelKey: 'donationScreen.categories.baby' },
  { id: 'pet', icon: 'paw-outline', labelKey: 'donationScreen.categories.pet' },
  { id: 'other', icon: 'cube-outline', labelKey: 'donationScreen.categories.other' },
] as const;
