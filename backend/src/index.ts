import cluster from 'node:cluster';
import os from 'node:os';
import { createApp } from './app';
import { env } from './shared/config/env';

const numCPUs = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
const WORKERS = env.nodeEnv === 'production' ? Math.min(numCPUs, 4) : 1;

if (cluster.isPrimary && WORKERS > 1) {
  process.stdout.write(`Primary ${process.pid} starting ${WORKERS} workers\n`);

  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    process.stdout.write(
      `Worker ${worker.process.pid} died (code=${code}, signal=${signal}). Restarting...\n`
    );
    cluster.fork();
  });
} else {
  const app = createApp();
  const server = app.listen(env.port, '0.0.0.0', () => {
    process.stdout.write(
      `Backend worker ${process.pid} running on http://localhost:${env.port}\n`
    );
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    process.stdout.write(`Received ${signal}. Starting graceful shutdown...\n`);
    server.close(() => {
      process.stdout.write('HTTP server closed.\n');
      process.exit(0);
    });

    // Force exit after 30s
    setTimeout(() => {
      process.stderr.write('Forced shutdown after timeout.\n');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

