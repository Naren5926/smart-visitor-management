const ROLES = Object.freeze({
  ADMIN: 'admin',
  HOST: 'host',
  SECURITY: 'security',
  VISITOR: 'visitor',
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

const STATUSES = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

const STATUS_VALUES = Object.freeze(Object.values(STATUSES));

module.exports = { ROLES, ROLE_VALUES, STATUSES, STATUS_VALUES };
