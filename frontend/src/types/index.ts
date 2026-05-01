export type UserRole = 'student' | 'instructor' | 'admin';

export interface User {
  _id: string;
  id?: string; // For compatibility
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  profileImage?: string;
  bio?: string;
  skills?: string[];
  isEmailVerified?: boolean;
  socialLinks?: {
    youtube?: string;
    linkedin?: string;
    website?: string;
  };
  instructorProfile?: {
    experienceYears?: number;
    highlight?: string;
    status?: 'pending' | 'approved' | 'rejected';
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Category {
  _id?: string;
  id?: string; // For compatibility
  name: string;
  description: string;
  icon?: string;
}

export interface Lesson {
  _id: string;
  id?: string; // For compatibility
  course: string; // Course ID
  title: string;
  description?: string;
  order: number;
  content?: string;
  videoUrl?: string;
  duration?: number; // In minutes
  resources?: Array<{
    type: 'pdf' | 'doc' | 'link' | 'code';
    title?: string;
    url: string;
  }>;
  isPreviewable?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  _id: string;
  id?: string; // For compatibility
  title: string;
  description: string;
  slug: string;
  category: string | Category; // Can be populated
  level: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  thumbnailUrl?: string;
  promoVideoUrl?: string;
  instructor: string | {
    _id: string;
    id?: string;
    firstName: string;
    lastName: string;
    bio?: string;
    profileImage?: string;
  }; // Can be populated
  price: number;
  isPublished: boolean;
  requirements?: string[];
  outcomes?: string[];
  tags?: string[];
  totalDuration?: number;
  totalLessons: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  helper?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface Progress {
  _id: string;
  id?: string; // For compatibility
  student: string | User; // Can be populated
  lesson: string | Lesson; // Can be populated
  course: string | Course; // Can be populated
  status: 'not_started' | 'in_progress' | 'completed';
  percentage: number;
  lastVisitedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizAttempt {
  _id: string;
  id?: string; // For compatibility
  quiz: string | Quiz; // Can be populated
  student: string | User; // Can be populated
  score: number;
  totalQuestions: number;
  answers: Array<{
    questionIndex: number;
    selectedOptionIndex: number;
    isCorrect: boolean;
  }>;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quiz {
  _id: string;
  id?: string; // For compatibility
  lesson: string | Lesson; // Can be populated
  title: string;
  durationMinutes?: number;
  questions: Array<{
    prompt: string;
    options: string[];
    correctAnswerIndex: number;
    explanation?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Enrollment {
  _id: string;
  id?: string; // For compatibility
  course: string | Course; // Can be populated
  student: string | User; // Can be populated
  status: 'active' | 'completed' | 'dropped';
  progressPercentage: number;
  lastLesson?: string | Lesson; // Can be populated
  lastAccessedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

