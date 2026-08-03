import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  APP_NAME: string;

  @IsOptional()
  PORT: string;

  @IsOptional()
  NODE_ENV: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  TELEGRAM_BOT_TOKEN: string;

  @IsOptional()
  TELEGRAM_WEBHOOK_SECRET: string;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const environment = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(environment, {
    skipMissingProperties: false,
  });
  if (errors.length) {
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join(', ');
    throw new Error(`Environment tidak valid: ${messages}`);
  }
  return environment;
}
