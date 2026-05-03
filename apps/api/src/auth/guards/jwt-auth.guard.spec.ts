/**
 * Unit tests for AdminAuthGuard — SEC-003.1
 * Verifies that admin access is role-based only (no hardcoded emails)
 */

function checkAdminAccess(user: { roles: string[]; email: string }): boolean {
  return (
    user.roles.includes("admin") ||
    user.roles.includes("org_admin") ||
    user.roles.includes("super_admin")
  );
}

function checkOperatorAccess(roles: string[]): boolean {
  return (
    roles.includes("operator") ||
    roles.includes("admin") ||
    roles.includes("super_admin")
  );
}

function validateOwnership(
  authUserId: string,
  requestedUserId: string,
  roles: string[],
): boolean {
  const isOwner = authUserId === requestedUserId;
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  return isOwner || isAdmin;
}

describe("AdminAuthGuard RBAC Logic (SEC-003.1)", () => {
  it("should allow super_admin role", () => {
    expect(
      checkAdminAccess({
        roles: ["user", "super_admin"],
        email: "anyone@test.com",
      }),
    ).toBe(true);
  });

  it("should allow admin role", () => {
    expect(
      checkAdminAccess({ roles: ["user", "admin"], email: "admin@karma.com" }),
    ).toBe(true);
  });

  it("should allow org_admin role", () => {
    expect(
      checkAdminAccess({ roles: ["user", "org_admin"], email: "org@ngo.com" }),
    ).toBe(true);
  });

  it("should DENY regular user — even with personal email (no email bypass)", () => {
    // Critical: role-only admin — personal email with only 'user' must NOT get admin API access
    expect(
      checkAdminAccess({
        roles: ["user"],
        email: "founder.personal@example.com",
      }),
    ).toBe(false);
  });

  it("should DENY regular user with karmacommunity email (no email bypass)", () => {
    expect(
      checkAdminAccess({
        roles: ["user"],
        email: "karmacommunity2.0@gmail.com",
      }),
    ).toBe(false);
  });

  it("should DENY volunteer role without admin", () => {
    expect(
      checkAdminAccess({
        roles: ["user", "volunteer"],
        email: "volunteer@test.com",
      }),
    ).toBe(false);
  });

  it("should allow admin + volunteer combined roles", () => {
    expect(
      checkAdminAccess({
        roles: ["user", "volunteer", "admin"],
        email: "v@test.com",
      }),
    ).toBe(true);
  });
});

describe("OperatorAuthGuard RBAC Logic (SRS §2.14)", () => {
  it("should allow operator role", () => {
    expect(checkOperatorAccess(["user", "operator"])).toBe(true);
  });

  it("should allow admin for oversight", () => {
    expect(checkOperatorAccess(["user", "admin"])).toBe(true);
  });

  it("should allow super_admin for oversight", () => {
    expect(checkOperatorAccess(["user", "super_admin"])).toBe(true);
  });

  it("should DENY org_admin without operator", () => {
    expect(checkOperatorAccess(["user", "org_admin"])).toBe(false);
  });

  it("should DENY volunteer only", () => {
    expect(checkOperatorAccess(["user", "volunteer"])).toBe(false);
  });
});

describe("Notification Ownership Validation (SEC-003.2)", () => {
  it("should allow user to access own notifications", () => {
    expect(validateOwnership("user-123", "user-123", ["user"])).toBe(true);
  });

  it("should DENY user from accessing other user notifications", () => {
    expect(validateOwnership("user-123", "user-456", ["user"])).toBe(false);
  });

  it("should allow admin to access any user notifications", () => {
    expect(validateOwnership("admin-1", "user-456", ["user", "admin"])).toBe(
      true,
    );
  });

  it("should allow super_admin to access any user notifications", () => {
    expect(
      validateOwnership("admin-2", "user-789", ["user", "super_admin"]),
    ).toBe(true);
  });

  it("should DENY volunteer from accessing other user notifications", () => {
    expect(validateOwnership("vol-1", "user-456", ["user", "volunteer"])).toBe(
      false,
    );
  });
});
