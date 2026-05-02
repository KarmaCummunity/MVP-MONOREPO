import type { UserPreview } from '../../globals/types';

export type CharacterType = UserPreview;
export type TabRoute = {
  key: string;
  title: string;
};

export type ProfileScreenRouteParams = {
  userId?: string;
  userName?: string;
  characterData?: CharacterType;
};
