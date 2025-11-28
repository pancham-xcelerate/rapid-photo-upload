import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Dock() {
  const location = useLocation();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const navItems = [
    { 
      path: '/', 
      label: 'Upload', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      color: 'bg-blue-500'
    },
    { 
      path: '/queue', 
      label: 'Queue', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-yellow-500'
    },
    { 
      path: '/review', 
      label: 'Review', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-green-500'
    },
    { 
      path: '/events', 
      label: 'Events', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'bg-purple-500'
    },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 z-50">
      <div 
        className="flex items-end gap-6 px-6 py-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50"
        style={{ 
          overflow: 'visible',
        }}
      >
        {navItems.map((item, index) => {
          const active = isActive(item.path);
          const isHovered = hoveredIndex === index;
          
          // Only the hovered item should expand - no scaling for other items
          const scale = isHovered ? 1.5 : 1;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative group flex items-center justify-center"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                width: '48px',
                height: '48px',
                flexShrink: 0,
              }}
            >
              <div
                className={`
                  flex items-center justify-center
                  rounded-xl dock-item
                  ${active ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
                  ${isHovered ? 'shadow-xl' : 'shadow-md'}
                  cursor-pointer
                `}
                style={{
                  transform: `scale(${scale}) translateY(${isHovered ? '-10px' : '0px'})`,
                  transformOrigin: 'center center',
                  width: '48px',
                  height: '48px',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {/* Icon background */}
                <div className={`
                  absolute inset-0 rounded-xl
                  ${active ? item.color : 'bg-gray-100'}
                  ${isHovered ? 'opacity-100' : active ? 'opacity-100' : 'opacity-60'}
                `}
                style={{
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                />
                
                {/* Icon */}
                <div className={`
                  relative z-10
                  ${active ? 'text-white' : 'text-gray-600'}
                `}
                style={{
                  transition: 'color 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                >
                  {item.icon}
                </div>
              </div>

              {/* Label tooltip on hover */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-lg animate-in fade-in duration-200">
                  {item.label}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

