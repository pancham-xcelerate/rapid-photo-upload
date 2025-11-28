import React, { useEffect, useState } from 'react';
import { PhotoGallery } from '../components/PhotoGallery';
import { photoAPI } from '../services/api';
import { ErrorToast } from '../components/ErrorToast';
import { useNavigate } from 'react-router-dom';

export function Trash() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [viewType, setViewType] = useState('grid');
  const navigate = useNavigate();

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        size: 25,
        sort: 'deletedAt,desc',
      };

      const response = await photoAPI.getTrashPhotos(params);
      setPhotos(response.content || []);
      setTotalPages(response.totalPages || 0);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [page]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handlePhotoClick = (photo) => {
    navigate(`/photos/${photo.id}`);
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this photo? This action cannot be undone.')) {
      return;
    }

    try {
      await photoAPI.permanentDeletePhoto(id);
      fetchPhotos(); // Refresh list
    } catch (err) {
      setError(err);
    }
  };

  const handleBulkPermanentDelete = async (ids) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${ids.length} photo(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      await photoAPI.permanentDeletePhotos(ids);
      fetchPhotos(); // Refresh list
    } catch (err) {
      setError(err);
    }
  };

  const handleRestore = async (id) => {
    try {
      await photoAPI.restorePhoto(id);
      fetchPhotos(); // Refresh list
    } catch (err) {
      setError(err);
    }
  };

  const handleBulkRestore = async (ids) => {
    try {
      await photoAPI.restorePhotos(ids);
      fetchPhotos(); // Refresh list
    } catch (err) {
      setError(err);
    }
  };

  const handleRename = (updatedPhoto) => {
    // Update in trash list
    setPhotos(prevPhotos => 
      prevPhotos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p)
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">Trash</h1>
          <p className="mt-2 text-gray-600 text-lg">Deleted photos - restore or permanently delete</p>
        </div>
        
        {/* View Control */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">View:</label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              className="px-5 py-2.5 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gradient-to-br from-white to-purple-50/30 shadow-md hover:shadow-lg hover:border-purple-400 transition-all duration-200 font-semibold text-gray-700 cursor-pointer appearance-none bg-no-repeat bg-right pr-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239c88ff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1.5em 1.5em'
              }}
            >
              <option value="list" className="font-semibold">List</option>
              <option value="grid" className="font-semibold">Grid</option>
            </select>
          </div>
        </div>
      </div>

      {loading && photos.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 shadow-lg mx-auto"></div>
          <p className="text-gray-500 mt-4 text-lg">Loading trash...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-16 text-center backdrop-blur-sm">
          <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <p className="text-gray-600 text-xl font-semibold">Trash is empty</p>
          <p className="text-gray-400 text-base mt-2">Deleted photos will appear here</p>
        </div>
      ) : (
        <>
          <PhotoGallery
            photos={photos}
            onPhotoClick={handlePhotoClick}
            onDelete={handlePermanentDelete}
            onBulkDelete={handleBulkPermanentDelete}
            onRestore={handleRestore}
            onBulkRestore={handleBulkRestore}
            onRename={handleRename}
            loading={loading}
            viewType={viewType}
            isTrash={true}
          />

          {/* Pagination Controls - Bottom of Page */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-end">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPage((p) => Math.max(0, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={page === 0}
                  className="px-5 py-2.5 font-medium border-2 border-purple-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:border-purple-400 transition-all duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-sm"
                >
                  Previous
                </button>
                <span className="px-5 py-2.5 text-gray-700 font-semibold bg-gray-50 rounded-lg border border-gray-200">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => {
                    setPage((p) => Math.min(totalPages - 1, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={page >= totalPages - 1}
                  className="px-5 py-2.5 font-medium border-2 border-purple-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:border-purple-400 transition-all duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ErrorToast error={error} onClose={() => setError(null)} />
    </div>
  );
}


