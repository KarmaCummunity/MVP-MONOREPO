/**
 * DTOs for post comment endpoints.
 */

export interface CommentBody {
  user_id: string;
  text: string;
}

export interface UpdateCommentBody {
  user_id: string;
  text: string;
}
