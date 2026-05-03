// Challenges Controller - מותאם מ-TimrsApp לשרת KC-MVP
// מנהל את כל הפעולות הקשורות לאתגרים (Challenges/Timers) למנהלים
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserSession } from "../auth/interfaces/user-session.interface";
import { Inject } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  Length,
  validate,
} from "class-validator";

type TimeUnit = "seconds" | "minutes" | "hours" | "days" | "weeks" | "months";

// DTOs for validation
class CreateChallengeDto {
  @IsString()
  @Length(1, 50, { message: "שם האתגר חייב להיות בין 1-50 תווים" })
  name = "";

  @IsEnum(["seconds", "minutes", "hours", "days", "weeks", "months"])
  timeUnit: TimeUnit = "days";

  @IsNumber()
  @Min(1)
  @Max(1000000)
  customResetAmount = 0;
}

class UpdateChallengeDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @IsOptional()
  @IsEnum(["seconds", "minutes", "hours", "days", "weeks", "months"])
  timeUnit?: TimeUnit;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  customResetAmount?: number;

  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @IsOptional()
  @IsNumber()
  currentStreak?: number;

  @IsOptional()
  @IsNumber()
  bestStreak?: number;

  @IsOptional()
  @IsNumber()
  resetCount?: number;
}

class CreateResetLogDto {
  @IsString()
  challengeId = "";

  @IsOptional()
  @IsString()
  userId?: string;

  @IsNumber()
  @Min(1)
  amountReduced = 0;

  @IsString()
  @Length(1, 500)
  reason = "";

  @IsNumber()
  @Min(1)
  @Max(5)
  mood = 0;

  @IsNumber()
  valueBeforeReset = 0;

  @IsNumber()
  valueAfterReset = 0;
}

class CreateRecordBreakDto {
  @IsString()
  challengeId = "";

  @IsOptional()
  @IsString()
  userId?: string;

  @IsNumber()
  oldRecord = 0;

  @IsNumber()
  newRecord = 0;

  @IsNumber()
  improvement = 0;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller("api/challenges")
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  private readonly logger = new Logger(ChallengesController.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Post()
  async createChallenge(
    @Body() createDto: CreateChallengeDto,
    @CurrentUser() user: UserSession,
  ) {
    this.logger.log(`Creating new challenge for user: ${user.userId}`);

    const errors = await validate(createDto);
    if (errors.length > 0) {
      throw new BadRequestException("Validation failed");
    }

    const client = await this.pool.connect();
    try {
      const now = Date.now();
      const result = await client.query(
        `INSERT INTO challenges 
        (user_id, name, start_date, time_unit, custom_reset_amount, 
         current_value, last_calculated, current_streak, best_streak, 
         reset_count, last_reset_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *`,
        [
          user.userId,
          createDto.name,
          now,
          createDto.timeUnit,
          createDto.customResetAmount,
          0, // current_value
          now, // last_calculated
          0, // current_streak
          0, // best_streak
          0, // reset_count
          now, // last_reset_date
        ],
      );

      this.logger.log(`Challenge created successfully: ${result.rows[0].id}`);
      return { success: true, data: result.rows[0] };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("Error creating challenge:", error);
      this.logger.error("Error details:", error.message, error.stack);
      throw new InternalServerErrorException(
        `Failed to create challenge: ${error.message || "Unknown error"}`,
      );
    } finally {
      client.release();
    }
  }

  @Get()
  async getChallenges(@CurrentUser() user: UserSession) {
    const userId = user.userId;
    if (!userId) {
      throw new BadRequestException("userId is required");
    }

    this.logger.log(`Fetching challenges for user: ${userId}`);

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM challenges 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId],
      );

