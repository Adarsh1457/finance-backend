const { asyncHandler } = require('../../utils/errors');
const { successResponse } = require('../../utils/response');
const service = require('./dashboard.service');

const summary = asyncHandler(async (req, res) => successResponse(res, service.summary(req.user)));
const byCategory = asyncHandler(async (req, res) => successResponse(res, service.byCategory(req.user)));
const trends = asyncHandler(async (req, res) => successResponse(res, service.trends(req.user, req.query.period || 'monthly')));
const recent = asyncHandler(async (req, res) => successResponse(res, service.recent(req.user, Number(req.query.limit || 10))));
const frequency = asyncHandler(async (req, res) => successResponse(res, service.frequency(req.user)));
const topCategories = asyncHandler(async (req, res) => successResponse(res, service.topCategories(req.user, Number(req.query.limit || 5))));

module.exports = { summary, byCategory, trends, recent, frequency, topCategories };