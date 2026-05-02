'use strict';

/**
 * Parse captured `allUsers` array source as JSON (dev scripts only; trusted repo file).
 * Replaces eval() for Sonar/security; returns [] if the literal is not strict JSON.
 */
function parseAllUsersLiteral(src) {
  try {
    const data = JSON.parse(src);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

module.exports = { parseAllUsersLiteral };
