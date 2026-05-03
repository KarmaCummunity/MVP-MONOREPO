-- Migration: Add Hierarchy Levels System
-- Date: 2025-01-XX
-- Description: Adds hierarchy_level column, volunteer role, history table, and automatic calculation

-- ============================================
-- STEP 1: Add hierarchy_level column
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'hierarchy_level'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN hierarchy_level INTEGER;
        CREATE INDEX IF NOT EXISTS idx_user_profiles_hierarchy_level 
        ON user_profiles(hierarchy_level) 
        WHERE hierarchy_level IS NOT NULL;
        
        RAISE NOTICE '✅ Added hierarchy_level column';
    ELSE
        RAISE NOTICE '⚠️ hierarchy_level column already exists';
    END IF;
END $$;

-- ============================================
-- STEP 2: Create history table
-- ============================================
CREATE TABLE IF NOT EXISTS user_hierarchy_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    old_level INTEGER,
    new_level INTEGER,
    old_role TEXT[],
    new_role TEXT[],
    old_parent_manager_id UUID,
    new_parent_manager_id UUID,
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_hierarchy_history_user_id 
ON user_hierarchy_history(user_id);

CREATE INDEX IF NOT EXISTS idx_user_hierarchy_history_created_at 
ON user_hierarchy_history(created_at DESC);

-- ============================================
-- STEP 3: Create calculate_hierarchy_level function
-- ============================================
CREATE OR REPLACE FUNCTION calculate_hierarchy_level(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    level INTEGER;
    root_admin_email TEXT := 'karmacommunity2.0@gmail.com';
    found_root BOOLEAN := false;
    user_parent_id UUID;
BEGIN
    -- אם זה המנהל הראשי, דרגה 0
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = user_id AND email = root_admin_email) THEN
        RETURN 0;
    END IF;
    
    -- קבל את ה-parent של המשתמש
    SELECT parent_manager_id INTO user_parent_id
    FROM user_profiles
    WHERE id = user_id;
    
    -- אם אין parent_manager_id, זה משתמש רגיל
    IF user_parent_id IS NULL THEN
        RETURN NULL; -- משתמש רגיל, אין דרגה
    END IF;
    
    -- חישוב רקורסיבי של המרחק מהמנהל הראשי
    -- אנו מטפסים למעלה מה-parent של המשתמש עד שמגיעים למנהל הראשי
    WITH RECURSIVE hierarchy_path AS (
        -- Base case: start from user's parent (not the user itself)
        SELECT id, parent_manager_id, email, 1 as depth
        FROM user_profiles
        WHERE id = user_parent_id
        
        UNION ALL
        
        -- Recursive: go up the chain until we reach root or no parent
        SELECT u.id, u.parent_manager_id, u.email, hp.depth + 1
        FROM user_profiles u
        INNER JOIN hierarchy_path hp ON u.id = hp.parent_manager_id
        WHERE hp.depth < 100 -- Prevent infinite loops
          AND u.parent_manager_id IS NOT NULL
    )
    SELECT 
        MAX(CASE WHEN hp.email = root_admin_email THEN hp.depth ELSE NULL END),
        bool_or(hp.email = root_admin_email)
    INTO level, found_root
    FROM hierarchy_path hp;
    
    -- אם לא הגענו למנהל הראשי, זה משתמש רגיל
    IF NOT found_root OR level IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- הדרגה היא המרחק מהמנהל הראשי (כבר נכון כי התחלנו מ-depth 1)
    RETURN level;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: Create update_hierarchy_level trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_hierarchy_level()
RETURNS TRIGGER AS $$
DECLARE
    new_level INTEGER;
    old_level INTEGER;
    root_admin_email TEXT := 'karmacommunity2.0@gmail.com';
