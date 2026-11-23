export type UserRole = 'customer' | 'cashier' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface AuthResponse {
  status: string;
  data: {
    accessToken: string;
    user: User;
  };
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
