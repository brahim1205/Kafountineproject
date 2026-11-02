describe('placeholder schemas', () => {
  it('accepts only application-generated backup filenames', () => {
    const { backupFilenameParamsSchema, restoreBackupSchema } = require('../dist/src/modules/placeholders/presentation/placeholders.schemas');
    const valid = 'backup-2026-06-11_14-22-33-123.json';

    expect(backupFilenameParamsSchema.safeParse({ filename: valid }).success).toBe(true);
    expect(restoreBackupSchema.safeParse({ filename: valid }).success).toBe(true);

    for (const filename of [
      '../backup-2026-06-11_14-22-33-123.json',
      'backup-2026-06-11_14-22-33-123.json\r\nX-Test: injected',
      'manual-backup.json',
      'backup-2026-06-11.json',
    ]) {
      expect(backupFilenameParamsSchema.safeParse({ filename }).success).toBe(false);
      expect(restoreBackupSchema.safeParse({ filename }).success).toBe(false);
    }
  });
});
