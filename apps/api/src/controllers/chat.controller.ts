import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Request,
  Inject,
  Logger,
} from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { OptionalAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserResolutionService } from "../services/user-resolution.service";

interface CreateConversationDto {
  participants: string[];
  title?: string;
  type?: "direct" | "group";
  created_by?: string;
  metadata?: Record<string, unknown>;
}

interface SendMessageDto {
  conversation_id?: string;
  sender_id?: string;
  content: string;
  message_type?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  metadata?: Record<string, unknown>;
  reply_to_id?: string;
  participants?: string[];
}

interface MarkReadDto {
  user_id?: string;
}

@Controller("api/chat")
@UseGuards(OptionalAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  private readonly CACHE_TTL = 2 * 60; // 2 minutes

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly userResolutionService: UserResolutionService,
  ) {}

  // resolveUserId is now handled by UserResolutionService
  // This wrapper method maintains backward compatibility
  private async resolveUserId(userId: string): Promise<string> {
    // With throwOnNotFound=true, this will never return null
    return this.userResolutionService.resolveUserId(userId, {
      throwOnNotFound: true,
      cacheResult: true,
    }) as Promise<string>;
  }

  // --- Utility: Validate UUID ---
  private isValidUUID(uuid: string): boolean {
    return this.userResolutionService.isValidUUID(uuid);
  }

  // --- Utility: Clear Caches ---
  private async clearChatCaches() {
    const patterns = [
      "user_conversations_*",
      "conversation_messages_*",
      "search_messages_*",
      "chat_stats_summary",
    ];
    for (const pattern of patterns) {
      try {
        await this.redisCache.invalidatePattern(pattern);
      } catch (error) {
        this.logger.warn(
          `Failed to invalidate cache pattern ${pattern}:`,
          error,
        );
      }
    }
  }

  // --- Utility: Hash String ---
  private hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ==========================================
  // ENDPOINTS
  // ==========================================

  @Post("conversations")
  async createConversation(
    @Body() conversationData: CreateConversationDto,
    @Request() req: import("express").Request,
  ) {
    if (
      !conversationData.participants ||
      !Array.isArray(conversationData.participants)
    ) {
      return {
        success: false,
        error: "Participants must be a non-empty array",
      };
    }
    if (conversationData.participants.length < 2) {
      return {
        success: false,
        error: "Conversation must have at least 2 participants",
      };
    }
    if (conversationData.participants.length > 50) {
      return {
        success: false,
        error: "Conversation cannot have more than 50 participants",
      };
    }

    const authenticatedUserId = req.user?.userId;
    if (authenticatedUserId && !conversationData.created_by) {
      conversationData.created_by = authenticatedUserId;
    }

    if (!conversationData.created_by) {
      return { success: false, error: "created_by is required" };
    }

    const client = await this.pool.connect();

    try {
      const resolvedCreatedBy = await this.resolveUserId(
        conversationData.created_by,
      );
      const resolvedParticipants = await Promise.all(
        (conversationData.participants || []).map((p: string) =>
          this.resolveUserId(p),
        ),
      );

      if (!this.isValidUUID(resolvedCreatedBy)) {
        return {
          success: false,
          error: "Invalid user ID: created_by must be a valid UUID",
        };
      }

      for (const participant of resolvedParticipants) {
        if (!this.isValidUUID(participant)) {
          return {
            success: false,
            error: `Invalid participant ID: ${participant} must be a valid UUID`,
          };
        }
      }

      // CRITICAL FIX: Sort participants to ensure consistent order
      // This prevents duplicate conversations when participants arrive in different order
      const sortedParticipants = [...resolvedParticipants].sort((a, b) =>
        a.localeCompare(b),
      );

      await client.query("BEGIN");

      // Check for existing conversation with exact same participants
      // Use sorted participants to ensure we find existing conversation regardless of order
      const { rows: existingConvs } = await client.query(
        `
        SELECT * FROM chat_conversations
        WHERE participants @> $1::uuid[]
          AND participants <@ $1::uuid[]
          AND array_length(participants, 1) = $2
        LIMIT 1
      `,
        [sortedParticipants, sortedParticipants.length],
      );

      if (existingConvs.length > 0) {
        await client.query("COMMIT");
        client.release();
        return { success: true, data: existingConvs[0] };
      }

      // Insert with sorted participants to maintain consistency
      const { rows } = await client.query(
        `
        INSERT INTO chat_conversations (title, type, participants, created_by, metadata)
        VALUES ($1, $2, $3::uuid[], $4::uuid, $5)
        RETURNING *
      `,
        [
          conversationData.title || null,
          conversationData.type || "direct",
          sortedParticipants, // Use sorted participants
          resolvedCreatedBy,
          conversationData.metadata
            ? JSON.stringify(conversationData.metadata)
            : null,
        ],
      );

      const conversation = rows[0];

      await client.query(
        `
        INSERT INTO user_activities (user_id, activity_type, activity_data)
        VALUES ($1::uuid, $2, $3)
      `,
        [
          resolvedCreatedBy,
          "conversation_created",
          JSON.stringify({
            conversation_id: conversation.id,
            participants_count: resolvedParticipants.length,
          }),
        ],
      );

      await client.query("COMMIT");
      await this.clearChatCaches();

      return { success: true, data: conversation };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Create conversation error:", error);
      return { success: false, error: "Failed to create conversation" };
    } finally {
      client.release();
    }
  }

  @Get("conversations/user/:userId")
  async getUserConversations(
    @Param("userId") userId: string,
    @Request() req: import("express").Request,
  ) {
    this.logger.debug("Executing getUserConversations");
    try {
      const authenticatedUserId = req.user?.userId;
      const resolvedParamUserId = await this.resolveUserId(userId);
      let resolvedUserId: string;

      if (authenticatedUserId) {
        const resolvedAuthUserId =
          await this.resolveUserId(authenticatedUserId);
        if (resolvedParamUserId !== resolvedAuthUserId) {
          return {
            success: false,
            error: "Access denied - can only view your own conversations",
          };
        }
        resolvedUserId = resolvedAuthUserId;
      } else {
        resolvedUserId = resolvedParamUserId;
      }

      if (!this.isValidUUID(resolvedUserId)) {
        return { success: true, data: [] };
      }

      const cacheKey = `user_conversations_${resolvedUserId}`;
      let cached;
      try {
        cached = await this.redisCache.get(cacheKey);
      } catch {
        /* S108: cache miss is non-fatal */
      }

      if (cached) {
        return { success: true, data: cached };
      }

      // Query using UUID - all fields are now UUID type
      // Cast both sides explicitly to UUID to avoid type mismatch
      const { rows } = await this.pool.query(
        `
        SELECT 
          cc.*,
          cm.content as last_message_content,
          cm.message_type as last_message_type,
          cm.created_at as last_message_time,
          CASE 
            WHEN cm.sender_id IS NULL THEN 'ללא שם'
            ELSE COALESCE(
              (SELECT name FROM user_profiles WHERE id = cm.sender_id LIMIT 1),
              'ללא שם'
            )
          END as last_sender_name,
          (
            SELECT COUNT(*)
            FROM chat_messages cm2
            WHERE cm2.conversation_id = cc.id 
              AND cm2.sender_id != $1
              AND cm2.is_deleted = false
              AND NOT EXISTS (
                SELECT 1 
                FROM message_read_receipts mrr
                WHERE mrr.message_id = cm2.id 
                AND mrr.user_id = $1
              )
          ) as unread_count
        FROM chat_conversations cc
        LEFT JOIN chat_messages cm ON cc.last_message_id = cm.id
        WHERE $1::uuid = ANY(cc.participants::uuid[])
        ORDER BY cc.last_message_at DESC
      `,
        [resolvedUserId],
      );

      try {
        await this.redisCache.set(cacheKey, rows, this.CACHE_TTL);
      } catch {
        /* S108: cache set error is non-fatal */
      }

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Get user conversations error:", error);
      return {
        success: false,
        error: "Failed to get user conversations",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @Get("conversations/:conversationId/messages")
  async getConversationMessages(
    @Param("conversationId") conversationId: string,
    @Request() req: import("express").Request,
    @Query("limit") limit = "100",
    @Query("offset") offset = "0",
  ) {
    try {
      const limitNum = parseInt(limit, 10) || 100;
      const offsetNum = parseInt(offset, 10) || 0;

      if (!this.isValidUUID(conversationId)) {
        return { success: false, error: "Invalid conversation ID" };
      }

      const authenticatedUserId = req.user?.userId;

      if (authenticatedUserId) {
        const resolvedUserId = await this.resolveUserId(authenticatedUserId);
        if (!this.isValidUUID(resolvedUserId)) {
          return { success: false, error: "Invalid user ID" };
        }

        const { rows: convCheck } = await this.pool.query(
          `
          SELECT id FROM chat_conversations 
          WHERE id = $1::uuid AND $2::uuid = ANY(participants::uuid[])
        `,
          [conversationId, resolvedUserId],
        );

        if (convCheck.length === 0) {
          return {
            success: false,
            error: "Conversation not found or access denied",
          };
        }
      } else {
        const { rows: convCheck } = await this.pool.query(
          `
          SELECT id FROM chat_conversations WHERE id = $1::uuid
        `,
          [conversationId],
        );
        if (convCheck.length === 0) {
          return { success: false, error: "Conversation not found" };
        }
      }

      const cacheKey = `conversation_messages_${conversationId}_${limitNum}_${offsetNum}`;
      let cached;
      try {
        cached = await this.redisCache.get(cacheKey);
        if (cached) {
          return { success: true, data: cached };
        }
      } catch {
        /* S108: cache miss is non-fatal */
      }

      const { rows } = await this.pool.query(
        `
        SELECT 
          cm.*,
          COALESCE(
            (SELECT name FROM user_profiles WHERE id = cm.sender_id LIMIT 1),
            'ללא שם'
          ) as sender_name,
          COALESCE(
            (SELECT avatar_url FROM user_profiles WHERE id = cm.sender_id LIMIT 1),
            ''
          ) as sender_avatar
        FROM chat_messages cm
        WHERE cm.conversation_id = $1::uuid
          AND cm.is_deleted = false
        ORDER BY cm.created_at DESC
        LIMIT $2 OFFSET $3
      `,
        [conversationId, limitNum, offsetNum],
      );

      const messages = rows.reverse();

      try {
        await this.redisCache.set(cacheKey, messages, this.CACHE_TTL);
      } catch {
        /* S108: cache set error is non-fatal */
      }

      return { success: true, data: messages };
    } catch (error) {
      this.logger.error("Get conversation messages error:", error);
      return {
        success: false,
        error: "Failed to get conversation messages",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @Post("messages")
  async sendMessage(
    @Body() messageData: SendMessageDto,
    @Request() req: import("express").Request,
  ) {
    const client = await this.pool.connect();
    const authenticatedUserId = req.user?.userId;
    let senderId: string;

    if (authenticatedUserId) {
      senderId = messageData.sender_id || authenticatedUserId;
      if (senderId !== authenticatedUserId) {
        client.release();
        return { success: false, error: "Cannot send message as another user" };
      }
    } else {
      if (!messageData.sender_id) {
        client.release();
        return {
          success: false,
          error: "sender_id is required when not authenticated",
        };
      }
      senderId = messageData.sender_id;
    }

    const resolvedSenderId = await this.resolveUserId(senderId);
    if (!this.isValidUUID(resolvedSenderId)) {
      client.release();
      return {
        success: false,
        error: "Invalid sender ID: must be a valid UUID",
      };
    }

    let conversationId = messageData.conversation_id;
    let conversationCreated = false;
    let transactionStarted = false;

    try {
      if (!conversationId || !this.isValidUUID(conversationId)) {
        if (messageData.participants && messageData.participants.length > 0) {
          const resolvedParticipants = await Promise.all(
            messageData.participants.map((p: string) => this.resolveUserId(p)),
          );

          for (const p of resolvedParticipants) {
            if (!this.isValidUUID(p)) {
              client.release();
              return { success: false, error: `Invalid participant ID: ${p}` };
            }
          }

          // CRITICAL FIX: Sort participants to ensure consistent order
          const sortedParticipants = [...resolvedParticipants].sort((a, b) =>
            a.localeCompare(b),
          );

          await client.query("BEGIN");
          transactionStarted = true;

          const participantsHash = sortedParticipants.join(",");
          const lockKey = `conversation_${Buffer.from(participantsHash).toString("base64").slice(0, 16)}`;
          const lockId = this.hashStringToInt(lockKey);
          await client.query("SELECT pg_advisory_xact_lock($1)", [lockId]);

          // Check with sorted participants
          const { rows: existingConvs } = await client.query(
            `
              SELECT id FROM chat_conversations
              WHERE participants @> $1::uuid[]
                AND participants <@ $1::uuid[]
                AND array_length(participants, 1) = $2
              LIMIT 1
            `,
            [sortedParticipants, sortedParticipants.length],
          );

          if (existingConvs.length > 0) {
            conversationId = existingConvs[0].id;
          } else {
            // Insert with sorted participants
            const { rows: newConvRows } = await client.query(
              `
                INSERT INTO chat_conversations (title, type, participants, created_by, metadata)
                VALUES ($1, $2, $3::uuid[], $4::uuid, $5)
                RETURNING *
              `,
              [
                null,
                "direct",
                sortedParticipants,
                resolvedSenderId,
                messageData.metadata
                  ? JSON.stringify(messageData.metadata)
                  : null,
              ],
            );
            conversationId = newConvRows[0].id;
            conversationCreated = true;
          }
        } else {
          client.release();
          return {
            success: false,
            error: "Invalid conversation ID or missing participants",
          };
        }
      } else {
        await client.query("BEGIN");
        transactionStarted = true;
      }

      let convCheck;
      if (authenticatedUserId) {
        const { rows } = await client.query(
          `
          SELECT id FROM chat_conversations 
          WHERE id = $1::uuid AND $2::uuid = ANY(participants::uuid[])
        `,
          [conversationId, resolvedSenderId],
        );
        convCheck = rows;
      } else {
        const { rows } = await client.query(
          `SELECT id FROM chat_conversations WHERE id = $1::uuid`,
          [conversationId],
        );
        convCheck = rows;
      }

      if (convCheck.length === 0) {
        if (transactionStarted) await client.query("ROLLBACK");
        client.release();
        return {
          success: false,
          error: "Conversation not found or access denied",
        };
      }

      if (!messageData.content && !messageData.file_url) {
        if (transactionStarted) await client.query("ROLLBACK");
        client.release();
        return {
          success: false,
          error: "Message must have content or file_url",
        };
      }

      if (messageData.content && messageData.content.length > 10000) {
        if (transactionStarted) await client.query("ROLLBACK");
        client.release();
        return { success: false, error: "Message content too long" };
      }

      if (messageData.file_url) {
        try {
          new URL(messageData.file_url);
        } catch {
          if (transactionStarted) await client.query("ROLLBACK");
          client.release();
          return { success: false, error: "Invalid file_url format" };
        }
      }

      const { rows } = await client.query(
        `
        INSERT INTO chat_messages (
          conversation_id, sender_id, content, message_type, 
          file_url, file_name, file_size, file_type, metadata, reply_to_id
        ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::uuid)
        RETURNING *
      `,
        [
          conversationId,
          resolvedSenderId,
          messageData.content || null,
          messageData.message_type || "text",
          messageData.file_url || null,
          messageData.file_name || null,
          messageData.file_size || null,
          messageData.file_type || null,
          messageData.metadata ? JSON.stringify(messageData.metadata) : null,
          messageData.reply_to_id || null,
        ],
      );

      const message = rows[0];

      await client.query(
        `
        UPDATE chat_conversations 
        SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `,
        [message.id, conversationId],
      );

      await client.query("COMMIT");
      await this.clearChatCaches();

      client.release();
      return {
        success: true,
        data: message,
        conversation_id:
          conversationCreated || conversationId !== messageData.conversation_id
            ? conversationId
            : undefined,
        conversation_created:
          conversationCreated || conversationId !== messageData.conversation_id,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // ignore rollback errors
        }
      }
      client.release();
      this.logger.error("Send message error:", error);
      return {
        success: false,
        error: "Failed to send message",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @Post("conversations/:conversationId/read-all")
  async markAllMessagesAsRead(
    @Param("conversationId") conversationId: string,
    @Body() body: MarkReadDto,
    @Request() req: import("express").Request,
  ) {
    const client = await this.pool.connect();
    try {
      const authenticatedUserId = req.user?.userId || body?.user_id;
      if (!authenticatedUserId) {
        client.release();
        return { success: false, error: "Authentication required" };
      }

      const resolvedUserId = await this.resolveUserId(authenticatedUserId);
      if (
        !this.isValidUUID(resolvedUserId) ||
        !this.isValidUUID(conversationId)
      ) {
        client.release();
        return { success: false, error: "Invalid ID" };
      }

      const { rows: convCheck } = await this.pool.query(
        `
        SELECT id FROM chat_conversations 
        WHERE id = $1::uuid AND $2::uuid = ANY(participants)
      `,
        [conversationId, resolvedUserId],
      );

      if (convCheck.length === 0) {
        client.release();
        return {
          success: false,
          error: "Conversation not found or access denied",
        };
      }

      await client.query("BEGIN");
      const { rows: unreadMessages } = await client.query(
        `
        SELECT id FROM chat_messages
        WHERE conversation_id = $1::uuid
          AND sender_id != $2
          AND is_deleted = false
          AND NOT EXISTS (
            SELECT 1 FROM message_read_receipts 
            WHERE message_id = chat_messages.id AND user_id = $2
          )
      `,
        [conversationId, resolvedUserId],
      );

      if (unreadMessages.length > 0) {
        const insertPromises = unreadMessages.map((msg) =>
          client.query(
            `
            INSERT INTO message_read_receipts (message_id, user_id)
            VALUES ($1::uuid, $2)
            ON CONFLICT (message_id, user_id) DO NOTHING
          `,
            [msg.id, resolvedUserId],
          ),
        );
        await Promise.all(insertPromises);
      }

      await client.query("COMMIT");
      await this.clearChatCaches();

      client.release();
      return { success: true, data: { marked_read: unreadMessages.length } };
    } catch (_error) {
      await client.query("ROLLBACK");
      client.release();
      return { success: false, error: "Failed to mark messages read" };
    }
  }

  @Post("messages/:messageId/read")
  async markMessageAsRead(
    @Param("messageId") messageId: string,
    @Body() body: MarkReadDto,
    @Request() req: import("express").Request,
  ) {
    const client = await this.pool.connect();
    try {
      const authenticatedUserId = req.user?.userId || body?.user_id;
      if (!authenticatedUserId) {
        client.release();
        return { success: false, error: "Authentication required" };
      }
      const resolvedUserId = await this.resolveUserId(authenticatedUserId);

      if (!this.isValidUUID(resolvedUserId) || !this.isValidUUID(messageId)) {
        client.release();
        return { success: false, error: "Invalid ID" };
      }

      const { rows: messageCheck } = await this.pool.query(
        `
            SELECT cm.id, cm.conversation_id, cm.sender_id
            FROM chat_messages cm
            JOIN chat_conversations cc ON cm.conversation_id = cc.id
            WHERE cm.id = $1::uuid
            AND $2::uuid = ANY(cc.participants::uuid[])
            AND cm.is_deleted = false
        `,
        [messageId, resolvedUserId],
      );

      if (messageCheck.length === 0) {
        client.release();
        return { success: false, error: "Message not found or access denied" };
      }

      if (messageCheck[0].sender_id === resolvedUserId) {
        client.release();
        return { success: true, data: { already_read: true } };
      }

      await client.query("BEGIN");
      await client.query(
        `
            INSERT INTO message_read_receipts (message_id, user_id)
            VALUES ($1::uuid, $2)
            ON CONFLICT (message_id, user_id) DO NOTHING
        `,
        [messageId, resolvedUserId],
      );
      await client.query("COMMIT");
      await this.clearChatCaches();

      client.release();
      return { success: true, data: { marked_read: true } };
    } catch (_error) {
      await client.query("ROLLBACK");
      client.release();
      return { success: false, error: "Failed to mark message as read" };
    }
  }
}
