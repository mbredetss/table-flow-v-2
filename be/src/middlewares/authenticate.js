import { TokenManager } from '../security/token-manager.js';
import { response } from '../utils/index.js';

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response(res, 401, 'Missing or invalid Authorization header', null);
  }

  const token = authHeader.slice(7);

  try {
    req.user = TokenManager.verifyAccessToken(token);
    next();
  } catch {
    return response(res, 401, 'Access token invalid or expired', null);
  }
};

export default authenticate;
