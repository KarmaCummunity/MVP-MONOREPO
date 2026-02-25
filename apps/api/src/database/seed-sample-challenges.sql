-- Seed 5 Sample Community Challenges
-- This script creates sample challenges for testing and demonstration

-- First, we need a user ID. Let's assume the super admin user exists
-- Replace 'YOUR_USER_ID' with actual user ID from user_profiles table

DO $$
DECLARE
  sample_user_id UUID;
BEGIN
  -- Get the first user (or create a sample user)
  SELECT id INTO sample_user_id 
  FROM user_profiles 
  WHERE email = 'navesarussi@gmail.com'
  LIMIT 1;

  -- If no user found, use a placeholder (this will fail FK constraint, so handle appropriately)
  IF sample_user_id IS NULL THEN
    RAISE NOTICE 'No user found with email navesarussi@gmail.com. Please update the script with a valid user ID.';
    RETURN;
  END IF;

  -- Challenge 1: Daily Steps Challenge (NUMERIC, DAILY, EASY)
  INSERT INTO community_group_challenges 
  (id, creator_id, title, description, image_url, type, frequency, goal_value, difficulty, category, is_active, participants_count)
  VALUES (
    uuid_generate_v4(),
    sample_user_id,
    '10,000 צעדים ביום',
    'אתגר יומי להגיע ל-10,000 צעדים. שמרו על פעילות גופנית קבועה ובריאה!',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400',
    'NUMERIC',
    'DAILY',
    10000,
    'easy',
    'בריאות',
    true,
    0
  )
  ON CONFLICT DO NOTHING;

  -- Challenge 2: Daily Water Intake (NUMERIC, DAILY, EASY)
  INSERT INTO community_group_challenges 
  (id, creator_id, title, description, image_url, type, frequency, goal_value, difficulty, category, is_active, participants_count)
  VALUES (
    uuid_generate_v4(),
    sample_user_id,
    '8 כוסות מים ביום',
    'שתו לפחות 8 כוסות מים ביום. הידרציה נכונה חשובה לבריאות!',
    'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
    'NUMERIC',
    'DAILY',
    8,
    'easy',
    'בריאות',
    true,
    0
  )
  ON CONFLICT DO NOTHING;

  -- Challenge 3: Daily Meditation (DURATION, DAILY, MEDIUM)
  INSERT INTO community_group_challenges 
  (id, creator_id, title, description, image_url, type, frequency, goal_value, difficulty, category, is_active, participants_count)
  VALUES (
    uuid_generate_v4(),
    sample_user_id,
    'מדיטציה יומית - 15 דקות',
    'תרגלו מדיטציה לפחות 15 דקות ביום. שפרו את הרגיעה הנפשית והמיינדפולנס שלכם.',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400',
    'DURATION',
    'DAILY',
    15,
    'medium',
    'בריאות נפשית',
    true,
    0
  )
  ON CONFLICT DO NOTHING;

  -- Challenge 4: Weekly Book Reading (BOOLEAN, WEEKLY, MEDIUM)
  INSERT INTO community_group_challenges 
  (id, creator_id, title, description, image_url, type, frequency, goal_value, difficulty, category, is_active, participants_count)
  VALUES (
    uuid_generate_v4(),
    sample_user_id,
    'קריאת ספר שבועית',
    'קראו לפחות פרק אחד מספר מדי שבוע. הרחיבו את הידע והדמיון שלכם!',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    'BOOLEAN',
    'WEEKLY',
    NULL,
    'medium',
    'למידה',
    true,
    0
  )
  ON CONFLICT DO NOTHING;

  -- Challenge 5: Daily Exercise (DURATION, DAILY, HARD)
  INSERT INTO community_group_challenges 
  (id, creator_id, title, description, image_url, type, frequency, goal_value, difficulty, category, is_active, participants_count)
  VALUES (
    uuid_generate_v4(),
    sample_user_id,
    'אימון יומי - 30 דקות',
    'התאמנו לפחות 30 דקות ביום. שפרו את הכושר הגופני והבריאות שלכם!',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400',
    'DURATION',
    'DAILY',
    30,
    'hard',
    'ספורט',
    true,
    0
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Successfully created 5 sample challenges for user %', sample_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating sample challenges: %', SQLERRM;
END $$;
