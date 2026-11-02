describe('user role policy', () => {
  it('rejects unknown user roles', () => {
    const { normalizeAssignableUserRole } = require('../dist/src/modules/placeholders/presentation/PlaceholderUsersService');

    expect(() => normalizeAssignableUserRole('ROOT', 'SUPER_ADMIN')).toThrow('Rôle utilisateur invalide');
  });

  it('allows only SUPER_ADMIN to assign SUPER_ADMIN', () => {
    const { normalizeAssignableUserRole } = require('../dist/src/modules/placeholders/presentation/PlaceholderUsersService');

    expect(() => normalizeAssignableUserRole('SUPER_ADMIN', 'ADMIN')).toThrow('Seul un SUPER_ADMIN');
    expect(normalizeAssignableUserRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe('SUPER_ADMIN');
  });
});
