const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/users.routes');
const recordRoutes = require('./modules/records/records.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

app.use(
	cors({
		origin(origin, callback) {
			if (!origin) return callback(null, true);
			if (allowedOrigins.includes(origin)) return callback(null, true);
			return callback(new Error('CORS not allowed for this origin'));
		},
		credentials: true
	})
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if ((process.env.NODE_ENV || 'development') === 'development') app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

app.get('/api/health', (req, res) => res.json({ success: true, data: { ok: true } }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;