BEGIN
    -- CRITICAL: Protect root admin - karmacommunity2.0@gmail.com is the KING
    -- Root admin ALWAYS has hierarchy_level = 0 and parent_manager_id = NULL
    IF NEW.email = root_admin_email THEN
        NEW.hierarchy_level := 0;
        NEW.parent_manager_id := NULL;
        -- Don't allow changing roles of root admin
        IF OLD.roles IS DISTINCT FROM NEW.roles THEN
            NEW.roles := OLD.roles;
            RAISE WARNING 'Attempted to change roles of root admin - blocked';
        END IF;
        RETURN NEW;
    END IF;
    
    -- חשב דרגה חדשה
    new_level := calculate_hierarchy_level(NEW.id);
    
    -- שמור את הדרגה הישנה
    old_level := OLD.hierarchy_level;
    
    -- עדכן את הדרגה
    NEW.hierarchy_level := new_level;
    
    -- אם הדרגה או parent_manager_id השתנו, שמור היסטוריה
    IF (OLD.hierarchy_level IS DISTINCT FROM new_level) 
       OR (OLD.parent_manager_id IS DISTINCT FROM NEW.parent_manager_id)
       OR (OLD.roles IS DISTINCT FROM NEW.roles) THEN
        
        INSERT INTO user_hierarchy_history (
            user_id, 
            changed_by, 
            old_level, 
            new_level,
            old_parent_manager_id, 
            new_parent_manager_id,
            old_role, 
            new_role,
            change_reason
        ) VALUES (
            NEW.id, 
            NULL, -- TODO: לקבל מה-user context אם אפשר
            old_level, 
            new_level,
            OLD.parent_manager_id,
            NEW.parent_manager_id,
            OLD.roles,
            NEW.roles,
            'Automatic update via trigger'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: Create trigger
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_hierarchy_level ON user_profiles;
CREATE TRIGGER trigger_update_hierarchy_level
    BEFORE UPDATE OF parent_manager_id, roles ON user_profiles
    FOR EACH ROW
    WHEN (OLD.parent_manager_id IS DISTINCT FROM NEW.parent_manager_id 
          OR OLD.roles IS DISTINCT FROM NEW.roles)
    EXECUTE FUNCTION update_hierarchy_level();

-- ============================================
-- STEP 6: Initialize hierarchy levels
-- ============================================

-- דרגה 0: מנהל ראשי - המנהל הראשי, מוגן לחלוטין
UPDATE user_profiles 
SET hierarchy_level = 0,
    parent_manager_id = NULL  -- תמיד NULL - אין אף אחד מעליו
WHERE email = 'karmacommunity2.0@gmail.com';

-- דרגה 1: סופר מנהלים (משויכים למנהל הראשי)
DO $$
DECLARE
    root_admin_id UUID;
BEGIN
    -- מצא את ה-ID של המנהל הראשי
    SELECT id INTO root_admin_id
    FROM user_profiles
    WHERE email = 'karmacommunity2.0@gmail.com'
    LIMIT 1;
    
    IF root_admin_id IS NOT NULL THEN
        -- עדכן את הסופר מנהלים
        UPDATE user_profiles 
        SET hierarchy_level = 1,
            parent_manager_id = root_admin_id
        WHERE email IN ('navesarussi@gmail.com', 'mahalalel100@gmail.com')
          AND (parent_manager_id IS DISTINCT FROM root_admin_id OR hierarchy_level IS DISTINCT FROM 1);
        
        RAISE NOTICE '✅ Updated super admins to level 1';
    ELSE
        RAISE WARNING '⚠️ Root admin not found, skipping super admin update';
    END IF;
END $$;

-- הסרת כל ה-parent_manager_id של שאר המשתמשים
-- והסרת roles admin/volunteer מהם
UPDATE user_profiles 
SET 
    parent_manager_id = NULL,
    hierarchy_level = NULL,
    roles = array_remove(array_remove(roles, 'admin'), 'volunteer')
WHERE email NOT IN ('karmacommunity2.0@gmail.com', 'navesarussi@gmail.com', 'mahalalel100@gmail.com')
  AND (
      parent_manager_id IS NOT NULL 
      OR 'admin' = ANY(roles) 
      OR 'volunteer' = ANY(roles)
      OR hierarchy_level IS NOT NULL
  );

-- ============================================
-- STEP 7: Final safety check - ensure root admin is ALWAYS correct
-- ============================================
-- CRITICAL: Root admin MUST ALWAYS have parent_manager_id = NULL and hierarchy_level = 0
-- This fixes any data inconsistencies
UPDATE user_profiles 
SET hierarchy_level = 0,
    parent_manager_id = NULL
WHERE email = 'karmacommunity2.0@gmail.com'
  AND (parent_manager_id IS NOT NULL OR hierarchy_level != 0);

-- ============================================
-- STEP 8: Calculate hierarchy levels for any remaining users with parent_manager_id
-- (במקרה שיש משתמשים עם parent_manager_id שלא טופלו)
-- זה לא אמור לקרות אחרי STEP 6, אבל זה בטיחות נוספת
-- ============================================
UPDATE user_profiles 
SET hierarchy_level = calculate_hierarchy_level(id)
WHERE parent_manager_id IS NOT NULL
  AND hierarchy_level IS NULL
  AND email NOT IN ('karmacommunity2.0@gmail.com', 'navesarussi@gmail.com', 'mahalalel100@gmail.com');

-- ============================================
-- STEP 9: Verify migration
-- ============================================
DO $$
DECLARE
    level_0_count INTEGER;
    level_1_count INTEGER;
    null_level_count INTEGER;
    level_0_email TEXT;
    level_1_emails TEXT[];
    users_with_parent_but_no_level INTEGER;
    root_admin_has_parent INTEGER;
BEGIN
    -- בדוק דרגה 0
    SELECT COUNT(*), MAX(email) INTO level_0_count, level_0_email
    FROM user_profiles
    WHERE hierarchy_level = 0;
    
    IF level_0_count != 1 THEN
        RAISE WARNING '⚠️ Expected 1 user with level 0, found %', level_0_count;
    ELSIF level_0_email != 'karmacommunity2.0@gmail.com' THEN
        RAISE WARNING '⚠️ Level 0 user is not karmacommunity2.0@gmail.com, found: %', level_0_email;
    ELSE
        RAISE NOTICE '✅ Level 0: 1 user (root admin: %)', level_0_email;
    END IF;
    
    -- בדוק דרגה 1
    SELECT COUNT(*), array_agg(email) INTO level_1_count, level_1_emails
    FROM user_profiles
    WHERE hierarchy_level = 1;
    
    IF level_1_count != 2 THEN
        RAISE WARNING '⚠️ Expected 2 users with level 1, found %', level_1_count;
    ELSE
        RAISE NOTICE '✅ Level 1: 2 users (super admins: %)', array_to_string(level_1_emails, ', ');
    END IF;
    
    -- בדוק משתמשים רגילים
    SELECT COUNT(*) INTO null_level_count
    FROM user_profiles
    WHERE hierarchy_level IS NULL;
    
    RAISE NOTICE '✅ Users with NULL level (regular users): %', null_level_count;
    
    -- בדוק שאין משתמשים עם parent_manager_id אבל בלי hierarchy_level
    SELECT COUNT(*) INTO users_with_parent_but_no_level
    FROM user_profiles
    WHERE parent_manager_id IS NOT NULL
      AND hierarchy_level IS NULL;
    
    IF users_with_parent_but_no_level > 0 THEN
        RAISE WARNING '⚠️ Found % users with parent_manager_id but NULL hierarchy_level', users_with_parent_but_no_level;
    ELSE
        RAISE NOTICE '✅ All users with parent_manager_id have hierarchy_level set';
    END IF;
    
    -- CRITICAL: Verify root admin has parent_manager_id = NULL
    SELECT COUNT(*) INTO root_admin_has_parent
    FROM user_profiles
    WHERE email = 'karmacommunity2.0@gmail.com'
      AND parent_manager_id IS NOT NULL;
    
    IF root_admin_has_parent > 0 THEN
        RAISE WARNING '⚠️ CRITICAL: Root admin has parent_manager_id! Fixing...';
        UPDATE user_profiles 
        SET parent_manager_id = NULL
        WHERE email = 'karmacommunity2.0@gmail.com';
        RAISE NOTICE '✅ Fixed: Root admin now has parent_manager_id = NULL';
    ELSE
        RAISE NOTICE '✅ Root admin correctly has parent_manager_id = NULL (the KING)';
    END IF;
    
    RAISE NOTICE '✅ Migration completed successfully!';
END $$;

