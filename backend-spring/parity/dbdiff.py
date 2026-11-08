"""Compare kaf_dn (Node) et kaf_ds (Spring), hors id, horodatages d'appel et uuid créés pendant le scénario."""
import datetime, re, subprocess, sys
UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
TS = re.compile(r'"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)"')
VOLATILE = ['id', 'createdAt', 'updatedAt', 'timestamp', 'password', 'readAt', 'lastLogin', 'dateEmission', 'datePaiement', 'dateDemande', 'date', 'dateAttribution', 'expiresAt', 'usedAt', 'lastSentAt']
NOW = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
def psql(db, sql):
    return subprocess.run(['psql', '-h', '127.0.0.1', '-p', '55432', '-U', 'postgres', '-qAt', '-d', db, '-c', sql], capture_output=True, text=True, check=True).stdout
def near_now(text):
    value = datetime.datetime.fromisoformat(text)
    return any(abs((value - (NOW + datetime.timedelta(days=d))).total_seconds()) < 7200 for d in (0, 28, 29, 30, 31))
tables = psql('kaf_dn', "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' ORDER BY 1").split()
seeded = set(UUID.findall(subprocess.run(['pg_dump', '-h', '127.0.0.1', '-p', '55432', '-U', 'postgres', '--data-only', 'kaf_seeded'], capture_output=True, text=True, check=True).stdout))
def rows(db, t):
    out = []
    for line in psql(db, f'SELECT (to_jsonb(x) - ARRAY{VOLATILE!r}::text[])::text FROM "{t}" x').splitlines():
        line = UUID.sub(lambda m: m.group(0) if m.group(0) in seeded else '<new>', line)
        line = re.sub(r'backup-\d{4}-\d{2}-\d{2}_[\d-]+\.json', 'backup-<now>.json', line)
        line = re.sub(r'\\"createdAt\\":\\"[^\\]+\\",\\"tables', 'createdAt-tables', line)
        out.append(TS.sub(lambda m: '"<now>"' if near_now(m.group(1)) else m.group(0), line))
    return sorted(out)
rc = 0
for t in tables:
    a, b = rows('kaf_dn', t), rows('kaf_ds', t)
    if a != b:
        rc = 1
        print(f'DIFF {t} node={len(a)} spring={len(b)}')
        for x in [r for r in a if r not in b][:4]: print('  node  ', x[:400])
        for x in [r for r in b if r not in a][:4]: print('  spring', x[:400])
print('bases identiques' if rc == 0 else 'bases différentes')
sys.exit(rc)
