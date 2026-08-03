import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

let application: Promise<any> | undefined;

async function getApplication() {
  application ??= NestFactory.create(AppModule, { logger: false }).then(
    async (app) => {
      app.enableCors({ origin: true, credentials: true });
      await app.init();
      return app;
    },
  );
  return application;
}

export default async function handler(request: any, response: any) {
  const app = await getApplication();
  return app.getHttpAdapter().getInstance()(request, response);
}
