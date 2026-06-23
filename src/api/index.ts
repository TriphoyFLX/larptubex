import axios from 'axios';
import { getViewSessionId } from '../utils.ts';

const api = axios.create({
  baseURL: '',
});

api.interceptors.request.use(
  async (config) => {
    const customToken = localStorage.getItem('larptubex_access_token');
    if (customToken) {
      config.headers.Authorization = `Bearer ${customToken}`;
    }
    config.headers['X-View-Session'] = getViewSessionId();
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('larptubex_refresh_token');
      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = axios
          .post('/api/auth/refresh', { refreshToken })
          .then((res) => {
            const { accessToken, refreshToken: newRefresh } = res.data;
            localStorage.setItem('larptubex_access_token', accessToken);
            if (newRefresh) {
              localStorage.setItem('larptubex_refresh_token', newRefresh);
            }
            return accessToken as string;
          })
          .catch(() => {
            localStorage.removeItem('larptubex_access_token');
            localStorage.removeItem('larptubex_refresh_token');
            localStorage.removeItem('larptubex_user_payload');
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export async function uploadFile(
  type: 'videos' | 'thumbnails' | 'images' | 'avatars' | 'banners',
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/api/upload/${type}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url;
}

export async function saveWatchProgress(payload: {
  videoId?: number;
  shortId?: number;
  progressSeconds: number;
  durationSeconds: number;
}) {
  const res = await api.post('/api/watch/progress', {
    ...payload,
    sessionId: getViewSessionId(),
  });
  return res.data;
}

export default api;
