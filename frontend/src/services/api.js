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
  update: (id, data) => api.put(`/contacts/${id}`, data),
  remove: (id) => api.delete(`/contacts/${id}`),
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
  update: (id, data) => api.put(`/deals/${id}`, data),
  remove: (id) => api.delete(`/deals/${id}`),
  getRiskScore: (id) => api.get(`/scores/deal-risk/${id}`),
};

export const ticketService = {
  list: () => api.get('/tickets'),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  remove: (id) => api.delete(`/tickets/${id}`),
  getSla: (id) => api.get(`/tickets/${id}/sla`),
};

export const activityService = {
  list: () => api.get('/activities'),
  create: (data) => api.post('/activities', data),
  update: (id, data) => api.patch(`/activities/${id}`, data),
};

export const invoiceService = {
  list: () => api.get('/invoices'),
  create: ({ account_id, deal_id, invoice_number, subtotal, tax }) =>
    api.post('/invoices', null, {
      params: { account_id, deal_id, invoice_number, subtotal, tax },
    }),
  update: (id, data) => api.patch(`/invoices/${id}`, data),
  remove: (id) => api.delete(`/invoices/${id}`),
};

export const workflowService = {
  list: () => api.get('/workflows'),
  create: (data) => api.post('/workflows', data),
  createRule: (data) => api.post('/workflow-rules', data),
  run: (id, entity) => api.post(`/workflows/${id}/run`, entity),
  remove: (id) => api.delete(`/workflows/${id}`),
};

export const approvalService = {
  list: () => api.get('/approvals'),
  create: (data) => api.post('/approvals', data),
  decide: (id, approved, notes) =>
    api.post(`/approvals/${id}/decision`, null, { params: { approved, notes } }),
};

export const leadService = {
  list: () => api.get('/leads'),
  score: (id) => api.get(`/scores/lead/${id}`),
};

export const campaignService = {
  list: () => api.get('/campaigns'),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  remove: (id) => api.delete(`/campaigns/${id}`),
};

export const reportService = {
  getOverview: () => api.get('/reports/analytics-overview'),
  getPipeline: () => api.get('/reports/pipeline-forecast'),
  getForecast: () => api.get('/reports/sales/forecast'),
  getFunnel: () => api.get('/reports/funnel'),
  getActivities: () => api.get('/reports/activity'),
  getChannels: () => api.get('/reports/channels'),
};

// CRM <-> external systems integration (push outbound / ingest inbound).
export const connectorService = {
  list: () => api.get('/connectors'),
  create: (data) => api.post('/connectors', data),
  update: (id, data) => api.put(`/connectors/${id}`, data),
  remove: (id) => api.delete(`/connectors/${id}`),
  regenerateKey: (id) => api.post(`/connectors/${id}/regenerate-key`),
  deleteKey: (id) => api.delete(`/connectors/${id}/key`),
  test: (id, dryRun = true) =>
    api.post(`/connectors/${id}/test`, null, { params: { dry_run: dryRun } }),
  pushContact: (id, contactId, dryRun = true) =>
    api.post(`/connectors/${id}/push/contact/${contactId}`, null, { params: { dry_run: dryRun } }),
  pushDeal: (id, dealId, dryRun = true) =>
    api.post(`/connectors/${id}/push/deal/${dealId}`, null, { params: { dry_run: dryRun } }),
  inbound: (systemType, payload) => api.post(`/connectors/inbound/${systemType}`, payload),
  logs: () => api.get('/connectors/logs'),
};

export const settingsService = {
  list: () => api.get('/admin/settings'),
  upsert: (category, key, valueJson) =>
    api.post('/admin/settings', valueJson, { params: { category, key } }),
};

export const backupService = {
  list: () => api.get('/admin/backups'),
  runManual: () => api.post('/admin/backups/manual'),
  restore: (filePath) => api.post('/admin/backups/restore', null, { params: { file_path: filePath } }),
};

export const adminService = {
  listUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
};

export default api;
