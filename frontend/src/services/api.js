export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const API_BASE = `${BACKEND_URL}/api`;

export function getStoredToken() {
  return localStorage.getItem('chat_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('chat_token', token);
  } else {
    localStorage.removeItem('chat_token');
  }
}

export function getStoredUser() {
  const user = localStorage.getItem('chat_user');
  return user ? JSON.parse(user) : null;
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('chat_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('chat_user');
  }
}

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  googleLogin: (credential) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  getMe: () => request('/auth/me'),

  // Users
  getAllUsers: () => request('/users'),

  // Friends
  getFriends: () => request('/friends'),
  getRequests: () => request('/friends/requests'),
  sendFriendRequest: (userId) => request(`/friends/request/${userId}`, { method: 'POST' }),
  acceptFriendRequest: (requestId) => request(`/friends/accept/${requestId}`, { method: 'POST' }),
  rejectFriendRequest: (requestId) => request(`/friends/reject/${requestId}`, { method: 'POST' }),
  cancelFriendRequest: (requestId) => request(`/friends/cancel/${requestId}`, { method: 'POST' }),
  removeFriend: (friendId) => request(`/friends/${friendId}`, { method: 'DELETE' }),

  // Messages
  getMessages: (otherUserId) => request(`/messages/${otherUserId}`),
  sendMessage: (otherUserId, content) => request(`/messages/${otherUserId}`, {
    method: 'POST',
    body: JSON.stringify({ content })
  })
};

