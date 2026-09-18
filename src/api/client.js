import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wedding_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('wedding_admin_token');
      localStorage.removeItem('wedding_admin_user');
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.assign('/admin/login');
      }
    }

    return Promise.reject(error);
  }
);

export async function loginAdmin(payload) {
  const { data } = await api.post('/auth/login', payload);
  return data;
}

export async function fetchCurrentAdmin() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

export async function requestAdminRole(payload) {
  const { data } = await api.post('/auth/request-role', payload);
  return data.request;
}

export async function fetchRoleRequests() {
  const { data } = await api.get('/auth/role-requests');
  return data.requests;
}

export async function updateRoleRequest(requestId, payload) {
  const { data } = await api.patch(`/auth/role-requests/${encodeURIComponent(requestId)}`, payload);
  return data.request;
}

export async function fetchStats() {
  const { data } = await api.get('/stats');
  return data;
}

export async function fetchGuests() {
  const { data } = await api.get('/guests');
  return data.guests;
}

export async function createGuest(payload) {
  const { data } = await api.post('/register', payload);
  return data;
}

export async function deleteGuest(guestId) {
  const { data } = await api.delete(`/guests/${guestId}`);
  return data;
}

export async function fetchEventSettings() {
  const { data } = await api.get('/event-settings');
  return data.event;
}

export async function updateEventSettings(payload) {
  const { data } = await api.patch('/event-settings', payload);
  return data.event;
}

export async function uploadEventImage(payload) {
  const { data } = await api.post('/event-settings/upload-image', payload, { timeout: 60000 });
  return data.image;
}

export async function uploadEventAudio(payload) {
  const { data } = await api.post('/event-settings/upload-audio', payload, { timeout: 120000 });
  return data.audio;
}

export async function sendAllInvitations() {
  const { data } = await api.post('/send-email', {});
  return data;
}

export async function scanCheckIn(payload) {
  const { data } = await api.post('/scan-checkin', payload);
  return data;
}

export async function fetchInvitation(invitationId) {
  const { data } = await api.get(`/invitations/${invitationId}`);
  return data;
}

export async function submitInvitationRsvp(invitationId, payload) {
  const { data } = await api.post(`/invitations/${encodeURIComponent(invitationId)}/rsvp`, payload);
  return data;
}
