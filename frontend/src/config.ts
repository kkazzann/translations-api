// API base URL - different for dev and production
// On production (with zrok), API is at root, so use empty string
// On dev, API is at /translations-api/v1
export const API_BASE_URL = import.meta.env.VITE_API_BASE || '/translations-api/v1';