      return { success: true, data: result.rows };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("Error fetching challenges:", error);
      this.logger.error("Error details:", error.message, error.stack);
      throw new InternalServerErrorException(
        `Failed to fetch challenges: ${error.message || "Unknown error"}`,
      );
    } finally {
      client.release();
    }
  }

  @Get(":id")
  async getChallenge(
    @Param("id") id: string,
    @CurrentUser() user: UserSession,
  ) {
    const userId = user.userId;
    if (!userId) {
      throw new BadRequestException("userId is required");
    }

    this.logger.log(`Fetching challenge: ${id} for user: ${userId}`);

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM challenges 
         WHERE id = $1 AND user_id = $2`,
        [id, userId],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException("Challenge not found");
      }

      return { success: true, data: result.rows[0] };
    } catch (error_: unknown) {
      const error = error_ as Error;
      if (error instanceof NotFoundException) throw error;
      this.logger.error("Error fetching challenge:", error);
      throw new InternalServerErrorException("Failed to fetch challenge");
    } finally {
      client.release();
    }
  }

  @Put(":id")
  async updateChallenge(
    @Param("id") id: string,
    @CurrentUser() user: UserSession,
    @Body() updateDto: UpdateChallengeDto,
  ) {
    const userId = user.userId;
    if (!userId) {
      throw new BadRequestException("userId is required");
    }

    this.logger.log(`Updating challenge: ${id}`);

    const errors = await validate(updateDto);
    if (errors.length > 0) {
      throw new BadRequestException("Validation failed");
    }

    const client = await this.pool.connect();
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      Object.entries(updateDto).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (updates.length === 0) {
        throw new BadRequestException("No fields to update");
      }

      updates.push(`updated_at = NOW()`);
      values.push(id, userId);

      const result = await client.query(
        `UPDATE challenges 
         SET ${updates.join(", ")}
         WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
         RETURNING *`,
        values,
      );

      if (result.rows.length === 0) {
        throw new NotFoundException("Challenge not found");
      }

      this.logger.log(`Challenge updated successfully: ${id}`);
      return { success: true, data: result.rows[0] };
    } catch (error_: unknown) {
      const error = error_ as Error;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error("Error updating challenge:", error);
      throw new InternalServerErrorException("Failed to update challenge");
    } finally {
      client.release();
    }
  }

  @Delete(":id")
  async deleteChallenge(
    @Param("id") id: string,
    @CurrentUser() user: UserSession,
  ) {
    const userId = user.userId;
    if (!userId) {
      throw new BadRequestException("userId is required");
    }

    this.logger.log(`Deleting challenge: ${id}`);

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Get challenge before deletion
      const challengeResult = await client.query(
        "SELECT * FROM challenges WHERE id = $1 AND user_id = $2",
        [id, userId],
      );

      if (challengeResult.rows.length === 0) {
        throw new NotFoundException("Challenge not found");
      }

      const challenge = challengeResult.rows[0];

      // Save to deleted_challenges
      await client.query(
        `INSERT INTO deleted_challenges 
        (id, user_id, name, start_date, time_unit, custom_reset_amount, 
         current_value, last_calculated, current_streak, best_streak, 
         reset_count, last_reset_date, deleted_at, final_value)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          challenge.id,
          challenge.user_id,
          challenge.name,
          challenge.start_date,
          challenge.time_unit,
          challenge.custom_reset_amount,
          challenge.current_value,
          challenge.last_calculated,
          challenge.current_streak,
          challenge.best_streak,
          challenge.reset_count,
          challenge.last_reset_date,
          Date.now(),
          challenge.current_value,
        ],
      );

      // Delete from challenges
      await client.query(
        "DELETE FROM challenges WHERE id = $1 AND user_id = $2",
        [id, userId],
      );

      await client.query("COMMIT");

      this.logger.log(`Challenge deleted successfully: ${id}`);
      return { success: true, message: "Challenge deleted" };
    } catch (error_: unknown) {
      const error = error_ as Error;
      await client.query("ROLLBACK");
      if (error instanceof NotFoundException) throw error;
      this.logger.error("Error deleting challenge:", error);
      throw new InternalServerErrorException("Failed to delete challenge");
    } finally {
      client.release();
    }
  }

  @Post("restore/:id")
  async restoreChallenge(
    @Param("id") id: string,
    @CurrentUser() user: UserSession,
  ) {
    const userId = user.userId;

    this.logger.log(`Restoring challenge: ${id}`);

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Get deleted challenge
      const deletedResult = await client.query(
        "SELECT * FROM deleted_challenges WHERE id = $1 AND user_id = $2",
        [id, userId],
      );

      if (deletedResult.rows.length === 0) {
        throw new NotFoundException("Deleted challenge not found");
      }

      const deleted = deletedResult.rows[0];

      // Restore to challenges
      await client.query(
        `INSERT INTO challenges 
        (id, user_id, name, start_date, time_unit, custom_reset_amount, 
         current_value, last_calculated, current_streak, best_streak, 
         reset_count, last_reset_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          deleted.id,
          deleted.user_id,
          deleted.name,
          deleted.start_date,
          deleted.time_unit,
          deleted.custom_reset_amount,
          deleted.current_value,
          deleted.last_calculated,
          deleted.current_streak,
          deleted.best_streak,
          deleted.reset_count,
          deleted.last_reset_date,
        ],
      );

      // Delete from deleted_challenges
      await client.query(
        "DELETE FROM deleted_challenges WHERE id = $1 AND user_id = $2",
        [id, userId],
      );

      await client.query("COMMIT");

      this.logger.log(`Challenge restored successfully: ${id}`);
      return { success: true, message: "Challenge restored" };
    } catch (error_: unknown) {
      const error = error_ as Error;
      await client.query("ROLLBACK");
      if (error instanceof NotFoundException) throw error;
      this.logger.error("Error restoring challenge:", error);
      throw new InternalServerErrorException("Failed to restore challenge");
    } finally {
      client.release();
    }
  }

  @Get("history/deleted")
  async getDeletedChallenges(@CurrentUser() user: UserSession) {
    const userId = user.userId;

    this.logger.log(`Fetching deleted challenges for user: ${userId}`);

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM deleted_challenges 
         WHERE user_id = $1 
         ORDER BY deleted_at DESC 
         LIMIT 50`,
        [userId],
      );

      return { success: true, data: result.rows };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("Error fetching deleted challenges:", error);
      throw new InternalServerErrorException(
        "Failed to fetch deleted challenges",
      );
    } finally {
      client.release();
    }
  }

  @Post("reset-logs")
  async createResetLog(
    @Body() createDto: CreateResetLogDto,
    @CurrentUser() user: UserSession,
  ) {
    createDto.userId = user.userId;
    this.logger.log(
      `Creating reset log for challenge: ${createDto.challengeId}`,
    );

    const errors = await validate(createDto);
    if (errors.length > 0) {
      throw new BadRequestException("Validation failed");
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO challenge_reset_logs 
        (challenge_id, user_id, timestamp, amount_reduced, reason, mood, 
         value_before_reset, value_after_reset)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          createDto.challengeId,
          createDto.userId,
          Date.now(),
          createDto.amountReduced,
          createDto.reason,
          createDto.mood,
          createDto.valueBeforeReset,
          createDto.valueAfterReset,
        ],
      );

      this.logger.log(`Reset log created successfully`);
      return { success: true, data: result.rows[0] };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("Error creating reset log:", error);
      throw new InternalServerErrorException("Failed to create reset log");
    } finally {
      client.release();
    }
  }

  @Get("reset-logs/all")
  async getResetLogs(
    @CurrentUser() user: UserSession,
    @Query("challengeId") challengeId?: string,
  ) {
    const userId = user.userId;

    this.logger.log(`Fetching reset logs for user: ${userId}`);

    const client = await this.pool.connect();
    try {
      let query = `
        SELECT * FROM challenge_reset_logs 
        WHERE user_id = $1
      `;
      const params: unknown[] = [userId];

      if (challengeId) {
        query += " AND challenge_id = $2";
        params.push(challengeId);
      }

      query += " ORDER BY timestamp DESC LIMIT 200";

      const result = await client.query(query, params);

      return { success: true, data: result.rows };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("Error fetching reset logs:", error);
      throw new InternalServerErrorException("Failed to fetch reset logs");
    } finally {
      client.release();
    }
  }

  @Post("record-breaks")
  async createRecordBreak(
    @Body() createDto: CreateRecordBreakDto,
    @CurrentUser() user: UserSession,
  ) {
    createDto.userId = user.userId;
    this.logger.log(
      `Creating record break for challenge: ${createDto.challengeId}`,
    );

    const errors = await validate(createDto);
    if (errors.length > 0) {
      throw new BadRequestException("Validation failed");
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO challenge_record_breaks 
        (challenge_id, user_id, timestamp, old_record, new_record, improvement, context, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          createDto.challengeId,
          createDto.userId,
          Date.now(),
          createDto.oldRecord,
          createDto.newRecord,
          createDto.improvement,
          createDto.context,
          createDto.reason,
        ],
      );

      this.logger.log(`Record break created successfully`);
      return { success: true, data: result.rows[0] };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("Error creating record break:", error);
      throw new InternalServerErrorException("Failed to create record break");
    } finally {
      client.release();
    }
  }

  @Get("record-breaks/all")
  async getRecordBreaks(
    @CurrentUser() user: UserSession,
    @Query("challengeId") challengeId?: string,
  ) {
    const userId = user.userId;

    this.logger.log(`Fetching record breaks for user: ${userId}`);

    const client = await this.pool.connect();
    try {
      let query = `
        SELECT * FROM challenge_record_breaks 
        WHERE user_id = $1
      `;
      const params: unknown[] = [userId];

      if (challengeId) {
        query += " AND challenge_id = $2";
        params.push(challengeId);
      }

      query += " ORDER BY timestamp DESC LIMIT 100";

      const result = await client.query(query, params);

      return { success: true, data: result.rows };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("Error fetching record breaks:", error);
      throw new InternalServerErrorException("Failed to fetch record breaks");
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
