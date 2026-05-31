export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  userID: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  user: UserInfo;
}
