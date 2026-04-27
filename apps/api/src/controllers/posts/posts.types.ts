export interface LikeBody {
  user_id: string;
}

export interface CommentBody {
  user_id: string;
  text: string;
}

export interface UpdateCommentBody {
  user_id: string;
  text: string;
}
