const { asyncHandler } = require('../../utils/errors');
const { successResponse } = require('../../utils/response');
const service = require('./users.service');

const listUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const data = service.listUsers({ page, limit, role: req.query.role, status: req.query.status });
  return successResponse(res, data.data, data.meta);
});

const getUser = asyncHandler(async (req, res) => successResponse(res, service.getUserById(Number(req.params.id))));

const createUser = asyncHandler(async (req, res) => {
  const user = await service.createUser(req.body);
  return successResponse(res, user, undefined, 201);
});

const updateUser = asyncHandler(async (req, res) => successResponse(res, await service.updateUser(Number(req.params.id), req.body)));

const deleteUser = asyncHandler(async (req, res) => successResponse(res, service.deactivateUser(Number(req.params.id))));

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };