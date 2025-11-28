import React, { useCallback, useState } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export function FileUploader({ onFilesSelected, multiple = true, maxFiles = 1000 }) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);

  const validateFiles = (files) => {
    const fileArray = Array.from(files);
    const newErrors = [];

    if (fileArray.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
      return { valid: false, errors: newErrors, files: [] };
    }

    const validFiles = [];
    fileArray.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        newErrors.push(`${file.name}: File size exceeds 10MB`);
      } else if (!ALLOWED_TYPES.includes(file.type)) {
        newErrors.push(`${file.name}: Unsupported file type. Only JPEG, PNG, WebP, GIF allowed.`);
      } else {
        validFiles.push(file);
      }
    });

    return {
      valid: newErrors.length === 0,
      errors: newErrors,
      files: validFiles,
    };
  };

  const handleFiles = useCallback(
    (files) => {
      const result = validateFiles(files);
      setErrors(result.errors);

      if (result.valid && result.files.length > 0) {
        onFilesSelected(result.files);
        setErrors([]);
      }
    },
    [onFilesSelected]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-3 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
          isDragging
            ? 'border-purple-500 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 shadow-xl scale-[1.02]'
            : 'border-gray-300 hover:border-purple-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-purple-50/30 shadow-lg hover:shadow-xl'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple={multiple}
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileInput}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <svg
            className={`w-16 h-16 mb-6 transition-colors duration-300 ${
              isDragging ? 'text-purple-600' : 'text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className={`text-xl font-bold transition-colors duration-300 ${
            isDragging ? 'text-purple-700' : 'text-gray-700'
          }`}>
            {isDragging ? 'Drop files here' : 'Drag & drop photos here'}
          </span>
          <span className={`text-base font-medium mt-3 transition-colors duration-300 ${
            isDragging ? 'text-purple-600' : 'text-gray-600'
          }`}>
            or click to browse
          </span>
          <span className="text-sm text-gray-500 mt-3">
            Supported: JPEG, PNG, WebP, GIF (Max 10MB per file, up to {maxFiles} files)
          </span>
        </label>
      </div>

      {errors.length > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl shadow-lg">
          <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Validation Errors:
          </h4>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1.5 font-medium">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

