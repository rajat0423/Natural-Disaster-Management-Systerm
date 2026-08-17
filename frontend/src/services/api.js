/**
 * ============================================================
 * API Service — HTTP client for talking to the backend
 * ============================================================
 *
 * What this does:
 *   Creates a pre-configured HTTP client (using axios) that
 *   points at our Spring Boot backend (http://localhost:8080/api).
 *
 *   Every API call from the frontend goes through this file.
 *   This way, if the backend URL changes, we only change it
 *   in one place.
 *
 * How it works:
 *   import api from './services/api';
 *   const response = await api.get('/health');
 */

import axios from 'axios';

// The base URL of our Spring Boot backend.
// In development: http://localhost:8080/api
// The VITE_API_BASE_URL env variable can override this.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
