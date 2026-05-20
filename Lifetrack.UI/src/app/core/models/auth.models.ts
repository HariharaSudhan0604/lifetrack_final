export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  userID: number;
  name: string;
  email: string;
  roleID: number;
  role: string;
  phone?: string;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  user: UserInfo;
}
