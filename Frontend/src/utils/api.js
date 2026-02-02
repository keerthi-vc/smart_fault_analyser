import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me')
};

// Complaints API
export const complaintsAPI = {
    create: (data) => api.post('/complaints', data),
    getAll: (params) => api.get('/complaints', { params }),
    getById: (id) => api.get(`/complaints/${id}`),
    update: (id, data) => api.patch(`/complaints/${id}`, data)
};

// Analytics API
export const analyticsAPI = {
    getStats: () => api.get('/analytics/stats'),
    getTrends: (days = 7) => api.get('/analytics/trends', { params: { days } }),
    getNetworkHealth: () => api.get('/analytics/network-health')
};

export default api;
