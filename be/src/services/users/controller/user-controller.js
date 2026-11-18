import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { TokenManager } from '../../../security/token-manager.js';
import { response } from '../../../utils/index.js';
import userRepositories from '../repositories/user-repositories.js';
import authenticationRepositories from '../../authentications/repositories/authentication-repositories.js';

export const register = async (req, res) => {
  const { name, email, password } = req.validated;

  const existing = await userRepositories.findByEmail(email);
  if (existing) {
    return response(res, 409, 'Email already registered', null);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await userRepositories.createUser(name, email, hashedPassword);

  const accessToken = TokenManager.generateAccessToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'customer',
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

  return response(res, 201, null, {
    accessToken,
    user: { id: user.id, name: user.name, email: user.email },
  });
};
