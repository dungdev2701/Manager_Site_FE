export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Manager Site',
} as const;
