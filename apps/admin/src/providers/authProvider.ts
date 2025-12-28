import type { AuthProvider } from 'react-admin';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });

    if (response.ok) {
      const { access_token, user } = await response.json();
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      return Promise.resolve();
    }

    return Promise.reject(new Error('Invalid credentials'));
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return Promise.resolve();
  },

  checkAuth: () => {
    return localStorage.getItem('token') ? Promise.resolve() : Promise.reject();
  },

  checkError: (error) => {
    const status = error.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem('token');
      return Promise.reject();
    }
    return Promise.resolve();
  },

  getIdentity: () => {
    const user = localStorage.getItem('user');
    return user ? Promise.resolve(JSON.parse(user)) : Promise.reject();
  },

  getPermissions: () => {
    const user = localStorage.getItem('user');
    return user ? Promise.resolve(JSON.parse(user).role) : Promise.reject();
  },
};
