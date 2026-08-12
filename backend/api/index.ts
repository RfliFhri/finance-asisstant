import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Request, Response } from 'express';
import { AppModule } from '../src/app.module';

let application: Promise<INestApplication> | undefined;

async function getApplication() {
  application ??= NestFactory.create(AppModule).then(async (app) => {
    app.enableCors({ origin: true, credentials: true });
    await app.init();
    return app;
  });
  return application;
}

export default async function handler(request: Request, response: Response) {
  const app = await getApplication();
  return app.getHttpAdapter().getInstance()(request, response);
}
