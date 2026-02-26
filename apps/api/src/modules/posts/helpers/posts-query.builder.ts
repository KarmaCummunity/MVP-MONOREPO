/**
 * Pure SQL fragment builders for posts listing.
 * Used by PostsService to avoid duplication and reduce cognitive complexity.
 */

export interface PostsWhereClauseResult {
  conditions: string[];
  params: unknown[];
  nextParamIndex: number;
}

const VISIBLE_STATUS_CONDITION = `(p.status IS NULL OR p.status != 'hidden')`;

export function buildPostsWhereClause(
  postType?: string,
  itemId?: string,
  rideId?: string,
): PostsWhereClauseResult {
  const conditions: string[] = [VISIBLE_STATUS_CONDITION];
  const params: unknown[] = [];
  let paramIndex = 3;

  if (postType) {
    conditions.push(`p.post_type = $${paramIndex}`);
    params.push(postType);
    paramIndex++;
  }
  if (itemId) {
    conditions.push(`p.item_id = $${paramIndex}`);
    params.push(itemId);
    paramIndex++;
  }
  if (rideId) {
    conditions.push(`p.ride_id = $${paramIndex}`);
    params.push(rideId);
    paramIndex++;
  }

  return { conditions, params, nextParamIndex: paramIndex };
}

export function buildPostsSelectQuery(
  userId: string | undefined,
  userIdParamIndex: number,
  postLikesExists: boolean,
): string {
  let query = `
    SELECT 
      p.id, p.author_id, p.task_id, p.ride_id, p.item_id,
      p.title, p.description, p.images, p.likes, p.comments,
      p.post_type, p.metadata, p.created_at, p.updated_at,
      CASE 
        WHEN u.id IS NOT NULL THEN json_build_object('id', u.id, 'name', COALESCE(u.name, ''), 'avatar_url', COALESCE(u.avatar_url, ''))
        ELSE json_build_object('id', p.author_id, 'name', '', 'avatar_url', '')
      END as author,
      CASE WHEN t.id IS NOT NULL THEN json_build_object(
        'id', t.id, 'title', t.title, 'description', t.description,
        'status', t.status, 'estimated_hours', t.estimated_hours, 'due_date', t.due_date,
        'assignees', (
          SELECT json_agg(json_build_object('id', u_assignee.id, 'name', u_assignee.name, 'avatar', u_assignee.avatar_url))
          FROM user_profiles u_assignee WHERE u_assignee.id = ANY(t.assignees)
        )
      ) ELSE NULL END as task,
      CASE WHEN r.id IS NOT NULL THEN json_build_object(
        'id', r.id, 'from_location', r.from_location, 'to_location', r.to_location,
        'departure_time', r.departure_time, 'available_seats', r.available_seats,
        'price_per_seat', r.price_per_seat, 'status', r.status
      ) ELSE NULL END as ride_data,
      CASE WHEN i.id IS NOT NULL THEN json_build_object('id', i.id, 'title', i.title, 'status', i.status)
      ELSE NULL END as item_data`;

  if (userId && postLikesExists) {
    query += `,
      EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $${userIdParamIndex}) as is_liked`;
  } else {
    query += `, false as is_liked`;
  }

  query += `
    FROM posts p
    LEFT JOIN user_profiles u ON p.author_id = u.id
    LEFT JOIN tasks t ON p.task_id = t.id
    LEFT JOIN rides r ON p.ride_id = r.id
    LEFT JOIN items i ON p.item_id = i.id`;

  return query;
}
