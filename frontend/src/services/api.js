import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - clear token
        localStorage.removeItem('token');
      }
      
      // Return error with message
      return Promise.reject({
        message: data.message || 'An error occurred',
        error: data.error || 'UNKNOWN_ERROR',
        details: data.details,
        status,
      });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        error: 'NETWORK_ERROR',
      });
    } else {
      // Something else happened
      return Promise.reject({
        message: error.message || 'An unexpected error occurred',
        error: 'UNKNOWN_ERROR',
      });
    }
  }
);

// Photo API methods
export const photoAPI = {
  // Upload photos with progress tracking
  uploadPhotos: async (files, onUploadProgress) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    const response = await api.post('/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percent: percentCompleted,
          });
        }
      },
    });
    return response.data;
  },
  
  // Get all photos
  getPhotos: async (params = {}) => {
    const response = await api.get('/photos', { params });
    return response.data;
  },
  
  // Get single photo
  getPhoto: async (id) => {
    const response = await api.get(`/photos/${id}`);
    return response.data;
  },
  
  // Update photo status
  updatePhotoStatus: async (id, status, message) => {
    const response = await api.put(`/photos/${id}/status`, {
      status,
      message,
    });
    return response.data;
  },
  
  // Delete photo
  deletePhoto: async (id) => {
    await api.delete(`/photos/${id}`);
  },
  
  // Delete multiple photos
  deletePhotos: async (ids) => {
    await api.post('/photos/bulk-delete', ids);
  },
  
  // Get photo status updates (polling)
  getPhotoStatusUpdates: async (since, photoIds) => {
    const params = {};
    if (since) params.since = since;
    if (photoIds) params.photoIds = photoIds.join(',');
    
    const response = await api.get('/photos/status', { params });
    return response.data;
  },
  
  // Get photo events
  getPhotoEvents: async (id) => {
    const response = await api.get(`/photos/${id}/events`);
    return response.data;
  },
  
  // Toggle favorite status
  toggleFavorite: async (id) => {
    const response = await api.put(`/photos/${id}/favorite`);
    return response.data;
  },
  
  // Get favorite photos
  getFavoritePhotos: async (params = {}) => {
    const response = await api.get('/photos/favorites', { params });
    return response.data;
  },
  
  // Rename photo
  renamePhoto: async (id, newFilename) => {
    const response = await api.put(`/photos/${id}/rename`, { filename: newFilename });
    return response.data;
  },
};

// Event log API methods
export const eventLogAPI = {
  // Get all events
  getEvents: async (params = {}) => {
    const response = await api.get('/events', { params });
    return response.data;
  },
  
  // Get events by photo ID
  getEventsByPhotoId: async (photoId) => {
    const response = await api.get(`/events/by-photo/${photoId}`);
    return response.data;
  },
};

export default api;

