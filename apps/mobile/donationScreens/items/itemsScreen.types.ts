import type { NavigationProp, ParamListBase } from '@react-navigation/native';

export type ItemType =
  | 'furniture'
  | 'clothes'
  | 'general'
  | 'books'
  | 'dry_food'
  | 'games'
  | 'electronics'
  | 'toys'
  | 'sports'
  | 'art'
  | 'kitchen'
  | 'bathroom'
  | 'garden'
  | 'tools'
  | 'baby'
  | 'pet'
  | 'other';

export interface ItemsScreenProps {
  navigation: NavigationProp<ParamListBase>;
  route?: { params?: Record<string, unknown> };
}

export interface DonationItem {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  category: ItemType;
  condition?: 'new' | 'like_new' | 'used' | 'for_parts';

  city?: string;
  address?: string;
  coordinates?: string;

  price?: number;
  image_base64?: string;
  rating?: number;
  timestamp: string;
  tags?: string;
  qty?: number;
  delivery_method?: string;
  status?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}
