import type { DataProvider } from 'react-admin';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const httpClient = axios.create({
  baseURL: API_URL,
});

// Add token to all requests
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const endpoint = getEndpoint(resource);
    const { page = 1, perPage = 10 } = params.pagination || {};
    const { field = 'id', order = 'ASC' } = params.sort || {};

    const response = await httpClient.get(endpoint, {
      params: {
        page,
        limit: perPage,
        sort: field,
        order: order.toLowerCase(),
        ...params.filter,
      },
    });

    return {
      data: response.data.data || response.data,
      total: response.data.total || response.data.length,
    };
  },

  getOne: async (resource, params) => {
    const endpoint = getEndpoint(resource);
    const response = await httpClient.get(`${endpoint}/${params.id}`);
    return { data: response.data };
  },

  getMany: async (resource, params) => {
    const endpoint = getEndpoint(resource);
    const responses = await Promise.all(params.ids.map((id) => httpClient.get(`${endpoint}/${id}`)));
    return { data: responses.map((r) => r.data) };
  },

  getManyReference: async (resource, params) => {
    const endpoint = getEndpoint(resource);
    const response = await httpClient.get(endpoint, {
      params: {
        [params.target]: params.id,
        ...params.filter,
      },
    });
    return {
      data: response.data.data || response.data,
      total: response.data.total || response.data.length,
    };
  },

  create: async (resource, params) => {
    const endpoint = getEndpoint(resource);
    const response = await httpClient.post(endpoint, params.data);
    return { data: { ...response.data, id: response.data.id } };
  },

  update: async (resource, params) => {
    const endpoint = getEndpoint(resource);
    const response = await httpClient.patch(`${endpoint}/${params.id}`, params.data);
    return { data: response.data };
  },

  updateMany: async (resource, params) => {
    const endpoint = getEndpoint(resource);
    const responses = await Promise.all(params.ids.map((id) => httpClient.patch(`${endpoint}/${id}`, params.data)));
    return { data: responses.map((r) => r.data.id) };
  },

  delete: async (resource, params) => {
    const endpoint = getEndpoint(resource);
    const response = await httpClient.delete(`${endpoint}/${params.id}`);
    return { data: response.data };
  },

  deleteMany: async (resource, params) => {
    const endpoint = getEndpoint(resource);
    await Promise.all(params.ids.map((id) => httpClient.delete(`${endpoint}/${id}`)));
    return { data: params.ids };
  },
};

function getEndpoint(resource: string): string {
  const endpoints: Record<string, string> = {
    users: '/users',
    books: '/admin/books',
    chapters: '/admin/chapters',
    flashcards: '/admin/flashcards',
    'experience-logs': '/experience/users',
    levels: '/experience/levels',
  };
  return endpoints[resource] || `/${resource}`;
}
