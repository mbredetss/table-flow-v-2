import { TokenManager } from '../security/token-manager.js';
import { response } from '../utils/index.js';

const authenticateSse = (req, res, next) => {
  const token = req.query.token;

  if (!token) {
    return response(res, 401, 'Missing token', null);
  }

  try {
    const user = TokenManager.verifyAccessToken(token);
    req.user = user;
    next();
  } catch {
    return response(res, 401, 'Access token invalid or expired', null);
  }
};

export default authenticateSse;