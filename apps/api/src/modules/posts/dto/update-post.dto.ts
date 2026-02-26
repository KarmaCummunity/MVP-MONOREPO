/**
 * DTO for post update endpoint.
 */

export interface UpdatePostBody {
  user_id?: string;
  title?: string;
  description?: string;
  image?: string;
}
