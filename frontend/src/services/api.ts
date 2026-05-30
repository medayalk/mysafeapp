import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Auth APIs
export const registerUser = async (email: string, password: string, name: string) => {
  const response = await api.post('/auth/register', { email, password, name });
  return response.data;
};

export const loginUser = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Profile APIs
export const createProfile = async (profileData: any) => {
  const response = await api.post('/profiles', profileData);
  return response.data;
};

export const getProfiles = async () => {
  const response = await api.get('/profiles');
  return response.data;
};

export const getProfile = async (profileId: string) => {
  const response = await api.get(`/profiles/${profileId}`);
  return response.data;
};

// Scan APIs
export const createScan = async (profileId: string, imageBase64: string) => {
  const response = await api.post('/scan', {
    profile_id: profileId,
    image_base64: imageBase64,
  });
  return response.data;
};

export const getScans = async (profileId?: string) => {
  const params = profileId ? { profile_id: profileId } : {};
  const response = await api.get('/scans', { params });
  return response.data;
};

export const getScan = async (scanId: string) => {
  const response = await api.get(`/scans/${scanId}`);
  return response.data;
};

export const compareScans = async (scan1Id: string, scan2Id: string) => {
  const response = await api.post('/compare', null, {
    params: { scan1_id: scan1Id, scan2_id: scan2Id },
  });
  return response.data;
};

export default api;
