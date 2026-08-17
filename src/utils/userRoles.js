const normalizeRoleValue = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const ADMIN_ROLE_VALUES = new Set([
  'admin',
  'administrador',
  'administrator'
]);

export const inferUserRole = (profile = {}, fallback = 'assessor') => {
  const candidates = [
    profile.tipoUser,
    profile.tipo,
    profile.role,
    profile.cargo,
    profile.perfil,
    profile.userType
  ];

  for (const candidate of candidates) {
    const normalized = normalizeRoleValue(candidate);
    if (!normalized) continue;
    if (ADMIN_ROLE_VALUES.has(normalized)) return 'admin';
    return normalized;
  }

  return fallback;
};

export const isAdminProfile = (profile = {}) => inferUserRole(profile, '') === 'admin';
