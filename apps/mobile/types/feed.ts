export type PostType = 'post' | 'reel' | 'task_post';
export type TaskSubtype = 'task_assignment' | 'task_completion' | string;

export interface FeedUser {
    id: string;
    name?: string | null;
    avatar?: string;
    karmaPoints?: number;
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
}

export interface FeedItem {
    id: string;
    type: PostType;
    subtype?: TaskSubtype;

    // Content
    title: string;
    description: string;
    thumbnail: string | null; // Used for images/video thumbnails

    // Metadata
    timestamp: string;

    // Association
    user: FeedUser;
    taskData?: TaskData;
    // IDs for updating posts
    itemId?: string;
    rideId?: string;
    taskId?: string;

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

    // Item specific (optional)
    category?: string;
}
