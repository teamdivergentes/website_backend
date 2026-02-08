export const PERMISSIONS = {
  // Users
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',

  // Roles
  ROLES_READ: 'roles:read',
  ROLES_WRITE: 'roles:write',
  ROLES_DELETE: 'roles:delete',

  // Teams
  TEAMS_READ: 'teams:read',
  TEAMS_WRITE: 'teams:write',
  TEAMS_DELETE: 'teams:delete',

  // Sponsors
  SPONSORS_READ: 'sponsors:read',
  SPONSORS_WRITE: 'sponsors:write',
  SPONSORS_DELETE: 'sponsors:delete',

  // Recruitment
  RECRUTEMENT_READ: 'recrutement:read',
  RECRUTEMENT_WRITE: 'recrutement:write',
  RECRUTEMENT_DELETE: 'recrutement:delete',

  // Config
  CONFIG_READ: 'config:read',
  CONFIG_WRITE: 'config:write',
} as const;

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  modifieur: [
    PERMISSIONS.TEAMS_READ,
    PERMISSIONS.TEAMS_WRITE,
    PERMISSIONS.TEAMS_DELETE,
    PERMISSIONS.SPONSORS_READ,
    PERMISSIONS.SPONSORS_WRITE,
    PERMISSIONS.SPONSORS_DELETE,
    PERMISSIONS.RECRUTEMENT_READ,
    PERMISSIONS.RECRUTEMENT_WRITE,
    PERMISSIONS.RECRUTEMENT_DELETE,
  ],
  community_manager: [PERMISSIONS.TEAMS_READ, PERMISSIONS.SPONSORS_READ],
};
