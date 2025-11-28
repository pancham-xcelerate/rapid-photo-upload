import React from 'react';

const statusColors = {
  UPLOADED: 'bg-blue-100 text-blue-800',
  QUEUED: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

const statusIcons = {
  UPLOADED: '📤',
  QUEUED: '⏳',
  PROCESSING: '⚙️',
  COMPLETED: '✅',
  FAILED: '❌',
};

export function StatusBadge({ status, className = '' }) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
  const icon = statusIcons[status] || '';

  return (
    <span
      className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] leading-tight font-semibold shadow-sm border w-full ${colorClass} ${className}`}
    >
      <span className="flex-shrink-0 text-[9px]">{icon}</span>
      <span className="whitespace-nowrap">{status}</span>
    </span>
  );
}

