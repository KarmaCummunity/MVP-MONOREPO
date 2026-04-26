// Community Group Challenges Controller
// Handles all operations for community challenges: create, list, join, track entries, statistics
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
  Inject,
} from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { format } from "../database/query-builder";
import { validate } from "class-validator";
import {
  CreateCommunityGroupChallengeDto,
  UpdateCommunityGroupChallengeDto,
  JoinChallengeDto,
  CreateChallengeEntryDto,
  GetChallengesFilterDto,
} from "./dto/community-challenge.dto";

@Controller("api/community-challenges")
export class CommunityGroupChallengesController {
  private readonly logger = new Logger(CommunityGroupChallengesController.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Accept both `user_id` and `userId` query keys (mobile / legacy clients). */
  private resolveQueryUserId(
    user_id?: string,
    userId?: string,
  ): string | undefined {
    const v = (user_id || userId || "").trim();
    return v || undefined;
  }

  private isUuidString(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  /**
   * Create a new community challenge
   * Also creates a post automatically in the feed
   */
  @Post()
  async createChallenge(@Body() dto: CreateCommunityGroupChallengeDto) {
    this.logger.log(`Creating new community challenge: ${dto.title}`);

    const errors = await validate(dto);
    if (errors.length > 0) {
      this.logger.warn("Validation failed", errors);
      throw new BadRequestException("Validation failed");
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const isPublic = dto.is_public !== false;

      this.logger.log(`🔍 Creating challenge: ${dto.title}`);
      this.logger.log(
        `📊 Challenge data: ${JSON.stringify({
          creator_id: dto.creator_id,
          title: dto.title,
          type: dto.type,
          frequency: dto.frequency,
          difficulty: dto.difficulty,
          is_public: isPublic,
        })}`,
      );

      const {
        rows: [challenge],
      } = await client.query(
        `
        INSERT INTO community_group_challenges 
        (creator_id, title, description, type, frequency, goal_value, goal_direction, deadline, difficulty, category, image_url, is_public)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
        [
          dto.creator_id,
          dto.title,
          dto.description || null,
          dto.type,
          dto.frequency,
          dto.goal_value ?? null,
          dto.goal_direction ?? null,
          dto.deadline || null,
          dto.difficulty || null,
          dto.category || null,
          dto.image_url || null,
          isPublic,
        ],
      );

      this.logger.log(`✅ Challenge created with ID: ${challenge.id}`);

      // 2. Auto-create a feed post only for public (community) challenges
      if (isPublic) {
        try {
          const postTitle = challenge.title;
          const postDescription =
            challenge.description || `אתגר קהילתי חדש: ${challenge.title}`;

          await client.query(
            `
          INSERT INTO posts 
          (author_id, community_challenge_id, title, description, post_type, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
            [
              dto.creator_id,
              challenge.id,
              postTitle,
              postDescription,
              "community_challenge",
              JSON.stringify({
                challenge_id: challenge.id,
                type: challenge.type,
                frequency: challenge.frequency,
                difficulty: challenge.difficulty,
                category: challenge.category,
                goal_value: challenge.goal_value,
                deadline: challenge.deadline,
              }),
            ],
          );

          this.logger.log(
            `✅ Auto-created post for challenge: ${challenge.id}`,
          );
        } catch (postError) {
          this.logger.error(
            "⚠️ Failed to auto-create post (continuing anyway)",
            postError,
          );
        }
      } else {
        this.logger.log(
          `Skipping feed post for private challenge: ${challenge.id}`,
        );
      }

      // 3. Auto-join the creator to their own challenge
      await client.query(
        `
        INSERT INTO community_challenge_participants 
        (challenge_id, user_id, joined_at)
        VALUES ($1, $2, NOW())
      `,
        [challenge.id, dto.creator_id],
      );

      // Update participants count
      await client.query(
        `
        UPDATE community_group_challenges 
        SET participants_count = 1 
        WHERE id = $1
      `,
        [challenge.id],
      );

      await client.query("COMMIT");

      this.logger.log(`✅ Challenge created successfully: ${challenge.id}`);
      return { success: true, data: challenge };
    } catch (error_: unknown) {
      const error = error_ as Error;
      await client.query("ROLLBACK");
      this.logger.error("Error creating challenge:", error);
      throw new InternalServerErrorException(
        `Failed to create challenge: ${error.message || "Unknown error"}`,
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get list of challenges with optional filters
   */
  @Get()
  async getChallenges(@Query() filters: GetChallengesFilterDto) {
    this.logger.log("Fetching challenges with filters:", filters);

    const client = await this.pool.connect();
    try {
      let query = `
        SELECT 
          c.*,
          u.name as creator_name,
          u.avatar_url as creator_avatar
        FROM community_group_challenges c
        LEFT JOIN user_profiles u ON c.creator_id = u.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      let paramCount = 1;

      // Apply filters
      if (filters.type) {
        query += ` AND c.type = $${paramCount}`;
        params.push(filters.type);
        paramCount++;
      }

      if (filters.frequency) {
        query += ` AND c.frequency = $${paramCount}`;
        params.push(filters.frequency);
        paramCount++;
      }

      if (filters.difficulty) {
        query += ` AND c.difficulty = $${paramCount}`;
        params.push(filters.difficulty);
        paramCount++;
      }

      if (filters.category) {
        query += ` AND c.category = $${paramCount}`;
        params.push(filters.category);
        paramCount++;
      }

      if (filters.is_active !== undefined) {
        query += ` AND c.is_active = $${paramCount}`;
        params.push(filters.is_active);
        paramCount++;
      }

      if (filters.creator_id) {
        query += ` AND c.creator_id = $${paramCount}`;
        params.push(filters.creator_id);
        paramCount++;
      } else {
        query += ` AND COALESCE(c.is_public, true) = true`;
      }

      if (filters.search) {
        query += ` AND (c.title ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
        paramCount++;
      }

      // Sorting - allowlist to prevent SQL injection
      const allowedSortColumns = [
        "created_at",
        "updated_at",
        "title",
        "type",
        "frequency",
        "difficulty",
        "category",
        "is_active",
      ];
      const sortBy =
        filters.sort_by && allowedSortColumns.includes(filters.sort_by)
          ? filters.sort_by
          : "created_at";
      const sortOrder =
        filters.sort_order?.toUpperCase() === "ASC" ? "ASC" : "DESC";
      // sortBy validated against allowlist; quote identifier via pg-format.
      query += ` ORDER BY ${format("c.%I", sortBy)} ${sortOrder}`;

      // Pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const { rows } = await client.query(query, params);

      return { success: true, data: rows, count: rows.length };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("Error fetching challenges:", error);
      throw new InternalServerErrorException("Failed to fetch challenges");
    } finally {
      client.release();
    }
  }

  /**
   * Get daily tracker data - all DAILY challenges user participates in with entries
   * Query params: user_id, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)
   */
  @Get("daily-tracker")
  async getDailyTrackerData(
    @Query("user_id") user_id?: string,
    @Query("userId") userIdAlt?: string,
    @Query("start_date") startDate?: string,
    @Query("end_date") endDate?: string,
  ) {
    const userId = this.resolveQueryUserId(user_id, userIdAlt);
    if (!userId) {
      throw new BadRequestException("user_id is required");
    }

    this.logger.log(
      `Fetching daily tracker for user ${userId}, range: ${startDate} - ${endDate}`,
    );

    const client = await this.pool.connect();
    try {
      // Default to current week if not specified
      // IMPORTANT: Use local server date, not UTC date
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const today = `${year}-${month}-${day}`;
      const start =
        startDate ||
        (() => {
          const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
          const y = weekAgo.getFullYear();
          const m = String(weekAgo.getMonth() + 1).padStart(2, "0");
          const d = String(weekAgo.getDate()).padStart(2, "0");
          return `${y}-${m}-${d}`;
        })();
      const end = endDate || today;

      // Get all DAILY challenges the user participates in
      const { rows: challenges } = await client.query(
        `
        SELECT 
          c.*,
          p.current_streak,
          p.best_streak,
          p.total_entries,
          p.last_entry_date,
          p.id as participant_id
        FROM community_group_challenges c
        INNER JOIN community_challenge_participants p ON c.id = p.challenge_id
        WHERE p.user_id = $1 
          AND c.frequency = 'DAILY'
          AND c.is_active = true
        ORDER BY c.title
      `,
        [userId],
      );

      if (challenges.length === 0) {
        return {
          success: true,
          data: {
            challenges: [],
            entries_by_date: {},
            stats: {
              total_success_rate: null,
              total_days_tracked: 0,
            },
          },
        };
      }

      const challengeIds = challenges.map((c) => c.id);

      // Get all entries for these challenges in the date range
      const { rows: entries } = await client.query(
        `
        SELECT 
          challenge_id,
          entry_date,
          value,
          notes,
          created_at
        FROM community_challenge_entries
        WHERE user_id = $1 
          AND challenge_id = ANY($2)
          AND entry_date >= $3 
          AND entry_date <= $4
        ORDER BY entry_date DESC
      `,
        [userId, challengeIds, start, end],
      );

      // Helper function to calculate entry status
      const calculateStatus = (
        challenge: Record<string, unknown>,
        value: number,
      ): string => {
        if (challenge.type === "BOOLEAN") {
          const numValue = Number(value);
          const result = numValue === 1 ? "success" : "failed";
          this.logger.log(
            `BOOLEAN status calc: challenge=${challenge.id}, value=${value} (type=${typeof value}), numValue=${numValue}, result=${result}`,
          );
          return result;
        }

        // NUMERIC or DURATION
        if (!challenge.goal_value || !challenge.goal_direction) {
          return "neutral";
        }

        if (challenge.goal_direction === "maximize") {
          return value >= (challenge.goal_value as number)
            ? "success"
            : "failed";
        } else if (challenge.goal_direction === "minimize") {
          return value < (challenge.goal_value as number)
            ? "success"
            : "failed";
        }

        return "neutral";
      };

      // Organize entries by date
      const entriesByDate: Record<string, Record<string, unknown>> = {};
      let totalSuccess = 0;
      let totalFailed = 0;

      entries.forEach((entry) => {
        const raw = entry.entry_date;
        let dateKey: string;
        if (typeof raw === "string") {
          dateKey = raw.split("T")[0];
        } else if (raw instanceof Date) {
          const d = raw;
          dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          this.logger.log(
            `Date conversion: raw=${raw.toISOString()}, dateKey=${dateKey}`,
          );
        } else {
          dateKey = String(raw).split("T")[0];
        }
        if (!entriesByDate[dateKey]) {
          entriesByDate[dateKey] = {};
        }

        const challenge = challenges.find((c) => c.id === entry.challenge_id);
        const status = calculateStatus(challenge, entry.value);

        if (status === "success") totalSuccess++;
        else if (status === "failed") totalFailed++;

        entriesByDate[dateKey][entry.challenge_id] = {
          value: entry.value,
          notes: entry.notes,
          status,
          created_at: entry.created_at,
        };
      });

      // Calculate stats
      const totalEntries = totalSuccess + totalFailed;
      const successRate =
        totalEntries > 0 ? (totalSuccess / totalEntries) * 100 : null;

      // Format challenges with participant data
      const formattedChallenges = challenges.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        image_url: c.image_url,
        type: c.type,
        frequency: c.frequency,
        goal_value: c.goal_value,
        goal_direction: c.goal_direction,
        difficulty: c.difficulty,
        category: c.category,
        participant_data: {
          current_streak: c.current_streak,
          best_streak: c.best_streak,
          total_entries: c.total_entries,
          last_entry_date: c.last_entry_date,
        },
      }));

      this.logger.log(
        `✅ Fetched tracker data: ${challenges.length} challenges, ${entries.length} entries`,
      );

      return {
        success: true,
        data: {
          challenges: formattedChallenges,
          entries_by_date: entriesByDate,
          stats: {
            total_success_rate: successRate,
            total_days_tracked: Object.keys(entriesByDate).length,
          },
        },
      };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("Error fetching daily tracker:", error);
      throw new InternalServerErrorException(
        "Failed to fetch daily tracker data",
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get a specific challenge by ID with full details
   */
  @Get(":id")
  async getChallengeById(@Param("id") id: string) {
    this.logger.log(`Fetching challenge: ${id}`);

    const client = await this.pool.connect();
    try {
      // Get challenge with creator info and post_id
      const {
        rows: [challenge],
      } = await client.query(
        `
        SELECT 
          c.*,
          u.name as creator_name,
          u.avatar_url as creator_avatar,
          p.id as post_id
        FROM community_group_challenges c
        LEFT JOIN user_profiles u ON c.creator_id = u.id
        LEFT JOIN posts p ON p.community_challenge_id = c.id
        WHERE c.id = $1
      `,
        [id],
      );

      if (!challenge) {
        throw new NotFoundException("Challenge not found");
      }

      // Get participants (top 10)
      const { rows: participants } = await client.query(
        `
        SELECT 
          p.*,
          u.name as user_name,
          u.avatar_url as user_avatar
        FROM community_challenge_participants p
        LEFT JOIN user_profiles u ON p.user_id = u.id
        WHERE p.challenge_id = $1
        ORDER BY p.best_streak DESC, p.joined_at ASC
        LIMIT 10
      `,
        [id],
      );

      return {
        success: true,
        data: {
          ...challenge,
          participants,
        },
      };
    } catch (error_: unknown) {
      const error = error_ as Error;
      if (error instanceof NotFoundException) throw error;
      this.logger.error("Error fetching challenge:", error);
      throw new InternalServerErrorException("Failed to fetch challenge");
    } finally {
      client.release();
    }
  }

  /**
   * Join a challenge
   */
  @Post(":id/join")
  async joinChallenge(
    @Param("id") challengeId: string,
    @Body() dto: JoinChallengeDto,
  ) {
    this.logger.log(`User ${dto.user_id} joining challenge ${challengeId}`);

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Check if challenge exists and is active
      const {
        rows: [challenge],
      } = await client.query(
        `
        SELECT id, is_active FROM community_group_challenges WHERE id = $1
      `,
        [challengeId],
      );

      if (!challenge) {
        throw new NotFoundException("Challenge not found");
      }

      if (!challenge.is_active) {
        throw new BadRequestException("Challenge is not active");
      }

      // Check if already joined
      const { rows: existing } = await client.query(
        `
        SELECT id FROM community_challenge_participants 
        WHERE challenge_id = $1 AND user_id = $2
      `,
        [challengeId, dto.user_id],
      );

      if (existing.length > 0) {
        throw new BadRequestException("Already joined this challenge");
      }

      // Join the challenge
      const {
        rows: [participant],
      } = await client.query(
        `
        INSERT INTO community_challenge_participants 
        (challenge_id, user_id, joined_at)
        VALUES ($1, $2, NOW())
        RETURNING *
      `,
        [challengeId, dto.user_id],
      );

      // Increment participants count
      await client.query(
        `
        UPDATE community_group_challenges 
        SET participants_count = participants_count + 1 
        WHERE id = $1
      `,
        [challengeId],
      );

      await client.query("COMMIT");

      this.logger.log(`✅ User joined challenge successfully`);
      return { success: true, data: participant };
    } catch (error_: unknown) {
      const error = error_ as Error;
      await client.query("ROLLBACK");
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error("Error joining challenge:", error);
      throw new InternalServerErrorException("Failed to join challenge");
    } finally {
      client.release();
    }
  }

  /**
   * Add a challenge entry (daily progress)
   * Also calculates and updates streak
   */
  @Post(":id/entries")
  async addChallengeEntry(
    @Param("id") challengeId: string,
    @Body() dto: CreateChallengeEntryDto,
  ) {
    this.logger.log(
      `Adding entry for challenge ${challengeId}, user ${dto.user_id}, date=${dto.entry_date ?? "today"}, value=${dto.value}`,
    );

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Check if user is a participant
      const {
        rows: [participant],
      } = await client.query(
        `
        SELECT * FROM community_challenge_participants 
        WHERE challenge_id = $1 AND user_id = $2
      `,
        [challengeId, dto.user_id],
      );

      if (!participant) {
        this.logger.warn(
          `Entry rejected: user ${dto.user_id} is not participant of challenge ${challengeId}`,
        );
        throw new BadRequestException(
          "User is not a participant of this challenge",
        );
      }

      // Determine entry date (today if not specified)
      // IMPORTANT: Use local server date, not UTC date
      let entryDate: string;
      if (dto.entry_date) {
        entryDate = dto.entry_date;
        this.logger.log(`📅 Using provided entry_date: ${entryDate}`);
      } else {
        // Get current date in local timezone (not UTC)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        entryDate = `${year}-${month}-${day}`;
        this.logger.log(
          `📅 Generated local entry_date: ${entryDate} (no date provided)`,
        );
      }
      this.logger.log(
        `Entry date resolved to: ${entryDate} (received: ${dto.entry_date}, value: ${dto.value}, type: ${typeof dto.value})`,
      );

      // Check if entry already exists (to avoid incrementing total_entries on update)
      const {
        rows: [existingEntry],
      } = await client.query(
        `
        SELECT 1 FROM community_challenge_entries 
        WHERE challenge_id = $1 AND user_id = $2 AND entry_date = $3
      `,
        [challengeId, dto.user_id, entryDate],
      );

      const isNewEntry = !existingEntry;
      this.logger.log(
        `Entry ${isNewEntry ? "create" : "update"} for ${challengeId}, date=${entryDate}, value=${dto.value}`,
      );

      // Insert or update entry
      await client.query(
        `
        INSERT INTO community_challenge_entries 
        (challenge_id, user_id, entry_date, value, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (challenge_id, user_id, entry_date) 
        DO UPDATE SET value = $4, notes = $5
      `,
        [challengeId, dto.user_id, entryDate, dto.value, dto.notes || null],
      );

      // Calculate streak using SQL window function
      const { rows } = await client.query(
        `
        WITH daily_entries AS (
          SELECT entry_date::date
          FROM community_challenge_entries
          WHERE challenge_id = $1 AND user_id = $2
          ORDER BY entry_date DESC
        ),
        streak_calc AS (
          SELECT 
            entry_date,
            entry_date - (ROW_NUMBER() OVER (ORDER BY entry_date DESC))::int AS grp
          FROM daily_entries
        )
        SELECT COUNT(*) as current_streak
        FROM streak_calc
        WHERE grp = (SELECT grp FROM streak_calc LIMIT 1)
      `,
        [challengeId, dto.user_id],
      );

      const currentStreak = rows[0]?.current_streak || 0;

      // Update participant stats (only increment total_entries if new entry)
      await client.query(
        `
        UPDATE community_challenge_participants
        SET 
          current_streak = $3,
          best_streak = GREATEST(best_streak, $3),
          total_entries = total_entries + $4,
          last_entry_date = $5
        WHERE challenge_id = $1 AND user_id = $2
      `,
        [
          challengeId,
          dto.user_id,
          currentStreak,
          isNewEntry ? 1 : 0,
          entryDate,
        ],
      );

      await client.query("COMMIT");

      this.logger.log(`✅ Entry added successfully. Streak: ${currentStreak}`);
      return {
        success: true,
        data: {
          entry_date: entryDate,
          value: dto.value,
          current_streak: currentStreak,
        },
      };
    } catch (error_: unknown) {
      const error = error_ as Error;
      await client.query("ROLLBACK");
      if (error instanceof BadRequestException) throw error;
      this.logger.error("Error adding entry:", error);
      throw new InternalServerErrorException("Failed to add entry");
    } finally {
      client.release();
    }
  }

  /**
   * Get entries history for a challenge and user
   */
  @Get(":id/entries")
  async getChallengeEntries(
    @Param("id") challengeId: string,
    @Query("user_id") user_id?: string,
    @Query("userId") userIdAlt?: string,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ) {
    const userId = this.resolveQueryUserId(user_id, userIdAlt);
    if (!userId) {
      throw new BadRequestException("user_id is required");
    }

    this.logger.log(
      `Fetching entries for challenge ${challengeId}, user ${userId}`,
    );

    const client = await this.pool.connect();
    try {
      const actualLimit = limit || 100;
      const actualOffset = offset || 0;

      const { rows } = await client.query(
        `
        SELECT * FROM community_challenge_entries
        WHERE challenge_id = $1 AND user_id = $2
        ORDER BY entry_date DESC
        LIMIT $3 OFFSET $4
      `,
        [challengeId, userId, actualLimit, actualOffset],
      );

      return { success: true, data: rows, count: rows.length };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("Error fetching entries:", error);
      throw new InternalServerErrorException("Failed to fetch entries");
    } finally {
      client.release();
    }
  }

  /**
   * Get user statistics across all challenges
   */
  @Get("user/:userId/stats")
  async getUserStatistics(@Param("userId") userId: string) {
    this.logger.log(`Fetching statistics for user ${userId}`);

    const client = await this.pool.connect();
    try {
      // Overall stats
      const {
        rows: [overallStats],
      } = await client.query(
        `
        SELECT 
          COUNT(DISTINCT challenge_id) as active_challenges,
          SUM(total_entries) as total_entries,
          MAX(best_streak) as best_streak_overall,
          AVG(current_streak) as avg_current_streak
        FROM community_challenge_participants
        WHERE user_id = $1
      `,
        [userId],
      );

      // Per-challenge stats
      const { rows: challengeStats } = await client.query(
        `
        SELECT 
          p.*,
          c.title,
          c.type,
          c.frequency,
          c.difficulty,
          c.category,
          c.goal_value,
          c.deadline
        FROM community_challenge_participants p
        LEFT JOIN community_group_challenges c ON p.challenge_id = c.id
        WHERE p.user_id = $1
        ORDER BY p.current_streak DESC, p.joined_at DESC
      `,
        [userId],
      );

      return {
        success: true,
        data: {
          overall: overallStats,
          challenges: challengeStats,
        },
      };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("Error fetching user statistics:", error);
      throw new InternalServerErrorException("Failed to fetch statistics");
    } finally {
      client.release();
    }
  }

  /**
   * Update a challenge (creator only)
   */
  @Put(":id")
  async updateChallenge(
    @Param("id") challengeId: string,
    @Body() dto: UpdateCommunityGroupChallengeDto,
    @Query("user_id") user_id?: string,
    @Query("userId") userIdAlt?: string,
  ) {
    const userId = this.resolveQueryUserId(user_id, userIdAlt);
    if (!userId) {
      throw new BadRequestException("user_id is required");
    }

    this.logger.log(`Updating challenge ${challengeId}`);

    const client = await this.pool.connect();
    try {
      // Verify user is the creator
      const {
        rows: [challenge],
      } = await client.query(
        `
        SELECT creator_id FROM community_group_challenges WHERE id = $1
      `,
        [challengeId],
      );

      if (!challenge) {
        throw new NotFoundException("Challenge not found");
      }

      if (!this.isUuidString(userId)) {
        throw new BadRequestException("user_id must be a valid UUID");
      }

      const {
        rows: [allowed],
      } = await client.query(`SELECT ($1::uuid = creator_id) AS ok`, [
        userId,
      ]);
      if (!allowed?.ok) {
        throw new BadRequestException(
          "Only the creator can update this challenge",
        );
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (dto.title !== undefined) {
        updates.push(`title = $${paramCount}`);
        values.push(dto.title);
        paramCount++;
      }

      if (dto.description !== undefined) {
        updates.push(`description = $${paramCount}`);
        values.push(dto.description);
        paramCount++;
      }

      if (dto.image_url !== undefined) {
        updates.push(`image_url = $${paramCount}`);
        values.push(dto.image_url);
        paramCount++;
      }

      if (dto.goal_value !== undefined) {
        updates.push(`goal_value = $${paramCount}`);
        values.push(dto.goal_value);
        paramCount++;
      }

      if (dto.deadline !== undefined) {
        updates.push(`deadline = $${paramCount}`);
        values.push(dto.deadline);
        paramCount++;
      }

      if (dto.difficulty !== undefined) {
        updates.push(`difficulty = $${paramCount}`);
        values.push(dto.difficulty);
        paramCount++;
      }

      if (dto.category !== undefined) {
        updates.push(`category = $${paramCount}`);
        values.push(dto.category);
        paramCount++;
      }

      if (dto.is_active !== undefined) {
        updates.push(`is_active = $${paramCount}`);
        values.push(dto.is_active);
        paramCount++;
      }

      if (dto.goal_direction !== undefined) {
        updates.push(`goal_direction = $${paramCount}`);
        values.push(dto.goal_direction);
        paramCount++;
      }

      if (dto.is_public !== undefined) {
        updates.push(`is_public = $${paramCount}`);
        values.push(dto.is_public);
        paramCount++;
      }

      if (updates.length === 0) {
        throw new BadRequestException("No fields to update");
      }

      updates.push(`updated_at = NOW()`);
      values.push(challengeId);

      const {
        rows: [updated],
      } = await client.query(
        `
        UPDATE community_group_challenges 
        SET ${updates.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `,
        values,
      );

      this.logger.log(`✅ Challenge updated successfully`);
      return { success: true, data: updated };
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

  /**
   * Delete a challenge (creator only)
   */
  @Delete(":id")
  async deleteChallenge(
    @Param("id") challengeId: string,
    @Query("user_id") user_id?: string,
    @Query("userId") userIdAlt?: string,
  ) {
    const userId = this.resolveQueryUserId(user_id, userIdAlt);
    if (!userId) {
      throw new BadRequestException("user_id is required");
    }

    this.logger.log(`Deleting challenge ${challengeId}`);

    const client = await this.pool.connect();
    try {
      // Verify user is the creator
      const {
        rows: [challenge],
      } = await client.query(
        `
        SELECT creator_id FROM community_group_challenges WHERE id = $1
      `,
        [challengeId],
      );

      if (!challenge) {
        throw new NotFoundException("Challenge not found");
      }

      if (!this.isUuidString(userId)) {
        throw new BadRequestException("user_id must be a valid UUID");
      }

      const {
        rows: [allowed],
      } = await client.query(`SELECT ($1::uuid = creator_id) AS ok`, [
        userId,
      ]);
      if (!allowed?.ok) {
        throw new BadRequestException(
          "Only the creator can delete this challenge",
        );
      }

      // Delete cascade will handle participants and entries
      await client.query(
        `
        DELETE FROM community_group_challenges WHERE id = $1
      `,
        [challengeId],
      );

      this.logger.log(`✅ Challenge deleted successfully`);
      return { success: true, message: "Challenge deleted" };
    } catch (error_: unknown) {
      const error = error_ as Error;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error("Error deleting challenge:", error);
      throw new InternalServerErrorException("Failed to delete challenge");
    } finally {
      client.release();
    }
  }
}
