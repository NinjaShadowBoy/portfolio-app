export type UserRole = 'USER' | 'ADMIN';

export type OAuthProvider = 'google' | 'github';

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

// GitHub device flow: the backend returns this so the UI can show the user code
// and verification link, then poll with deviceCode.
export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number; // seconds
  interval: number; // seconds between polls
}

export interface DeviceStatusResponse {
  status: 'pending' | 'slow_down';
}

// A poll either completes (LoginResponse) or is still pending (DeviceStatusResponse).
export type DevicePollResult = LoginResponse | DeviceStatusResponse;

export function isDevicePending(result: DevicePollResult): result is DeviceStatusResponse {
  return (result as DeviceStatusResponse).status !== undefined;
}


