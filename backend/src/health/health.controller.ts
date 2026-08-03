import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      success: true,
      message: 'Finance Assistant API Running',
      timestamp: new Date().toISOString(),
    };
  }
}
