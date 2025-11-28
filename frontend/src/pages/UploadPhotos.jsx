import React, { useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { ErrorToast } from '../components/ErrorToast';
import { photoAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

export function UploadPhotos() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ loaded: 0, total: 0, percent: 0 });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const navigate = useNavigate();

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFilesSelected = async (files) => {
    setSelectedFiles(Array.from(files));
    setUploading(true);
    setError(null);
    setUploadProgress({ loaded: 0, total: 0, percent: 0 });

    try {
      const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
      
      const response = await photoAPI.uploadPhotos(files, (progress) => {
        setUploadProgress({
          loaded: progress.loaded,
          total: totalSize,
          percent: progress.percent,
        });
      });
      
      console.log('Photos uploaded:', response);
      
      // Navigate to processing queue after a short delay
      setTimeout(() => {
        navigate('/queue');
      }, 500);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err);
    } finally {
      setUploading(false);
      setUploadProgress({ loaded: 0, total: 0, percent: 0 });
      setSelectedFiles([]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Upload Photos</h1>
        <p className="mt-2 text-gray-600 text-lg">
          Upload one or more photos to start processing
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-8 backdrop-blur-sm">
        {uploading ? (
          <div className="py-8">
            <div className="text-center mb-8">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto shadow-lg"></div>
              <p className="mt-6 text-lg font-semibold text-gray-700">Uploading photos...</p>
              <p className="mt-2 text-sm text-gray-500">
                {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Upload Progress</span>
                <span className="text-sm font-bold text-purple-600">{uploadProgress.percent}%</span>
              </div>
              
              {/* Progress Bar Container */}
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out shadow-lg"
                  style={{ width: `${uploadProgress.percent}%` }}
                >
                  <div className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
              </div>

              {/* Upload Stats */}
              <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
                <span className="font-medium">
                  {formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)}
                </span>
                <span className="font-medium">
                  {uploadProgress.total > 0 
                    ? `${Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}% complete`
                    : 'Calculating...'}
                </span>
              </div>

              {/* File List */}
              {selectedFiles.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Uploading files:</p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">{formatBytes(file.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <FileUploader onFilesSelected={handleFilesSelected} />
        )}
      </div>

      <ErrorToast error={error} onClose={() => setError(null)} />
    </div>
  );
}

