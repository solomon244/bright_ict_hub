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
const tutorRoutes = require('./tutorRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const recommendationRoutes = require('./recommendationRoutes');
const aiRoutes = require('./aiRoutes');
const { gamificationRouter, pathRouter, codingRouter } = require('./learningRoutes');
const { communityRouter, notificationRouter, analyticsRouter } = require('./communityRoutes');

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
router.use('/tutor', tutorRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/ai', aiRoutes);
router.use('/gamification', gamificationRouter);
router.use('/learning-paths', pathRouter);
router.use('/coding', codingRouter);
router.use('/community', communityRouter);
router.use('/notifications', notificationRouter);
router.use('/analytics', analyticsRouter);

module.exports = router;


