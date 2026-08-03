import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns the application health response', () => {
    const response = new HealthController().check();

    expect(response.success).toBe(true);
    expect(response.message).toBe('Finance Assistant API Running');
    expect(new Date(response.timestamp).toString()).not.toBe('Invalid Date');
  });
});
