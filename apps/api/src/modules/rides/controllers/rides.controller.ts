// File overview:
// - Purpose: Rides API for creating, listing, booking, updating, and stats; integrates with community/user activity.
// - Reached from: Routes under '/api/rides'.
// - Provides: Create ride, list with filters, get by id, book ride, update booking status, per-user rides, summary stats; clears caches accordingly.
// - Storage: `rides`, `ride_bookings`, `user_profiles`, `community_stats`; Redis caches with TTL.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Logger,
  Inject,
} from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { RedisCacheService } from "../../../redis/redis-cache.service";

interface CreateRideDto {
  driver_id: string;
  from_location: { name?: string; [key: string]: unknown };
  to_location: { name?: string; [key: string]: unknown };
  departure_time: string;
  arrival_time?: string;
  available_seats?: number;
  price_per_seat?: number;
  description?: string;
  requirements?: string;
  title?: string;
  metadata?: Record<string, unknown>;
  images?: string[];
}

@Controller("api/rides")
export class RidesController {
  private readonly logger = new Logger(RidesController.name);
  private readonly CACHE_TTL = 5 * 60; // 5 minutes for ride data

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  @Post()
  async createRide(@Body() rideData: CreateRideDto) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      this.logger.log(
        "🚗 Server - Creating ride with data:",
        JSON.stringify(rideData, null, 2),
      );

      // Validate required fields
      if (!rideData.driver_id) {
        await client.query("ROLLBACK");
        return { success: false, error: "Driver ID is required" };
      }

      if (!rideData.from_location || !rideData.to_location) {
        await client.query("ROLLBACK");
        return { success: false, error: "From and to locations are required" };
      }

      if (!rideData.departure_time) {
        await client.query("ROLLBACK");
        return { success: false, error: "Departure time is required" };
      }

      // Check or create user profile for driver_id
      let driverUuid = rideData.driver_id;

