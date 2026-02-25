/**
 * Secure query builder utilities for PostgreSQL.
 * Uses pg-format to safely escape identifiers (table/column names) and prevent SQL injection.
 * Use %I for identifiers in the format string; pass values as query params ($1, $2, ...) to pool.query().
 *
 * @example
 * import { format } from '../database/query-builder';
 * const query = format('SELECT data FROM %I WHERE user_id = $1 AND item_id = $2', tableName);
 * await pool.query(query, [userId, itemId]);
 */
import format from "pg-format";
export { format };
