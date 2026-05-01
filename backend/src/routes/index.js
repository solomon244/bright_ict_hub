const express = require('express');
const authRoutes = require('./authRoutes');
const courseRoutes = require('./courseRoutes');
const quizRoutes = require('./quizRoutes');
const categoryRoutes = require('./categoryRoutes');
const enrollmentRoutes = require('./enrollmentRoutes');
const progressRoutes = require('./progressRoutes');
const adminRoutes = require('./adminRoutes');
const userRoutes = require('./userRoutes');
const uploadRoutes = require('./uploadRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/quizzes', quizRoutes);
router.use('/categories', categoryRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/progress', progressRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;


