let csrfToken = null;
export const setCsrf = (t) => {
  csrfToken = t;
};

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(method !== 'GET' && csrfToken ? { 'x-csrf-token': csrfToken } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  content: () => request('/api/content'),
  plans: () => request('/api/plans'),
  session: () => request('/api/auth/session'),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (payload) => request('/api/auth/reset-password', { method: 'POST', body: payload }),
  changePassword: (payload) => request('/api/auth/change-password', { method: 'POST', body: payload }),
  updateProfile: (payload) => request('/api/auth/profile', { method: 'PATCH', body: payload }),

  summary: () => request('/api/account/summary'),
  transactions: (params = '') => request(`/api/account/transactions${params}`),
  deposit: (payload) => request('/api/account/deposit', { method: 'POST', body: payload }),
  withdraw: (payload) => request('/api/account/withdraw', { method: 'POST', body: payload }),
  invest: (payload) => request('/api/account/invest', { method: 'POST', body: payload }),
  payPlan: (payload) => request('/api/account/pay-plan', { method: 'POST', body: payload }),
  referral: () => request('/api/account/referral'),

  admin: {
    saveSection: (key, body) => request(`/api/admin/content/${key}`, { method: 'PUT', body }),
    submissions: (kind) => request(`/api/admin/submissions${kind ? `?kind=${kind}` : ''}`),
    transactions: (status) => request(`/api/admin/transactions${status ? `?status=${status}` : ''}`),
    review: (id, payload) => request(`/api/admin/transactions/${id}/review`, { method: 'POST', body: payload }),
    users: () => request('/api/admin/users'),
    updateUser: (id, payload) => request(`/api/admin/users/${id}`, { method: 'PATCH', body: payload }),
    adjustBalance: (id, payload) => request(`/api/admin/users/${id}/adjust`, { method: 'POST', body: payload }),
    plans: () => request('/api/admin/plans'),
    createPlan: (payload) => request('/api/admin/plans', { method: 'POST', body: payload }),
    updatePlan: (id, payload) => request(`/api/admin/plans/${id}`, { method: 'PUT', body: payload }),
    deletePlan: (id) => request(`/api/admin/plans/${id}`, { method: 'DELETE' })
  }
};

export const money = (cents) => {
  const value = Number(cents || 0) / 100;
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
