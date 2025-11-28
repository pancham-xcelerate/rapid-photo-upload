import React, { useEffect, useState } from 'react';
import { PhotoGallery } from '../components/PhotoGallery';
import { photoAPI } from '../services/api';
import { ErrorToast } from '../components/ErrorToast';
import { useNavigate } from 'react-router-dom';

export function Favorites() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
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
        sort: 'uploadedAt,desc',
      };
      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await photoAPI.getFavoritePhotos(params);
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
  }, [page, statusFilter]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handlePhotoClick = (photo) => {
    navigate(`/photos/${photo.id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      await photoAPI.deletePhoto(id);
      fetchPhotos(); // Refresh list
    } catch (err) {
      setError(err);
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await photoAPI.deletePhotos(ids);
      fetchPhotos(); // Refresh list
    } catch (err) {
      setError(err);
    }
  };

  const handleFavoriteToggle = (updatedPhoto) => {
    // Remove from favorites list if unfavorited
    if (!updatedPhoto.isFavorite) {
      setPhotos(prevPhotos => prevPhotos.filter(p => p.id !== updatedPhoto.id));
      // Update total pages if needed
      if (photos.length === 1 && page > 0) {
        setPage(page - 1);
      }
    } else {
      // Update if favorited
      setPhotos(prevPhotos => 
        prevPhotos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p)
      );
    }
  };

  const handleRename = (updatedPhoto) => {
    // Update in favorites list
    setPhotos(prevPhotos => 
      prevPhotos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p)
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Section with Filter */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">Favorites</h1>
          <p className="mt-2 text-gray-600 text-lg">Your favorite photos</p>
        </div>
        
        {/* Filter and View Controls - Right Side of Heading */}
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
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Filter by status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="px-5 py-2.5 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gradient-to-br from-white to-purple-50/30 shadow-md hover:shadow-lg hover:border-purple-400 transition-all duration-200 font-semibold text-gray-700 cursor-pointer appearance-none bg-no-repeat bg-right pr-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239c88ff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1.5em 1.5em'
              }}
            >
              <option value="" className="font-semibold">All</option>
              <option value="UPLOADED" className="font-semibold">Uploaded</option>
              <option value="QUEUED" className="font-semibold">Queued</option>
              <option value="PROCESSING" className="font-semibold">Processing</option>
              <option value="COMPLETED" className="font-semibold">Completed</option>
              <option value="FAILED" className="font-semibold">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {loading && photos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading favorites...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-20 w-20 text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="text-gray-600 text-xl font-semibold">No favorite photos yet</p>
          <p className="text-gray-400 text-base mt-2">Click the heart icon on any photo to add it to favorites</p>
        </div>
      ) : (
        <>
          <PhotoGallery
            photos={photos}
            onPhotoClick={handlePhotoClick}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onFavoriteToggle={handleFavoriteToggle}
            onRename={handleRename}
            loading={loading}
            viewType={viewType}
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
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => {
                    setPage((p) => Math.min(totalPages - 1, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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

