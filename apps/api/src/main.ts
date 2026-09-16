import { createApp } from './app';
import { db } from './database';
void createApp().then(async (app) => {
  await app.listen(Number(process.env.API_PORT ?? 4000), '0.0.0.0');
  console.log('NovaBill Demo API lista');
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
      void app
        .close()
        .then(() => db.$disconnect())
        .then(() => process.exit(0));
    });
});
