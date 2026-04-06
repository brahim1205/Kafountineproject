import { createApp } from './app';
import { env } from './shared/config/env';

const app = createApp();

app.listen(env.port, '0.0.0.0', () => {
  process.stdout.write(`Backend running on http://localhost:${env.port}\n`);
});
