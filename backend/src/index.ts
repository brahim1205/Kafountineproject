import { createApp } from './app';
import { env } from './shared/config/env';

const app = createApp();

app.listen(env.port, '0.0.0.0', () => {
  console.log(`Backend running on http://localhost:${env.port}`);
});
