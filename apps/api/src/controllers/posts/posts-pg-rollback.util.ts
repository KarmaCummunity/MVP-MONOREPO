import type { Logger } from "@nestjs/common";
import type { PoolClient } from "pg";

export async function safeRollback(
  client: PoolClient,
  logger: Logger,
): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    logger.error("Rollback error:", rollbackError);
  }
}
