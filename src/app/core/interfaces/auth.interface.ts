export type UserRole = 'USER' | 'ADMIN';

export interface UserDto {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string; // ISO string
  lastLoginAt: string | null; // ISO string or null
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserDto;
  expiresIn: number; // milliseconds
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}


