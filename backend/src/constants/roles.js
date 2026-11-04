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

/** Roles a person may choose for themselves at sign-up. Admin is never self-service. */
const SELF_REGISTER_ROLES = [USER_ROLES.STUDENT, USER_ROLES.INSTRUCTOR];

module.exports = {
  USER_ROLES,
  SELF_REGISTER_ROLES,
  ROLE_HIERARCHY,
};


