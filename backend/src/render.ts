import dataSource from './database/data-source';
import { bootstrap } from './main';

async function startRenderService() {
  await dataSource.initialize();
  try {
    await dataSource.runMigrations({ transaction: 'all' });
  } finally {
    await dataSource.destroy();
  }

  await bootstrap();
}

void startRenderService().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: 'fatal',
      message: 'Render startup migration or API bootstrap failed',
      error: error instanceof Error ? error.message : 'Unknown startup error',
    }),
  );
  process.exitCode = 1;
});
