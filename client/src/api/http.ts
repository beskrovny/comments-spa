import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3020',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});
