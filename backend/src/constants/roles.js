const USER_ROLES = {
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  ADMIN: 'admin',
};

const ROLE_HIERARCHY = {
  [USER_ROLES.STUDENT]: 1,
  [USER_ROLES.INSTRUCTOR]: 2,
  [USER_ROLES.ADMIN]: 3,
};

module.exports = {
  USER_ROLES,
  ROLE_HIERARCHY,
};


