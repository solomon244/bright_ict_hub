/*
 * Usage: npm run seed:paths
 * Builds the "Web Development" path from courses ALREADY in your database whose titles match the
 * stages below (in this order). Missing stages are skipped and reported — create those courses, then
 * re-run, or build the path yourself with POST /api/learning-paths (admin).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDatabase = require('../src/config/db');
const Course = require('../src/models/Course');
const LearningPath = require('../src/models/LearningPath');

const STAGES = [/html/i, /css/i, /javascript|\bjs\b/i, /react/i, /node|express/i, /mongo/i, /full.?stack/i, /portfolio/i];

(async () => {
  await connectDatabase();
  const courses = await Course.find({}).select('title').lean();
  const used = new Set();
  const picked = [];
  for (const stage of STAGES) {
    const match = courses.find((c) => !used.has(String(c._id)) && stage.test(c.title));
    if (match) { used.add(String(match._id)); picked.push(match); console.log(`✔ ${stage} -> ${match.title}`); }
    else console.log(`– no course found for ${stage}`);
  }
  if (picked.length < 2) {
    console.log('Fewer than 2 matching courses; path not created.');
  } else {
    await LearningPath.updateOne(
      { title: 'Web Development' },
      { $set: { title: 'Web Development', titleAm: 'የድር ልማት', level: 'beginner', skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'MongoDB'], description: 'From your first web page to a full-stack project.', courses: picked.map((c, i) => ({ course: c._id, order: i + 1 })), isPublished: true } },
      { upsert: true }
    );
    console.log(`Created/updated path with ${picked.length} courses.`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
