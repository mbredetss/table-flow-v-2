import { response } from '../utils/index.js';

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return response(res, 403, 'Forbidden', null);
  }
  next();
};

export default authorize;
