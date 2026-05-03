import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Pool } from 'pg';
import { PG_POOL } from './src/database/database.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const pool = app.get<Pool>(PG_POOL);

    const targetEmail = 'karmacommunity2.0@gmail.com';
    const superAdminEmail = 'navesarussi@gmail.com';

    console.log(`🔧 Updating ${targetEmail} to super admin status...`);

    try {
        // 1. Get the target user
        const targetUserRes = await pool.query(
            `SELECT id, email, roles, parent_manager_id FROM user_profiles WHERE LOWER(email) = $1`,
            [targetEmail.toLowerCase().trim()]
        );

        if (targetUserRes.rows.length === 0) {
            console.error(`❌ User not found: ${targetEmail}`);
            await app.close();
            return;
        }

        const targetUser = targetUserRes.rows[0];
        console.log(`📋 Current user state:`, {
            id: targetUser.id,
            email: targetUser.email,
            roles: targetUser.roles,
            parent_manager_id: targetUser.parent_manager_id
        });

        // 2. Get super admin ID
        const superAdminRes = await pool.query(
            `SELECT id FROM user_profiles WHERE LOWER(email) = $1 LIMIT 1`,
            [superAdminEmail.toLowerCase().trim()]
        );

        if (superAdminRes.rows.length === 0) {
            console.error(`❌ Super admin not found: ${superAdminEmail}`);
            await app.close();
            return;
        }

        const superAdminId = superAdminRes.rows[0].id;
        console.log(`👑 Super admin ID: ${superAdminId}`);

        // 3. Prepare roles array - ensure super_admin is included
        const currentRoles = targetUser.roles || [];
        let updatedRoles: string[];

        if (currentRoles.includes('super_admin')) {
            console.log(`✅ User already has super_admin role`);
            updatedRoles = currentRoles;
        } else {
            // Add super_admin to roles, ensuring we keep other roles
            updatedRoles = Array.from(new Set([...currentRoles, 'super_admin', 'admin', 'user']));
            console.log(`➕ Adding super_admin role. New roles:`, updatedRoles);
        }

        // 4. Update user: set roles and parent_manager_id
        await pool.query(
            `UPDATE user_profiles 
             SET 
               roles = $1::text[],
               parent_manager_id = $2,
               updated_at = NOW()
             WHERE id = $3`,
            [updatedRoles, superAdminId, targetUser.id]
        );

        console.log(`✅ Successfully updated ${targetEmail}:`);
        console.log(`   - Roles: ${updatedRoles.join(', ')}`);
        console.log(`   - Parent Manager ID: ${superAdminId} (${superAdminEmail})`);
        console.log(`🎉 User ${targetEmail} is now a super admin under ${superAdminEmail}`);

    } catch (err) {
        console.error(`❌ Failed to update ${targetEmail}:`, err);
    }

    await app.close();
}

bootstrap();

