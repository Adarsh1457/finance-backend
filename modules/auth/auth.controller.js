const { asyncHandler } = require('../../utils/errors');
const { successResponse } = require('../../utils/response');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  return successResponse(res, data, undefined, 201);
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  return successResponse(res, data);
});

const logout = asyncHandler(async (req, res) => successResponse(res, { message: 'Logged out' }));

module.exports = { register, login, logout };