import React, { useState } from 'react';
import { FileUploader } from '../components/FileUploader';
import { ErrorToast } from '../components/ErrorToast';
import { photoAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

export function UploadPhotos() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleFilesSelected = async (files) => {
    setUploading(true);
    setError(null);

    try {
      const response = await photoAPI.uploadPhotos(files);
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
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto shadow-lg"></div>
            <p className="mt-6 text-lg font-semibold text-gray-700">Uploading photos...</p>
            <p className="mt-2 text-sm text-gray-500">Please wait while we process your files</p>
          </div>
        ) : (
          <FileUploader onFilesSelected={handleFilesSelected} />
        )}
      </div>

      <ErrorToast error={error} onClose={() => setError(null)} />
    </div>
  );
}

