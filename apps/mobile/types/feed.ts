export interface FeedUser {
    id: string;
    name?: string | null;
    avatar?: string;
    karmaPoints?: number;
    /** When provided by the API (posts/tasks author join) */
    emailVerified?: boolean;
}

export interface TaskAssignee {
    id: string;
    name: string;
    avatar?: string;
}

export interface TaskData {
    id: string;
    title: string;
    description?: string;
    status: string;
    estimated_hours?: number;
    due_date?: string;
    assignees?: TaskAssignee[];
    /** Task opener (`tasks.created_by`), distinct from post author for delegation posts. */
    creator?: TaskAssignee;
}

/** Rich ride / trump fields from API `ride_data` or `metadata.ride` (post detail & feed). */
export interface FeedRideExtended {
  /** Free-text notes stored on `metadata.ride` (dedicated trump) or ride description (offers). */
  notes?: string;
  /** Parsed from `rides.requirements` (comma-separated codes). */
  requirementCodes?: string[];
  isRecurring?: boolean;
  recurrenceFrequency?: number;
  recurrenceUnit?: string | null;
  fuelParticipation?: string;
  fuelMaxNis?: number;
  smokingPreference?: string;
  genderPreference?: string;
  preferences?: {
    noSmoking?: boolean;
    petsAllowed?: boolean;
    kidsFriendly?: boolean;
  };
}

/** Snapshot for community challenge feed posts (from API join or post metadata). */
export interface ChallengeFeedData {
    id?: string;
    type?: string;
    frequency?: string;
    difficulty?: string;
    category?: string | null;
    goal_value?: number | string | null;
    deadline?: string | null;
    image_url?: string | null;
}

export interface FeedItem {
    id: string;
    type: 'post' | 'reel' | 'task_post';
    /** API `post_type` / subtype (e.g. task_assignment, task_completion, ride, donation). */
    subtype?: string;

    // Content
    title: string;
    description: string;
    thumbnail: string | null; // Used for images/video thumbnails
    /** All image URLs when provided by API (detail view / mapping). */
    images?: string[] | null;

    // Metadata
    timestamp: string;

    // Association
    user: FeedUser;
    taskData?: TaskData;
    /** Community group challenge linked to this post (post_type `community_challenge`). */
    challengeData?: ChallengeFeedData;
    // IDs for updating posts
    itemId?: string;
    rideId?: string;
    taskId?: string;
    challengeId?: string;

    // Stats & State
    likes: number;
    comments: number;
    isLiked: boolean;

    // Ride specific (optional, based on legacy usage)
    status?: string;
    from?: string;
    to?: string;
    date?: string;
    time?: string;
    seats?: number;
    price?: number;

    /** Recurrence, fuel, smoking, gender, tags — from `metadata.ride` or ride join. */
    rideExtended?: FeedRideExtended;

    // Item specific (optional)
    category?: string;
    intent?: 'give' | 'request';
    condition?: string;
    city?: string;
    address?: string;
}

/** Challenge UUID for navigation (top-level from API mapper or nested snapshot). */
export function getFeedItemChallengeId(item: FeedItem): string | undefined {
    const top = (item as { challengeId?: string }).challengeId;
    if (typeof top === 'string' && top.length > 0) return top;
    const nested = item.challengeData?.id;
    return typeof nested === 'string' && nested.length > 0 ? nested : undefined;
}
