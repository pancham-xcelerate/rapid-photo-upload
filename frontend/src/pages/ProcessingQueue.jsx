import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { photoAPI } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ErrorToast } from '../components/ErrorToast';

export function ProcessingQueue() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch photos in processing states
  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const [queued, processing] = await Promise.all([
        photoAPI.getPhotos({ status: 'QUEUED', size: 50 }),
        photoAPI.getPhotos({ status: 'PROCESSING', size: 50 }),
      ]);

      const allPhotos = [
        ...(queued.content || []),
        ...(processing.content || []),
      ];
      setPhotos(allPhotos);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket connection for real-time updates
  const { connected } = useWebSocket((message) => {
    // Update photo status when WebSocket message received
    setPhotos((prevPhotos) =>
      prevPhotos.map((photo) =>
        photo.id === message.photoId
          ? { ...photo, status: message.status }
          : photo
      )
    );

    // Remove completed/failed photos from queue
    if (message.status === 'COMPLETED' || message.status === 'FAILED') {
      setTimeout(() => {
        fetchPhotos(); // Refresh list
      }, 2000);
    }
  });

  useEffect(() => {
    setWsConnected(connected);
  }, [connected]);

  useEffect(() => {
    fetchPhotos();
    const interval = setInterval(fetchPhotos, 5000); // Poll every 5 seconds as fallback
    return () => clearInterval(interval);
  }, []);

  const activePhotos = photos.filter(
    (p) => p.status === 'QUEUED' || p.status === 'PROCESSING'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Processing Queue</h1>
          <p className="mt-2 text-gray-600 text-lg">
            Photos currently being processed
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-lg shadow-md border border-gray-200">
          <div
            className={`h-3 w-3 rounded-full shadow-sm ${
              wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-semibold text-gray-700">
            {wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 shadow-lg"></div>
        </div>
      ) : activePhotos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-16 text-center backdrop-blur-sm">
          <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 text-xl font-semibold">No photos in queue</p>
          <p className="text-gray-400 text-base mt-2">
            Upload photos to see them here
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Photo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {activePhotos.map((photo) => (
                  <tr key={photo.id} className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 transition-all duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {photo.originalFilename || photo.filename}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={photo.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(photo.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {photo.uploadedAt
                        ? new Date(photo.uploadedAt).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ErrorToast error={error} onClose={() => setError(null)} />
    </div>
  );
}

