import React, { useEffect, useState } from 'react';
import { EventTimeline } from '../components/EventTimeline';
import { eventLogAPI } from '../services/api';
import { ErrorToast } from '../components/ErrorToast';

export function EventLogViewer() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoIdFilter, setPhotoIdFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = {
        page: 0,
        size: 10000 // Request large page size to get all events
      };
      if (photoIdFilter && photoIdFilter.trim()) {
        params.photoId = photoIdFilter.trim();
      }
      // Only include eventType if it's not empty (not "All")
      if (eventTypeFilter && eventTypeFilter.trim()) {
        params.eventType = eventTypeFilter.trim();
      }

      const response = await eventLogAPI.getEvents(params);
      setEvents(response.content || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [photoIdFilter, eventTypeFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Section with Filters */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Event Log Viewer</h1>
          <p className="mt-2 text-gray-600 text-lg">
            View workflow events and processing history
          </p>
        </div>

        {/* Filters - Right Side of Heading */}
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Photo ID:
            </label>
            <input
              type="text"
              value={photoIdFilter}
              onChange={(e) => setPhotoIdFilter(e.target.value)}
              placeholder="Enter Photo ID (e.g., A3x9K2) or UUID"
              className="px-4 py-2.5 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm hover:shadow-md transition-all duration-200 font-medium text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Event Type:
            </label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
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

      <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 backdrop-blur-sm">
        <EventTimeline events={events} loading={loading} />
      </div>

      <ErrorToast error={error} onClose={() => setError(null)} />
    </div>
  );
}

