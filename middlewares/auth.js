const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError('Unauthorized', 401));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return next(new AppError('Unauthorized', 401));
  }
}

module.exports = auth;