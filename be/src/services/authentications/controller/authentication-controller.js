import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { TokenManager } from '../../../security/token-manager.js';
import { response } from '../../../utils/index.js';
import userRepositories from '../../users/repositories/user-repositories.js';
import authenticationRepositories from '../repositories/authentication-repositories.js';

export const login = async (req, res) => {
  const { email, password } = req.validated;

  const user = await userRepositories.findByEmail(email);

  if (!user) return response(res, 401, 'Invalid email or password', null);

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) return response(res, 401, 'Invalid email or password', null);

  const accessToken = TokenManager.generateAccessToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await authenticationRepositories.addRefreshToken(user.id, refreshToken, expiresAt);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
  });

  return response(res, 200, null, {
    accessToken,
    user: { id: user.id, name: user.name, email: user.email },
  });
};

export const refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) return response(res, 401, 'Refresh token missing', null);

  const record = await authenticationRepositories.findRefreshToken(token);

  if (!record) return response(res, 401, 'Refresh token invalid or revoked', null);

  if (new Date(record.expires_at) < new Date()) return response(res, 401, 'Refresh token expired', null);

  const user = await userRepositories.findById(record.user_id);

  if (!user) return response(res, 401, 'User no longer exists', null);

  const accessToken = TokenManager.generateAccessToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  return response(res, 200, null, { accessToken });
};

export const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) await authenticationRepositories.deleteRefreshToken(token);

  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production',
  });

  return res.status(204).send();
};
