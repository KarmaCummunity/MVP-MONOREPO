/**
 * Profile screen and tab types.
 * Used by ProfileScreen, profile tabs, and ProfileScreenContent.
 */
import type { FeedItem } from '../../types/feed';
import type { UserPreview } from '../../globals/types';

/** API post shape from getUserPosts / getPosts */
export interface ApiPost {
  id?: string;
  post_type?: string;
  title?: string;
  description?: string;
  created_at?: string;
  images?: unknown[];
  ride_data?: {
    id?: string;
    status?: string;
    from_location?: { city?: string; name?: string; address?: string };
    to_location?: { city?: string; name?: string; address?: string };
    available_seats?: number;
    price_per_seat?: number;
    departure_time?: string;
  };
  item_data?: { id?: string; status?: string };
  task?: { id?: string; status?: string; title?: string };
  author?: { id?: string; name?: string; avatar_url?: string };
  author_id?: string;
  ride_id?: string;
  item_id?: string;
  post_id?: string;
  likes?: number;
  comments?: number;
  is_liked?: boolean;
  [key: string]: unknown;
}

export type TabRoute = {
  key: string;
  title: string;
};

export type ProfileScreenRouteParams = {
  userId?: string;
  userName?: string;
  characterData?: UserPreview;
};

/** Feed item with optional extra fields used by profile tabs */
export type ProfileFeedItem = FeedItem & {
  rawData?: unknown;
  itemData?: unknown;
  rideData?: unknown;
};

/** Activity item for recent activity list */
export interface ProfileActivity {
  id: string;
  type: string;
  subtype?: string;
  title: string;
  time: string;
  icon: string;
  color: string;
  rawData?: Record<string, unknown> & { task?: { id?: string } };
}

export type CharacterType = UserPreview;
