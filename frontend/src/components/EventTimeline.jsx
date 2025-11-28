import React from 'react';

const eventIcons = {
  UPLOADED: '📤',
  QUEUED: '⏳',
  PROCESSING: '⚙️',
  COMPLETED: '✅',
  FAILED: '❌',
};

export function EventTimeline({ events, loading = false }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 shadow-lg"></div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500 text-lg font-medium">No events found</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, index) => (
          <li key={event.id || index}>
            <div className="relative pb-8">
              {index !== events.length - 1 && (
                <span
                  className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gradient-to-b from-purple-300 to-blue-300"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-4">
                <div>
                  <span className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center ring-4 ring-white shadow-lg text-xl border-2 border-purple-200">
                    {eventIcons[event.eventType] || '📋'}
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1 flex justify-between space-x-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm flex-1">
                    <p className="text-sm font-bold text-gray-900">
                      {event.eventType}
                    </p>
                    {event.message && (
                      <p className="text-sm text-gray-600 mt-1.5 font-medium">{event.message}</p>
                    )}
                  </div>
                  <div className="text-right text-xs whitespace-nowrap text-gray-600 font-semibold pt-1">
                    {event.timestamp &&
                      new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

