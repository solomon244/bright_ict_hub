import type { Course, DashboardStat, Enrollment, Quiz, User } from "../types";

export const featuredCourses: Course[] = [
  {
    _id: "course-frontend",
    id: "course-frontend",
    title: "Modern Frontend with React & Tailwind",
    description:
      "Build production-ready interfaces with React, TypeScript, and Tailwind CSS tailored for Ethiopian contexts.",
    slug: "modern-frontend-react-tailwind",
    category: "Web Development",
    level: "intermediate",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    instructor: {
      _id: "inst-1",
      firstName: "Selam",
      lastName: "Kebede",
      profileImage: "https://i.pravatar.cc/150?img=47",
    },
    price: 0,
    isPublished: true,
    totalLessons: 36,
    tags: ["React", "Tailwind", "UI"],
  },
  {
    _id: "course-python",
    id: "course-python",
    title: "Python for Data & AI",
    description:
      "Learn Python fundamentals through Ethiopian education datasets and practical labs.",
    slug: "python-data-ai",
    category: "Data Science",
    level: "beginner",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
    instructor: {
      _id: "inst-2",
      firstName: "Fitsum",
      lastName: "Hailemariam",
    },
    price: 0,
    isPublished: true,
    totalLessons: 42,
    tags: ["Python", "Data", "AI"],
  },
];

export const heroStats: DashboardStat[] = [
  {
    id: "learners",
    label: "Active Learners",
    value: "12.4K",
    change: "+18%",
    trend: "up",
  },
  {
    id: "hours",
    label: "Learning Hours",
    value: "94K",
    change: "+24%",
    trend: "up",
  },
  {
    id: "schools",
    label: "Partner Schools",
    value: "220+",
    change: "+9%",
    trend: "up",
  },
];

export const mockEnrollments: Enrollment[] = [
  {
    _id: "enr-1",
    id: "enr-1",
    course: "course-frontend",
    student: "student-1",
    status: "active",
    progressPercentage: 72,
    lastAccessedAt: "2025-11-18T10:00:00Z",
    updatedAt: "2025-11-18T10:00:00Z",
  },
  {
    _id: "enr-2",
    id: "enr-2",
    course: "course-python",
    student: "student-1",
    status: "active",
    progressPercentage: 38,
    lastAccessedAt: "2025-11-15T15:00:00Z",
    updatedAt: "2025-11-15T15:00:00Z",
  },
];

export const quizBank: Quiz[] = [
  {
    _id: "quiz-react-hooks",
    id: "quiz-react-hooks",
    title: "React Hooks Fundamentals",
    lesson: "l2",
    questions: [
      {
        prompt: "Which hook is best suited for data fetching side effects?",
        options: ["useState", "useEffect", "useMemo", "useReducer"],
        correctAnswerIndex: 1,
      },
      {
        prompt: "What does useMemo return?",
        options: [
          "A memoized value",
          "A memoized function",
          "A cleanup callback",
          "A new component",
        ],
        correctAnswerIndex: 0,
      },
    ],
  },
];

export const mockInstructors: User[] = [
  {
    _id: "inst-1",
    id: "inst-1",
    firstName: "Hanna",
    lastName: "Bekele",
    email: "hanna.bekele@ethio.tech",
    role: "instructor",
    bio: "Cloud-native engineer guiding students through modern backend systems.",
    profileImage: "https://i.pravatar.cc/150?img=52",
  },
  {
    _id: "inst-2",
    id: "inst-2",
    firstName: "Abel",
    lastName: "Mengistu",
    email: "abel.mengistu@ethio.tech",
    role: "instructor",
    bio: "Mobile developer advocating for Amharic-first apps.",
  },
];
