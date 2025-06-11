
export const API_ENDPOINTS = {
  ANALYZE: '/api/analyze',
  LIVE: '/api/live',
  AUTH: '/api/auth',
  HISTORY: '/api/history',
  SAVED: '/api/saved'
} as const;

export const VALID_CATEGORIES = [
  'Electronics', 'Fashion', 'Home', 'Collectibles', 'Sports', 
  'Books', 'Toys', 'Health', 'Automotive', 'Garden'
] as const;

export const MARKET_DEMAND_LEVELS = ['High', 'Medium', 'Low'] as const;
