// API base URL - different for dev and production
export const API_BASE_URL = import.meta.env.MODE === 'production' 
  ? '' 
  : '/translations-api/v1';
