import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('apex_user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  }
  return config;
});

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  whoami: () => api.get('/auth/whoami'),
};

export const contactService = {
  list: () => api.get('/contacts'),
  create: (data) => api.post('/contacts', data),
  getTimeline: (id) => api.get(`/contacts/${id}/timeline`),
  bulkUpload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/bulk/upload/contacts', formData);
  },
};

export const dealService = {
  list: () => api.get('/deals'),
  create: (data) => api.post('/deals', data),
  getRiskScore: (id) => api.get(`/scores/deal-risk/${id}`),
};

export const ticketService = {
  list: () => api.get('/tickets'),
  getSla: (id) => api.get(`/tickets/${id}/sla`),
};

export const activityService = {
  list: () => api.get('/activities'),
  create: (data) => api.post('/activities', data),
  update: (id, data) => api.patch(`/activities/${id}`, data),
};

export const reportService = {
  getOverview: () => api.get('/reports/analytics-overview'),
  getPipeline: () => api.get('/reports/pipeline-forecast'),
  getFunnel: () => api.get('/reports/funnel'),
  getActivities: () => api.get('/reports/activity'),
};

export const adminService = {
  listUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  listConnectors: () => api.get('/admin/connectors'),
  getBackups: () => api.get('/admin/backups'),
  runBackup: () => api.post('/admin/backups/manual'),
};

export default api;
