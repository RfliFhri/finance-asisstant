export default () => ({
  app: {
    name: process.env.APP_NAME || 'Finance Assistant',
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || '',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
  },

  database: {
    url: process.env.DATABASE_URL || '',
  },
});
