import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { photoAPI, eventLogAPI } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { EventTimeline } from '../components/EventTimeline';
import { ErrorToast } from '../components/ErrorToast';

export function PhotoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const fetchPhotoDetails = async () => {
      try {
        setLoading(true);
        const [photoData, eventsData] = await Promise.all([
          photoAPI.getPhoto(id),
          eventLogAPI.getEvents({ photoId: id })
        ]);
        setPhoto(photoData);
        setEvents(eventsData.content || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPhotoDetails();
    }
  }, [id]);

  // Handle Escape key to close fullscreen
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Hide sidebar and other UI elements
      const sidebar = document.querySelector('aside');
      const mainContent = document.querySelector('main');
      if (sidebar) {
        sidebar.style.visibility = 'hidden';
      }
      if (mainContent) {
        mainContent.style.visibility = 'hidden';
      }
    } else {
      // Restore sidebar and main content when closing
      const sidebar = document.querySelector('aside');
      const mainContent = document.querySelector('main');
      if (sidebar) {
        sidebar.style.visibility = '';
      }
      if (mainContent) {
        mainContent.style.visibility = '';
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      // Restore sidebar and main content on cleanup
      const sidebar = document.querySelector('aside');
      const mainContent = document.querySelector('main');
      if (sidebar) {
        sidebar.style.visibility = '';
      }
      if (mainContent) {
        mainContent.style.visibility = '';
      }
    };
  }, [isFullscreen]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 shadow-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-12 text-center backdrop-blur-sm">
          <svg className="w-20 h-20 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-600 text-xl font-semibold mb-6">Photo not found</p>
          <button
            onClick={() => navigate('/review')}
            className="px-6 py-3 font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Back to Gallery
          </button>
        </div>
        <ErrorToast error={error} onClose={() => setError(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/review')}
          className="text-purple-600 hover:text-purple-800 mb-6 flex items-center gap-2 font-semibold transition-colors duration-200 hover:gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Gallery
        </button>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Photo Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Photo Display */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm self-start">
          <div className="bg-gradient-to-br from-gray-50 to-purple-50/30 min-h-[500px] flex items-center justify-center p-6 relative">
            {photo.originalUrl ? (
              <div className="relative group">
                <img
                  key={photo.originalUrl} // Force re-render if URL changes
                  src={photo.originalUrl}
                  alt={photo.originalFilename || photo.filename}
                  className="max-w-full max-h-[600px] w-auto h-auto object-contain rounded-xl cursor-zoom-in hover:opacity-90 transition-all duration-300 shadow-2xl hover:shadow-3xl"
                  style={{ display: 'block' }}
                  onClick={() => setIsFullscreen(true)}
                  onError={(e) => {
                    console.error('Error loading image:', photo.originalUrl);
                    e.target.style.display = 'none';
                    const placeholder = e.target.parentElement.parentElement.querySelector('.image-placeholder');
                    if (placeholder) {
                      placeholder.style.display = 'flex';
                    }
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', photo.originalUrl);
                  }}
                />
                {/* Click hint overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-xl pointer-events-none">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-purple-600/90 to-blue-600/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg backdrop-blur-sm">
                    Click to view full size
                  </div>
                </div>
              </div>
            ) : null}
            <div className="image-placeholder w-full h-full flex items-center justify-center absolute inset-0 bg-gradient-to-br from-gray-50 to-purple-50/30" style={{ display: (!photo.originalUrl) ? 'flex' : 'none' }}>
              <div className="text-center">
                <svg
                  className="w-24 h-24 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500 text-lg font-medium">Image not available</p>
              </div>
            </div>
          </div>
          <div className="p-6 bg-gradient-to-b from-white to-gray-50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {photo.originalFilename || photo.filename}
              </h2>
              <StatusBadge status={photo.status} />
            </div>
            <div className="space-y-3 text-base text-gray-700 bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="font-semibold text-gray-700">File Size:</span>
                <span className="text-gray-900 font-medium">{(photo.size / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="font-semibold text-gray-700">Type:</span>
                <span className="text-gray-900 font-medium">{photo.mimeType || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="font-semibold text-gray-700">Uploaded:</span>
                <span className="text-gray-900 font-medium">{photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleString() : '-'}</span>
              </div>
              {photo.processedAt && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <span className="font-semibold text-gray-700">Processed:</span>
                  <span className="text-gray-900 font-medium">{new Date(photo.processedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event Timeline */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Event Timeline</h2>
          <EventTimeline events={events} loading={false} />
        </div>
      </div>

      {/* Fullscreen Modal - Using Portal to render at root level */}
      {isFullscreen && photo?.originalUrl && createPortal(
        <div
          className="fixed flex items-center justify-center"
          style={{ 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            position: 'fixed',
            zIndex: 99999,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#000000',
            background: 'linear-gradient(to bottom right, #000000, #1a1a1a, #000000)'
          }}
          onClick={(e) => {
            // Only close if clicking directly on the background, not on child elements
            if (e.target === e.currentTarget) {
              setIsFullscreen(false);
            }
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 z-10 bg-gradient-to-r from-purple-600/90 to-blue-600/90 hover:from-purple-700 hover:to-blue-700 rounded-full p-3 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-110 backdrop-blur-sm border border-white/20"
            aria-label="Close fullscreen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Full Quality Image */}
          <div 
            className="w-full h-full flex items-center justify-center" 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={{ minHeight: '100vh', minWidth: '100vw' }}
          >
            <img
              src={photo.originalUrl}
              alt={photo.originalFilename || photo.filename}
              className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
              style={{ 
                imageRendering: 'high-quality',
                display: 'block'
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onError={(e) => {
                console.error('Error loading fullscreen image:', photo.originalUrl);
                // Don't auto-close on error, let user see the error or close manually
                e.target.style.display = 'none';
              }}
              onLoad={() => {
                console.log('Fullscreen image loaded successfully:', photo.originalUrl);
              }}
            />
          </div>

          {/* Image Info Overlay */}
          <div 
            className="absolute bottom-6 left-6 right-6 text-white bg-gradient-to-r from-purple-600/90 to-blue-600/90 backdrop-blur-md rounded-xl p-3 pointer-events-none shadow-2xl border border-white/20 max-w-md mx-auto"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <p className="font-bold text-base truncate">{photo.originalFilename || photo.filename}</p>
            <p className="text-xs text-gray-200 mt-1.5 font-medium">
              {(photo.size / 1024).toFixed(1)} KB • {photo.mimeType || 'Unknown type'}
            </p>
          </div>
        </div>,
        document.body
      )}

      <ErrorToast error={error} onClose={() => setError(null)} />
    </div>
  );
}

