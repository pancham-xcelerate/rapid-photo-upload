import React, { useState, useRef, useEffect } from 'react';
import { StatusBadge } from './StatusBadge';
import { photoAPI } from '../services/api';

export function PhotoGallery({ photos, onPhotoClick, onDelete, onBulkDelete, onFavoriteToggle, onRename, loading = false, viewType = 'grid' }) {
  const [openMenu, setOpenMenu] = useState(null); // Track which photo's three-dots menu is open
  const [selectionMode, setSelectionMode] = useState(false); // Track selection mode
  const [selectedPhotos, setSelectedPhotos] = useState(new Set()); // Track selected photo IDs
  const [isDownloading, setIsDownloading] = useState(false); // Track bulk download progress
  const [dropdownPosition, setDropdownPosition] = useState({}); // Track dropdown position (left/right) for each photo
  const [renamingPhoto, setRenamingPhoto] = useState(null); // Track which photo is being renamed
  const [renameValue, setRenameValue] = useState(''); // Track rename input value
  const menuRefs = useRef({});
  const dropdownRefs = useRef({});

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      let clickedInsideMenu = false;
      
      // Check if click is inside any menu
      Object.keys(menuRefs.current).forEach((photoId) => {
        const ref = menuRefs.current[photoId];
        if (ref && ref.contains(event.target)) {
          clickedInsideMenu = true;
        }
      });
      
      // Check dropdown refs too
      Object.keys(dropdownRefs.current).forEach((photoId) => {
        const ref = dropdownRefs.current[photoId];
        if (ref && ref.contains(event.target)) {
          clickedInsideMenu = true;
        }
      });
      
      // Only close if clicked outside
      if (!clickedInsideMenu) {
        setOpenMenu(null);
      }
    };

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  // Detect dropdown position when menu opens (for list view)
  const calculateDropdownPosition = (photoId) => {
    const buttonRef = menuRefs.current[photoId];
    if (buttonRef) {
      const buttonRect = buttonRef.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const dropdownWidth = 220; // Approximate dropdown width (max-w-[220px])
      const spaceOnRight = viewportWidth - buttonRect.right;
      
      // If not enough space on right (less than dropdown width + margin), open to left
      if (spaceOnRight < dropdownWidth + 20) {
        setDropdownPosition(prev => ({ ...prev, [photoId]: 'left' }));
      } else {
        setDropdownPosition(prev => ({ ...prev, [photoId]: 'right' }));
      }
    }
  };

  useEffect(() => {
    if (openMenu && viewType === 'list') {
      calculateDropdownPosition(openMenu);
      
      // Recalculate on window resize
      const handleResize = () => {
        if (openMenu) {
          calculateDropdownPosition(openMenu);
        }
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [openMenu, viewType]);

  const handleDownload = async (photo) => {
    try {
      // Always download original quality
      const imageUrl = photo.originalUrl;
      const filename = photo.originalFilename || photo.filename || 'photo';

      if (!imageUrl) {
        console.error('No image URL available for download');
        return;
      }

      // Fetch the image as a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Close menus after download
      setOpenMenu(null);
    } catch (error) {
      console.error('Error downloading image:', error);
      // Fallback: open in new tab if download fails
      window.open(photo.originalUrl, '_blank');
      setOpenMenu(null);
    }
  };

  const handleShare = async (photo) => {
    try {
      // Generate shareable link to photo detail page
      const shareUrl = `${window.location.origin}/photos/${photo.id}`;
      
      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Link copied to clipboard!');
      }
      
      // Close menu after sharing
      setOpenMenu(null);
    } catch (error) {
      console.error('Error sharing link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const toggleSelection = (photoId) => {
    setSelectedPhotos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    // Check if all photos on the current page are selected
    const currentPagePhotoIds = new Set(photos.map((p) => p.id));
    const allCurrentPageSelected = photos.every((p) => selectedPhotos.has(p.id));
    
    if (allCurrentPageSelected) {
      // Deselect all photos on the current page only
      const newSelected = new Set(selectedPhotos);
      currentPagePhotoIds.forEach((id) => newSelected.delete(id));
      setSelectedPhotos(newSelected);
    } else {
      // Select all photos on the current page (keep existing selections from other pages)
      const newSelected = new Set(selectedPhotos);
      photos.forEach((p) => newSelected.add(p.id));
      setSelectedPhotos(newSelected);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotos.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedPhotos.size} photo(s)?`)) {
      return;
    }

    if (onBulkDelete) {
      await onBulkDelete(Array.from(selectedPhotos));
      setSelectedPhotos(new Set());
      setSelectionMode(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedPhotos.size === 0) return;
    
    setIsDownloading(true);
    
    try {
      // Get selected photo objects
      const selectedPhotoObjects = photos.filter((photo) => selectedPhotos.has(photo.id));
      
      // Download each photo sequentially (to avoid browser blocking multiple simultaneous downloads)
      for (let i = 0; i < selectedPhotoObjects.length; i++) {
        const photo = selectedPhotoObjects[i];
        await handleDownload(photo);
        
        // Add a small delay between downloads to prevent browser blocking
        if (i < selectedPhotoObjects.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Clear selection and exit selection mode after successful download
      setSelectedPhotos(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Error during bulk download:', error);
      alert(`Error downloading some photos. Please try again.`);
    } finally {
      setIsDownloading(false);
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedPhotos(new Set());
  };

  const handleFavoriteToggle = async (photo, e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const updatedPhoto = await photoAPI.toggleFavorite(photo.id);
      if (onFavoriteToggle) {
        onFavoriteToggle(updatedPhoto);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const getFileExtension = (filename) => {
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) return '';
    return filename.substring(lastDot);
  };

  const getFileNameWithoutExtension = (filename) => {
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return filename;
    return filename.substring(0, lastDot);
  };

  const handleRenameClick = (photo, e) => {
    e.stopPropagation();
    e.preventDefault();
    setRenamingPhoto(photo.id);
    const fullName = photo.originalFilename || photo.filename || '';
    const nameWithoutExt = getFileNameWithoutExtension(fullName);
    setRenameValue(nameWithoutExt);
    setOpenMenu(null);
  };

  const handleRenameSubmit = async (photo) => {
    if (!renameValue.trim()) {
      alert('Filename cannot be empty');
      return;
    }

    const fullName = photo.originalFilename || photo.filename || '';
    const extension = getFileExtension(fullName);
    const newFullName = renameValue.trim() + extension;

    try {
      const updatedPhoto = await photoAPI.renamePhoto(photo.id, newFullName);
      if (onRename) {
        onRename(updatedPhoto);
      }
      setRenamingPhoto(null);
      setRenameValue('');
    } catch (error) {
      console.error('Error renaming photo:', error);
      alert(error.message || 'Failed to rename photo');
    }
  };

  const handleRenameCancel = () => {
    setRenamingPhoto(null);
    setRenameValue('');
  };

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No photos found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Selection Mode Controls */}
      {selectionMode && (
        <div className="mb-6 flex items-center justify-between bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 border border-purple-200/50 rounded-xl p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedPhotos.size} photo(s) selected
            </span>
            <button
              onClick={toggleSelectAll}
              className="text-sm font-semibold text-purple-600 hover:text-purple-800 hover:underline transition-colors duration-200"
            >
              {photos.every((p) => selectedPhotos.has(p.id)) ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exitSelectionMode}
              className="px-5 py-2.5 text-sm font-medium border-2 border-gray-300 rounded-lg hover:bg-white hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Cancel
            </button>
            
            {/* Bulk Download */}
            <button
              onClick={handleBulkDownload}
              disabled={selectedPhotos.size === 0 || isDownloading}
              className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download ({selectedPhotos.size})
                </>
              )}
            </button>
            
            <button
              onClick={handleBulkDelete}
              disabled={selectedPhotos.size === 0 || isDownloading}
              className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Delete Selected ({selectedPhotos.size})
            </button>
          </div>
        </div>
      )}

      {/* Selection Mode Toggle */}
      {!selectionMode && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setSelectionMode(true)}
            className="px-5 py-2.5 text-sm font-medium bg-white border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:border-purple-400 flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Select Photos
          </button>
        </div>
      )}

      <div className={
        viewType === 'list' 
          ? 'space-y-3' 
          : 'grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'
      }>
      {photos.map((photo) => {
        const isSelected = selectedPhotos.has(photo.id);
        return (
        <div
          key={photo.id}
          className={`bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex relative border border-gray-100 ${
            viewType === 'list' 
              ? 'flex-row items-center gap-4 p-4 overflow-visible' 
              : 'flex-col aspect-square overflow-visible'
          } ${
            selectionMode ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'
          } ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 shadow-purple-200' : ''}`}
          style={{ zIndex: openMenu === photo.id ? 50 : 1 }}
          onClick={(e) => {
            // Don't trigger card click if clicking on menu, favorite button, or rename input
            if (e.target.closest('.menu-container') || 
                e.target.closest('.favorite-button') || 
                e.target.closest('.rename-container') ||
                renamingPhoto === photo.id) {
              return;
            }
            if (selectionMode) {
              toggleSelection(photo.id);
            } else if (onPhotoClick && openMenu !== photo.id) {
              onPhotoClick(photo);
            }
          }}
        >
          <div className={`relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden group ${
            viewType === 'list' 
              ? 'w-24 h-24 flex-shrink-0 rounded-lg shadow-sm' 
              : 'flex-1 rounded-t-xl'
          }`}>
            {/* Selection Checkbox */}
            {selectionMode && (
              <div className="absolute top-2 left-2 z-20">
                <div
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(photo.id);
                  }}
                >
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            )}

            {/* Heart icon for favorites - top left (only for grid/bigger views) */}
            {!selectionMode && viewType !== 'list' && (
              <button
                onClick={(e) => handleFavoriteToggle(photo, e)}
                className="favorite-button absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur-md shadow-lg hover:shadow-xl hover:scale-110 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 border border-gray-200/50"
                title={photo.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <svg 
                  className={`w-5 h-5 transition-colors ${
                    photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'
                  }`} 
                  fill={photo.isFavorite ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}

            {/* Three-dots menu button - top right (only for grid/bigger views) */}
            {!selectionMode && viewType !== 'list' && (
              <div className="absolute top-3 right-3 z-20 menu-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setOpenMenu(openMenu === photo.id ? null : photo.id);
                  }}
                  className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-md shadow-lg hover:shadow-xl hover:scale-110 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 border border-gray-200/50"
                  title="More options"
                  ref={(el) => (menuRefs.current[photo.id] = el)}
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Status Badge - bottom right, always visible (only show in grid/bigger views) */}
            {viewType !== 'list' && (
              <div className="absolute bottom-3 right-3 z-10 w-1/2 flex justify-end">
                <StatusBadge status={photo.status} className="w-full max-w-full" />
              </div>
            )}

            {/* Image */}
            {(photo.thumbnailUrl || photo.originalUrl) ? (
              <img
                src={photo.thumbnailUrl || photo.originalUrl}
                alt={photo.originalFilename || photo.filename}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Try original URL if thumbnail fails
                  if (photo.thumbnailUrl && photo.originalUrl && e.target.src.includes('/thumbnail')) {
                    e.target.src = photo.originalUrl;
                  } else {
                    // Hide image and show placeholder
                    e.target.style.display = 'none';
                    const placeholder = e.target.parentElement.querySelector('.image-placeholder');
                    if (placeholder) {
                      placeholder.style.display = 'flex';
                    }
                  }
                }}
              />
            ) : null}
            
            {/* Placeholder */}
            <div className="image-placeholder w-full h-full flex items-center justify-center" style={{ display: (!photo.thumbnailUrl && !photo.originalUrl) ? 'flex' : 'none' }}>
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          {/* Three-dots menu dropdown for grid view - positioned to the right of the button */}
          {!selectionMode && viewType !== 'list' && openMenu === photo.id && (
            <div 
              ref={(el) => (dropdownRefs.current[photo.id] = el)}
              className="absolute top-2 right-2 menu-container"
              style={{ zIndex: 10002 }}
            >
              <div 
                className="absolute top-0 left-full ml-3 bg-white rounded-xl shadow-2xl border border-gray-200/50 w-auto min-w-[160px] max-w-[220px] sm:min-w-[180px] sm:max-w-[240px] overflow-hidden backdrop-blur-sm"
                style={{ zIndex: 10003 }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                {/* Rename option */}
                <button
                  onClick={(e) => handleRenameClick(photo, e)}
                  className="w-full text-left px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-700 transition-all duration-200 flex items-center gap-2 sm:gap-3 font-medium"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="truncate">Rename</span>
                </button>

                {/* Share option */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleShare(photo);
                  }}
                  className="w-full text-left px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-700 transition-all duration-200 flex items-center gap-2 sm:gap-3 border-t border-gray-100 font-medium"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="truncate">Share Link</span>
                </button>

                {/* Download option */}
                {photo.originalUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDownload(photo);
                    }}
                    className="w-full text-left px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-700 transition-all duration-200 flex items-center gap-2 sm:gap-3 border-t border-gray-100 font-medium"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="truncate">Download</span>
                  </button>
                )}

                {/* Delete option */}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(null);
                      onDelete(photo.id);
                    }}
                    className="w-full text-left px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 transition-all duration-200 border-t border-gray-100 flex items-center gap-2 sm:gap-3 font-medium"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="truncate">Delete</span>
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Photo name at bottom */}
          <div className={`flex-shrink-0 bg-gradient-to-b from-white to-gray-50 relative ${
            viewType === 'list' 
              ? 'flex-1 p-4 overflow-hidden' 
              : 'p-4 rounded-b-xl overflow-hidden'
          }`}>
            {renamingPhoto === photo.id ? (
              <div 
                className="flex items-center gap-1 rename-container w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRenameSubmit(photo);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      handleRenameCancel();
                    }
                  }}
                  onBlur={() => {
                    // Auto-save on blur (when clicking outside)
                    const fullName = photo.originalFilename || photo.filename || '';
                    const nameWithoutExt = getFileNameWithoutExtension(fullName);
                    if (renameValue.trim() && renameValue.trim() !== nameWithoutExt) {
                      handleRenameSubmit(photo);
                    } else {
                      handleRenameCancel();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 px-3 py-2 text-sm border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  autoFocus
                  placeholder="Enter new filename"
                />
                <span className="text-sm text-gray-600 px-1 flex-shrink-0">
                  {getFileExtension(photo.originalFilename || photo.filename || '')}
                </span>
              </div>
            ) : (
              <p className={`text-sm font-semibold text-gray-800 truncate ${
                viewType === 'list' ? 'text-left pr-10' : 'text-center'
              }`}>
                {photo.originalFilename || photo.filename}
              </p>
            )}
            {viewType === 'list' && (
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={photo.status} />
              </div>
            )}
            
            {/* Heart icon and Three-dots menu - right side (only for list view) */}
            {!selectionMode && viewType === 'list' && (
              <div className="absolute top-1/2 right-2 sm:right-3 transform -translate-y-1/2 z-30 flex items-center gap-2">
                {/* Heart icon for favorites - list view */}
                <button
                  onClick={(e) => handleFavoriteToggle(photo, e)}
                  className="favorite-button w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center"
                  title={photo.isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <svg 
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                      photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'
                    }`} 
                    fill={photo.isFavorite ? "currentColor" : "none"} 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                
                {/* Three-dots menu button */}
                <div className="menu-container" ref={(el) => (menuRefs.current[photo.id] = el)}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setOpenMenu(openMenu === photo.id ? null : photo.id);
                  }}
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white flex items-center justify-center transition-all"
                  title="More options"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                {/* Three-dots menu dropdown - auto-positioned based on available space */}
                {openMenu === photo.id && (
                  <div 
                    ref={(el) => (dropdownRefs.current[photo.id] = el)}
                    className={`absolute top-0 bg-white rounded-xl shadow-2xl border border-gray-200/50 w-auto min-w-[160px] max-w-[220px] sm:min-w-[180px] sm:max-w-[240px] overflow-hidden menu-container backdrop-blur-sm ${
                      dropdownPosition[photo.id] === 'left' 
                        ? 'right-full mr-3' 
                        : 'left-full ml-3'
                    }`}
                    style={{ zIndex: 10004 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >

                    {/* Rename option */}
                    <button
                      onClick={(e) => handleRenameClick(photo, e)}
                      className="w-full text-left px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-700 transition-all duration-200 flex items-center gap-2 sm:gap-3 font-medium"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="truncate">Rename</span>
                    </button>

                    {/* Share option */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleShare(photo);
                      }}
                      className="w-full text-left px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-700 transition-all duration-200 flex items-center gap-2 sm:gap-3 border-t border-gray-100 font-medium"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <span className="truncate">Share Link</span>
                    </button>

                    {/* Download option */}
                    {photo.originalUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDownload(photo);
                        }}
                        className="w-full text-left px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-700 transition-all duration-200 flex items-center gap-2 sm:gap-3 border-t border-gray-100 font-medium"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="truncate">Download</span>
                      </button>
                    )}

                    {/* Delete option */}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu(null);
                          onDelete(photo.id);
                        }}
                        className="w-full text-left px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 transition-all duration-200 border-t border-gray-100 font-medium flex items-center gap-2 sm:gap-3"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="truncate">Delete</span>
                      </button>
                    )}
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
      })}
      </div>
    </div>
  );
}

