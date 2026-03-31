import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
};

export const photosAPI = {
  upload: (formData) => API.post('/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params) => API.get('/photos/', { params }),
  delete: (id) => API.delete(`/photos/${id}`),
  getFileUrl: (filename) => {
    const token = localStorage.getItem('token');
    return `http://localhost:5000/api/photos/file/${filename}?token=${token}`;
  },
};

export const personsAPI = {
  getAll: () => API.get('/persons/'),
  label: (data) => API.post('/persons/label', data),
  delete: (id) => API.delete(`/persons/${id}`),
};

export const chatAPI = {
  sendMessage: (message) => API.post('/chat/message', { message }),
};

export default API;
