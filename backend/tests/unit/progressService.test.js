jest.mock('../../src/models/Progress');
jest.mock('../../src/models/Lesson');
jest.mock('../../src/models/Enrollment');
jest.mock('../../src/services/gamificationService', () => ({ recordEvent: jest.fn() }));

const Progress = require('../../src/models/Progress');
const Lesson = require('../../src/models/Lesson');
const Enrollment = require('../../src/models/Enrollment');
const gamification = require('../../src/services/gamificationService');
const { updateProgress, coursePercentage } = require('../../src/services/progressService');

const enrollment = (over = {}) => ({ status: 'active', save: jest.fn().mockResolvedValue(undefined), ...over });

beforeEach(() => {
  jest.clearAllMocks();
  Lesson.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'l1', course: 'c1' }) });
  Progress.findOneAndUpdate.mockResolvedValue({ status: 'completed' });
  Progress.countDocuments.mockResolvedValue(1);
  Lesson.countDocuments.mockResolvedValue(4);
  gamification.recordEvent.mockResolvedValue({ xpAwarded: 10, newBadges: [] });
});

describe('updateProgress', () => {
  test('requires enrolment in the lesson’s course', async () => {
    Enrollment.findOne.mockResolvedValue(null);
    await expect(updateProgress({ studentId: 's', lessonId: 'l1', status: 'completed' })).rejects.toMatchObject({ statusCode: 403 });
    expect(Progress.findOneAndUpdate).not.toHaveBeenCalled();
    expect(gamification.recordEvent).not.toHaveBeenCalled();
  });

  test('dropped enrolments cannot earn progress', async () => {
    Enrollment.findOne.mockResolvedValue(enrollment({ status: 'dropped' }));
    await expect(updateProgress({ studentId: 's', lessonId: 'l1', status: 'completed' })).rejects.toMatchObject({ statusCode: 403 });
  });

  test('unknown lesson is a 404; bad input is a 422', async () => {
    Lesson.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    await expect(updateProgress({ studentId: 's', lessonId: 'x', status: 'completed' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(updateProgress({ studentId: 's', lessonId: 'l1', status: 'done' })).rejects.toMatchObject({ statusCode: 422 });
    await expect(updateProgress({ studentId: 's', lessonId: 'l1', status: 'in_progress', percentage: 400 })).rejects.toMatchObject({ statusCode: 422 });
  });

  test('derives the course from the lesson and updates the enrolment percentage', async () => {
    const e = enrollment();
    Enrollment.findOne.mockResolvedValue(e);
    const res = await updateProgress({ studentId: 's', lessonId: 'l1', status: 'completed', percentage: 5 });
    expect(Progress.findOneAndUpdate).toHaveBeenCalledWith(
      { student: 's', lesson: 'l1' },
      expect.objectContaining({ course: 'c1', status: 'completed', percentage: 100 }),
      expect.anything()
    );
    expect(e.progressPercentage).toBe(25);
    expect(e.status).toBe('active');
    expect(res.data.reward.xpAwarded).toBe(10);
    expect(gamification.recordEvent).toHaveBeenCalledWith({ userId: 's', type: 'lesson_complete', refId: 'l1' });
  });

  test('finishing the last lesson completes the course and awards the course bonus', async () => {
    const e = enrollment();
    Enrollment.findOne.mockResolvedValue(e);
    Progress.countDocuments.mockResolvedValue(4);
    gamification.recordEvent.mockResolvedValueOnce({ xpAwarded: 10, newBadges: [] }).mockResolvedValueOnce({ xpAwarded: 50, newBadges: [{ code: 'course_complete' }] });
    const res = await updateProgress({ studentId: 's', lessonId: 'l1', status: 'completed' });
    expect(e.status).toBe('completed');
    expect(res.data.courseProgress).toEqual({ percentage: 100, completed: true });
    expect(res.data.reward.xpAwarded).toBe(60);
    expect(gamification.recordEvent).toHaveBeenCalledWith({ userId: 's', type: 'course_complete', refId: 'c1' });
  });

  test('in-progress saves earn no XP', async () => {
    Enrollment.findOne.mockResolvedValue(enrollment());
    await updateProgress({ studentId: 's', lessonId: 'l1', status: 'in_progress', percentage: 40 });
    expect(gamification.recordEvent).not.toHaveBeenCalled();
  });
});

test('coursePercentage guards against empty courses', () => {
  expect(coursePercentage(0, 0)).toBe(0);
  expect(coursePercentage(3, 4)).toBe(75);
  expect(coursePercentage(9, 4)).toBe(100);
});
