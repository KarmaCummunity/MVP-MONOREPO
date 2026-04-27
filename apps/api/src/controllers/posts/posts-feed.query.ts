/** Shared SELECT list for post rows with joins (feed + user profile). */
export const POST_LIST_SELECT_COLUMNS = `
                SELECT 
                    p.id,
                    p.author_id,
                    p.task_id,
                    p.ride_id,
                    p.item_id,
                    p.community_challenge_id,
                    p.title,
                    p.description,
                    p.images,
                    p.likes,
                    p.comments,
                    p.post_type,
                    p.metadata,
                    p.created_at,
                    p.updated_at,
                    CASE 
                        WHEN u.id IS NOT NULL THEN json_build_object(
                            'id', u.id,
                            'name', COALESCE(u.name, 'ללא שם'),
                            'avatar_url', COALESCE(u.avatar_url, ''),
                            'email_verified', COALESCE(u.email_verified, false)
                        )
                        ELSE json_build_object(
                            'id', p.author_id,
                            'name', 'משתמש לא נמצא',
                            'avatar_url', '',
                            'email_verified', false
                        )
                    END as author,
                    CASE WHEN t.id IS NOT NULL THEN json_build_object(
                        'id', t.id, 
                        'title', t.title, 
                        'description', t.description,
                        'status', t.status,
                        'estimated_hours', t.estimated_hours,
                        'due_date', t.due_date,
                        'assignees', (
                            SELECT json_agg(json_build_object(
                                'id', u_assignee.id, 
                                'name', u_assignee.name, 
                                'avatar', u_assignee.avatar_url
                            ))
                            FROM user_profiles u_assignee
                            WHERE u_assignee.id = ANY(t.assignees)
                        )
                    ) ELSE NULL END as task,
                    CASE 
                        WHEN r.id IS NOT NULL THEN json_build_object(
                            'id', r.id, 
                            'from_location', r.from_location,
                            'to_location', r.to_location,
                            'departure_time', r.departure_time,
                            'available_seats', r.available_seats,
                            'price_per_seat', r.price_per_seat,
                            'status', r.status
                        ) 
                        ELSE NULL 
                    END as ride_data,
                    CASE 
                        WHEN i.id IS NOT NULL THEN json_build_object(
                            'id', i.id,
                            'title', i.title,
                            'status', i.status
                        )
                        ELSE NULL
                    END as item_data,
                    CASE 
                        WHEN cgc.id IS NOT NULL THEN json_build_object(
                            'id', cgc.id,
                            'type', cgc.type,
                            'frequency', cgc.frequency,
                            'difficulty', cgc.difficulty,
                            'category', cgc.category,
                            'goal_value', cgc.goal_value,
                            'deadline', cgc.deadline,
                            'image_url', cgc.image_url
                        )
                        ELSE NULL
                    END as community_challenge
            `;

export const POST_LIST_FROM_JOINS = `
                FROM posts p
                LEFT JOIN user_profiles u ON p.author_id = u.id
                LEFT JOIN tasks t ON p.task_id = t.id
                LEFT JOIN rides r ON p.ride_id = r.id
                LEFT JOIN items i ON p.item_id = i.id
                LEFT JOIN community_group_challenges cgc ON p.community_challenge_id = cgc.id
            `;