      // If driver_id is not a valid UUID, try to find or create user profile
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(rideData.driver_id)) {
        // Try to find existing user profile by legacy ID or email
        const { rows: existingUsers } = await client.query(
          `
          SELECT id FROM user_profiles 
          WHERE settings->>'legacy_id' = $1 OR email = $2 
          LIMIT 1
        `,
          [rideData.driver_id, `${rideData.driver_id}@legacy.com`],
        );

        if (existingUsers.length > 0) {
          driverUuid = existingUsers[0].id;
          this.logger.log(
            `🔄 Found existing user profile for ${rideData.driver_id}: ${driverUuid}`,
          );
        } else {
          // Create new user profile for legacy user
          const { rows: newUsers } = await client.query(
            `
            INSERT INTO user_profiles (email, name, settings)
            VALUES ($1, $2, $3)
            RETURNING id
          `,
            [
              `${rideData.driver_id}@legacy.com`,
              `User ${rideData.driver_id}`,
              JSON.stringify({
                legacy_id: rideData.driver_id,
                source: "legacy-app",
              }),
            ],
          );

          driverUuid = newUsers[0].id;
          this.logger.log(
            `✨ Created new user profile for ${rideData.driver_id}: ${driverUuid}`,
          );
        }
      }

      // Insert ride
      const { rows } = await client.query(
        `
        INSERT INTO rides (
          driver_id, title, from_location, to_location, departure_time,
          arrival_time, available_seats, price_per_seat, description, requirements, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
        [
          driverUuid,
          rideData.title ||
            `נסיעה מ${rideData.from_location?.name || "כאן"} ל${rideData.to_location?.name || "שם"}`,
          JSON.stringify(rideData.from_location),
          JSON.stringify(rideData.to_location),
          rideData.departure_time,
          rideData.arrival_time || null,
          rideData.available_seats || 1,
          rideData.price_per_seat || 0,
          rideData.description,
          rideData.requirements,
          rideData.metadata ? JSON.stringify(rideData.metadata) : null,
        ],
      );

      const ride = rows[0];

      // Create a corresponding post for the ride (enables likes/comments)
      await client.query(
        `
        INSERT INTO posts (author_id, ride_id, title, description, post_type, metadata, images)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          driverUuid,
          ride.id,
          ride.title,
          ride.description ||
            `נסיעה מ${rideData.from_location?.name || "כאן"} ל${rideData.to_location?.name || "שם"}`,
          "ride",
          JSON.stringify({
            from_location: rideData.from_location,
            to_location: rideData.to_location,
            departure_time: rideData.departure_time,
            available_seats: rideData.available_seats,
            price_per_seat: rideData.price_per_seat,
          }),
          rideData.images || [],
        ],
      );

      // Track user activity
      await client.query(
        `
        INSERT INTO user_activities (user_id, activity_type, activity_data)
        VALUES ($1, $2, $3)
      `,
        [
          driverUuid,
          "ride_created",
          JSON.stringify({
            ride_id: ride.id,
            from: rideData.from_location?.name,
            to: rideData.to_location?.name,
            seats: rideData.available_seats,
          }),
        ],
      );

      // Update community stats
      await client.query(`
        INSERT INTO community_stats (stat_type, stat_value, date_period)
        VALUES ('rides_created', 1, CURRENT_DATE)
        ON CONFLICT (stat_type, city, date_period) 
        DO UPDATE SET stat_value = community_stats.stat_value + 1, updated_at = NOW()
      `);

      await client.query("COMMIT");

      // Best-effort cache clearing (do not fail the request if Redis is down)
      try {
        await this.clearRideCaches();
        await this.clearCommunityStatsCaches();
      } catch (cacheError) {
        // eslint-disable-next-line no-console
        this.logger.error(
          "⚠️ Cache clear failed after ride creation:",
          cacheError,
        );
      }

      return { success: true, data: ride };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Create ride error:", error);
      return { success: false, error: "Failed to create ride" };
    } finally {
      client.release();
    }
  }

  @Get()
  async getRides(
    @Query("from_city") fromCity?: string,
    @Query("to_city") toCity?: string,
    @Query("date") date?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("include_past") include_past?: string,
    @Query("sort_by") sort_by?: string,
    @Query("sort_order") sort_order?: string,
  ) {
    // Cache key includes include_past and sort params
    const cacheKey = `rides_${fromCity || "all"}_${toCity || "all"}_${date || "all"}_${status || "active"}_${limit || "50"}_${offset || "0"}_${include_past || "false"}_${sort_by || "dep"}_${sort_order || "asc"}`;

    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    let query = `
      SELECT r.*, up.name as driver_name, up.avatar_url as driver_avatar,
             up.phone as driver_phone, 
             (r.available_seats - COALESCE(bookings.booked_seats, 0)) as remaining_seats
      FROM rides r
      LEFT JOIN user_profiles up ON r.driver_id = up.id
      LEFT JOIN (
        SELECT ride_id, SUM(seats_requested) as booked_seats
        FROM ride_bookings 
        WHERE status = 'approved'
        GROUP BY ride_id
      ) bookings ON r.id = bookings.ride_id
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramCount = 0;

    if (fromCity) {
      paramCount++;
      query += ` AND r.from_location->>'city' ILIKE $${paramCount}`;
      params.push(`%${fromCity}%`);
    }

    if (toCity) {
      paramCount++;
      query += ` AND r.to_location->>'city' ILIKE $${paramCount}`;
      params.push(`%${toCity}%`);
    }

    if (date) {
      paramCount++;
      query += ` AND DATE(r.departure_time) = $${paramCount}`;
      params.push(date);
    } else {
      // Only show future rides by default unless include_past is true, AND we are not sorting by created_at (feed mode)
      // If sorting by created_at, we typically want history too, but let's stick to explicit include_past for safety
      if (include_past !== "true") {
        query += ` AND r.departure_time > NOW()`;
      }
    }

    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
    } else {
      query += ` AND r.status = 'active'`;
    }

    // Sorting logic
    const allowedSortColumns = [
      "departure_time",
      "created_at",
      "price_per_seat",
    ];
    const sortCol =
      sort_by && allowedSortColumns.includes(sort_by)
        ? sort_by
        : "departure_time";
    const sortDir =
      sort_order && ["asc", "desc"].includes(sort_order.toLowerCase())
        ? sort_order.toUpperCase()
        : "ASC";

    query += ` ORDER BY r.${sortCol} ${sortDir}`;

    if (limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit, 10));
    } else {
      query += ` LIMIT 50`;
    }

    if (offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset, 10));
    }

    const { rows } = await this.pool.query(query, params);

    await this.redisCache.set(cacheKey, rows, this.CACHE_TTL);
    return { success: true, data: rows };
  }

  /**
   * Get a single ride by ID with caching
   * Cache TTL: 10 minutes (rides can change with bookings, so moderate TTL)
   */
  @Get(":id")
  async getRideById(@Param("id") id: string) {
    const cacheKey = `ride_${id}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(
      `
      SELECT r.*, up.name as driver_name, up.avatar_url as driver_avatar,
             up.phone as driver_phone, up.email as driver_email,
             (r.available_seats - COALESCE(bookings.booked_seats, 0)) as remaining_seats
      FROM rides r
      LEFT JOIN user_profiles up ON r.driver_id = up.id
      LEFT JOIN (
        SELECT ride_id, SUM(seats_requested) as booked_seats
        FROM ride_bookings 
        WHERE status = 'approved'
        GROUP BY ride_id
      ) bookings ON r.id = bookings.ride_id
      WHERE r.id = $1
    `,
      [id],
    );

    if (rows.length === 0) {
      return { success: false, error: "Ride not found" };
    }

    // Cache for 10 minutes
    await this.redisCache.set(cacheKey, rows[0], 10 * 60);
    return { success: true, data: rows[0] };
  }

  @Post(":id/book")
  async bookRide(
    @Param("id") rideId: string,
    @Body() bookingData: Record<string, unknown>,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Check if ride exists and has available seats
      const { rows: rideRows } = await client.query(
        `
        SELECT r.*, (r.available_seats - COALESCE(bookings.booked_seats, 0)) as remaining_seats
        FROM rides r
        LEFT JOIN (
          SELECT ride_id, SUM(seats_requested) as booked_seats
          FROM ride_bookings 
          WHERE status = 'approved'
          GROUP BY ride_id
        ) bookings ON r.id = bookings.ride_id
        WHERE r.id = $1 AND r.status = 'active'
      `,
        [rideId],
      );

      if (rideRows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Ride not found or not available" };
      }

      const ride = rideRows[0];
      const requestedSeats = bookingData.seats_requested || 1;

      if (ride.remaining_seats < requestedSeats) {
        await client.query("ROLLBACK");
        return { success: false, error: "Not enough available seats" };
      }

      // Resolve passenger ID to UUID (supports email, firebase_uid, or UUID)
      // NOTE: We only use our own UUID (user_profiles.id) for user identification
      let passengerUuid = bookingData.passenger_id as string;
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(passengerUuid)) {
        // Try to find user by email or firebase_uid ONLY
        const { rows: existingUsers } = await client.query(
          `
          SELECT id FROM user_profiles 
          WHERE LOWER(email) = LOWER($1) 
             OR firebase_uid = $1 
             OR id::text = $1
          LIMIT 1
        `,
          [passengerUuid],
        );

        if (existingUsers.length > 0) {
          passengerUuid = existingUsers[0].id;
          this.logger.log(
            `🔄 Found existing user profile for ${bookingData.passenger_id}: ${passengerUuid}`,
          );
        } else {
          // User not found - this is an error, passenger must exist
          await client.query("ROLLBACK");
          return {
            success: false,
            error: `User not found: ${bookingData.passenger_id}. User must be registered before booking a ride.`,
          };
        }
      } else {
        // Verify UUID exists
        const { rows: verifyUsers } = await client.query(
          `
          SELECT id FROM user_profiles WHERE id = $1::uuid LIMIT 1
        `,
          [passengerUuid],
        );

        if (verifyUsers.length === 0) {
          await client.query("ROLLBACK");
          return {
            success: false,
            error: `User not found: ${passengerUuid}. User must be registered before booking a ride.`,
          };
        }
      }

      // Create booking
      const { rows: bookingRows } = await client.query(
        `
        INSERT INTO ride_bookings (ride_id, passenger_id, seats_requested, message)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
        [rideId, passengerUuid, requestedSeats, bookingData.message || ""],
      );

      const booking = bookingRows[0];

      // Track user activity
      await client.query(
        `
        INSERT INTO user_activities (user_id, activity_type, activity_data)
        VALUES ($1, $2, $3)
      `,
        [
          passengerUuid,
          "ride_booking_created",
          JSON.stringify({
            ride_id: rideId,
            booking_id: booking.id,
            seats: requestedSeats,
          }),
        ],
      );

      await client.query("COMMIT");
      await this.clearRideCaches();
      // Clear community stats caches to reflect booking impact
      await this.clearCommunityStatsCaches();

      return { success: true, data: booking };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Book ride error:", error);
      return { success: false, error: "Failed to book ride" };
    } finally {
      client.release();
    }
  }

  @Put("bookings/:bookingId/status")
  async updateBookingStatus(
    @Param("bookingId") bookingId: string,
    @Body() statusData: Record<string, unknown>,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `
        UPDATE ride_bookings 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
        [statusData.status, bookingId],
      );

      if (rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Booking not found" };
      }

      const booking = rows[0];

      // If approved, check if ride is now full
      if (statusData.status === "approved") {
        const { rows: rideRows } = await client.query(
          `
          SELECT r.*, (r.available_seats - COALESCE(bookings.booked_seats, 0)) as remaining_seats
          FROM rides r
          LEFT JOIN (
            SELECT ride_id, SUM(seats_requested) as booked_seats
            FROM ride_bookings 
            WHERE status = 'approved'
            GROUP BY ride_id
          ) bookings ON r.id = bookings.ride_id
          WHERE r.id = $1
        `,
          [booking.ride_id],
        );

        if (rideRows.length > 0 && rideRows[0].remaining_seats <= 0) {
          await client.query(
            `
            UPDATE rides SET status = 'full', updated_at = NOW() WHERE id = $1
          `,
            [booking.ride_id],
          );
        }

        // Update community stats for completed rides
        await client.query(`
          INSERT INTO community_stats (stat_type, stat_value, date_period)
          VALUES ('rides_booked', 1, CURRENT_DATE)
          ON CONFLICT (stat_type, city, date_period) 
          DO UPDATE SET stat_value = community_stats.stat_value + 1, updated_at = NOW()
        `);
      }

      await client.query("COMMIT");
      await this.clearRideCaches();

      return { success: true, data: booking };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Update booking status error:", error);
      return { success: false, error: "Failed to update booking status" };
    } finally {
      client.release();
    }
  }

  @Get("user/:userId")
  async getUserRides(
    @Param("userId") userId: string,
    @Query("type") type?: string,
  ) {
    // Resolve potential legacy ID
    let resolvedUserId = userId;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(userId)) {
      const { rows: existingUsers } = await this.pool.query(
        `
        SELECT id FROM user_profiles 
        WHERE settings->>'legacy_id' = $1 OR id::text = $1
        LIMIT 1
      `,
        [userId],
      ); // Try match against legacy_id

      if (existingUsers.length > 0) {
        resolvedUserId = existingUsers[0].id;
      } else {
        // If not found, and it's not a UUID, we can't query the UUID column.
        // Return empty or throw 404. Returning empty is safer for lists.
        return { success: true, data: [] };
      }
    }

    const cacheKey = `user_rides_${resolvedUserId}_${type || "all"}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    let query;
    let params;

    if (type === "driver" || !type) {
      // Rides where user is the driver
      query = `
        SELECT r.*, 
               (r.available_seats - COALESCE(bookings.booked_seats, 0)) as remaining_seats,
               COALESCE(bookings.booking_count, 0) as total_bookings
        FROM rides r
        LEFT JOIN (
          SELECT ride_id, 
                 SUM(CASE WHEN status = 'approved' THEN seats_requested ELSE 0 END) as booked_seats,
                 COUNT(*) as booking_count
          FROM ride_bookings 
          GROUP BY ride_id
        ) bookings ON r.id = bookings.ride_id
        WHERE r.driver_id = $1
        ORDER BY r.departure_time DESC
      `;
      params = [resolvedUserId];
    } else {
      // Rides where user is a passenger
      query = `
        SELECT r.*, rb.status as booking_status, rb.seats_requested, rb.created_at as booking_date,
               up.name as driver_name, up.phone as driver_phone
        FROM ride_bookings rb
        JOIN rides r ON rb.ride_id = r.id
        LEFT JOIN user_profiles up ON r.driver_id = up.id
        WHERE rb.passenger_id = $1
        ORDER BY r.departure_time DESC
      `;
      params = [resolvedUserId];
    }

    const { rows } = await this.pool.query(query, params);

    await this.redisCache.set(cacheKey, rows, this.CACHE_TTL);
    return { success: true, data: rows };
  }

  @Get("stats/summary")
  async getRideStats() {
    const cacheKey = "ride_stats_summary";
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(`
      SELECT 
        COUNT(*) as total_rides,
        COUNT(DISTINCT driver_id) as unique_drivers,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_rides,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_rides,
        SUM(available_seats) as total_seats_offered,
        AVG(CASE WHEN price_per_seat > 0 THEN price_per_seat END) as avg_price
      FROM rides
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const bookingStats = await this.pool.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_bookings,
        SUM(CASE WHEN status = 'approved' THEN seats_requested ELSE 0 END) as total_seats_booked
      FROM ride_bookings
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const stats = {
      ...rows[0],
      ...bookingStats.rows[0],
    };

    await this.redisCache.set(cacheKey, stats, this.CACHE_TTL);
    return { success: true, data: stats };
  }

  @Put(":id")
  async updateRide(
    @Param("id") id: string,
    @Body() updateData: Record<string, unknown>,
  ) {
    const { rows } = await this.pool.query(
      `
      UPDATE rides 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          departure_time = COALESCE($3, departure_time),
          arrival_time = COALESCE($4, arrival_time),
          available_seats = COALESCE($5, available_seats),
          price_per_seat = COALESCE($6, price_per_seat),
          requirements = COALESCE($7, requirements),
          status = COALESCE($8, status),
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `,
      [
        updateData.title,
        updateData.description,
        updateData.departure_time,
        updateData.arrival_time,
        updateData.available_seats,
        updateData.price_per_seat,
        updateData.requirements,
        updateData.status,
        id,
      ],
    );

    if (rows.length === 0) {
      return { success: false, error: "Ride not found" };
    }

    // Clear specific ride cache
    await this.redisCache.delete(`ride_${id}`);
    await this.clearRideCaches();
    return { success: true, data: rows[0] };
  }

  @Delete(":id")
  async deleteRide(@Param("id") id: string) {
    const { rowCount } = await this.pool.query(
      `
      UPDATE rides SET status = 'cancelled', updated_at = NOW() WHERE id = $1
    `,
      [id],
    );

    if (rowCount === 0) {
      return { success: false, error: "Ride not found" };
    }

    // Clear specific ride cache
    await this.redisCache.delete(`ride_${id}`);
    await this.clearRideCaches();
    return { success: true, message: "Ride cancelled successfully" };
  }

  private async clearRideCaches() {
    const patterns = ["rides_*", "user_rides_*", "ride_stats_*", "ride_*"];

    for (const pattern of patterns) {
      await this.redisCache.invalidatePattern(pattern);
    }
  }

  private async clearCommunityStatsCaches() {
    const patterns = [
      "community_stats_*",
      "community_trends_*",
      "dashboard_stats",
      "real_time_stats",
    ];
    for (const pattern of patterns) {
      const keys = await this.redisCache.getKeys(pattern);
      for (const key of keys) {
        await this.redisCache.delete(key);
      }
    }
  }
}
