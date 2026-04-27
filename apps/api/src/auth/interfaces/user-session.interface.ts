export interface UserSession {
  userId: string;
  email: string;
  sessionId: string;
  roles: string[];
  iat: number;
  exp: number;
  type: "access" | "refresh";
}
