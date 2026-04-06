const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errors = err.errors || [];
  res.status(statusCode).json({ success: false, message, errors });
}

function notFound(req, res, next) {
  next(new AppError('Not Found', 404));
}

module.exports = { errorHandler, notFound };