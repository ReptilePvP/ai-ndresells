
export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL
  },
  api: {
    ebay: {
      clientId: process.env.EBAY_CLIENT_ID,
      clientSecret: process.env.EBAY_CLIENT_SECRET,
      environment: process.env.EBAY_ENVIRONMENT || 'production'
    },
    stockx: {
      apiKey: process.env.STOCKX_API_KEY,
      baseUrl: process.env.STOCKX_BASE_URL
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY
    }
  },
  cache: {
    ttl: 3600, // 1 hour
    checkPeriod: 600 // 10 minutes
  },
  upload: {
    maxSize: '50mb',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
  }
} as const;
