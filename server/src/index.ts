import { buildServerApp } from './app';
import { loadServerEnv } from './config/env';

async function main() {
  const env = loadServerEnv();
  const app = await buildServerApp({ env });

  await app.listen({ port: env.PORT, host: env.HOST });
  console.log(
    `WasteLess AI API running at http://${env.HOST}:${env.PORT} (provider=${env.LLM_PROVIDER})`
  );
}

main().catch((err) => {
  console.error('Failed to start WasteLess AI server:', err);
  process.exit(1);
});
