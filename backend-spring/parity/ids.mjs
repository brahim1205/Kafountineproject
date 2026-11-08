// Identifiants de référence lus dans la base de départ (le seed les génère aléatoirement).
import { execFileSync } from 'node:child_process';
const q = (sql) => execFileSync('psql', ['-h', '127.0.0.1', '-p', '55432', '-U', 'postgres', '-qAt', '-d', 'kaf_seeded', '-c', sql], { encoding: 'utf8' }).trim().split('\n');
export const [C, C2] = q('SELECT c.id FROM "Contribuable" c ORDER BY (SELECT count(*) FROM "Transaction" t WHERE t."contribuableId" = c.id) DESC, c.nin LIMIT 2');
export const [AGENT] = q(`SELECT id FROM "User" WHERE email = 'agent@kafountine.gouv.sn'`);
