import crypto from 'crypto';
import { TokenManager } from '../security/token-manager.js';
import { response } from '../utils/index.js';
import sseBroker from './broker.js';

export const authenticateSse = (req, res, next) => {
  const token = req.query.token;

  if (!token) {
    return response(res, 401, 'Missing token', null);
  }

  try {
    const user = TokenManager.verifyAccessToken(token);
    if (user.role !== 'cashier' && user.role !== 'admin') {
      return response(res, 403, 'Forbidden', null);
    }
    req.user = user;
    next();
  } catch {
    return response(res, 401, 'Access token invalid or expired', null);
  }
};

export const subscribeDashboardSse = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const clientId = crypto.randomUUID();
  sseBroker.addClient(clientId, res);

  res.on('error', () => {
    sseBroker.removeClient(clientId);
  });

  res.write(': connected\n\n');

  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseBroker.removeClient(clientId);
  });
};
