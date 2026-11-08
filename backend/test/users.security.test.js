describe('user role policy', () => {
  it('rejects unknown user roles', () => {
    const { normalizeAssignableUserRole } = require('../dist/src/modules/utilisateurs/application/UtilisateurService');

    expect(() => normalizeAssignableUserRole('ROOT', 'SUPER_ADMIN')).toThrow('Rôle utilisateur invalide');
  });

  it('limits REGISSEUR to field roles', () => {
    const { normalizeAssignableUserRole } = require('../dist/src/modules/utilisateurs/application/UtilisateurService');

    for (const role of ['AGENT', 'QUAI_PECHE', 'SERVICE_FINANCES']) expect(normalizeAssignableUserRole(role, 'REGISSEUR')).toBe(role);
    for (const role of ['ADMIN', 'SUPER_ADMIN', 'REGISSEUR', 'ETAT_CIVIL']) {
      expect(() => normalizeAssignableUserRole(role, 'REGISSEUR')).toThrow('Le régisseur');
    }
  });

  it('allows only SUPER_ADMIN to assign SUPER_ADMIN', () => {
    const { normalizeAssignableUserRole } = require('../dist/src/modules/utilisateurs/application/UtilisateurService');

    expect(() => normalizeAssignableUserRole('SUPER_ADMIN', 'ADMIN')).toThrow('Seul un SUPER_ADMIN');
    expect(normalizeAssignableUserRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe('SUPER_ADMIN');
  });
});
