import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { UploadPhotos } from './pages/UploadPhotos';
import { ProcessingQueue } from './pages/ProcessingQueue';
import { ReviewPhotos } from './pages/ReviewPhotos';
import { Favorites } from './pages/Favorites';
import { PhotoDetail } from './pages/PhotoDetail';

function SidebarNavigation() {
  const location = useLocation();
  const [hoveredIndex, setHoveredIndex] = React.useState(null);

  const navItems = [
    { 
      path: '/', 
      label: 'Upload', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      color: 'bg-purple-500'
    },
    { 
      path: '/queue', 
      label: 'Queue', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-purple-500'
    },
    { 
      path: '/review', 
      label: 'Review', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-purple-500'
    },
    { 
      path: '/favorites', 
      label: 'Favorites', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
    <aside className="fixed left-0 top-0 bottom-0 w-16 sm:w-20 md:w-56 lg:w-72 bg-gradient-to-b from-purple-600 via-purple-700 to-purple-800 shadow-2xl z-[10000] transition-all duration-300 border-r border-purple-500/20">
      <div className="h-full flex flex-col backdrop-blur-sm">
        {/* Logo/Brand */}
        <div className="p-2 sm:p-3 md:p-4 lg:p-5 border-b border-purple-500/30 bg-purple-600/50">
          <h1 className="text-xs sm:text-sm md:text-lg lg:text-2xl font-bold text-white text-center md:text-left truncate drop-shadow-lg">
            <span className="hidden md:inline">ImageStream</span>
            <span className="md:hidden">IS</span>
          </h1>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-3 sm:py-4 md:py-5 px-2 sm:px-2.5 md:px-3 space-y-1 sm:space-y-1.5 md:space-y-2">
          {navItems.map((item, index) => {
            const active = isActive(item.path);
            const isHovered = hoveredIndex === index;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 sm:px-2.5 md:px-3 py-2 sm:py-2 md:py-2.5 rounded-xl
                  transition-all duration-300
                  ${active 
                    ? `${item.color} text-white shadow-xl ${isHovered ? 'md:scale-105' : ''} border border-purple-400/30` 
                    : 'text-purple-100 hover:bg-purple-500/60 hover:text-white hover:shadow-lg hover:scale-[1.02]'
                  }
                `}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                title={item.label}
              >
                <div className={`
                  ${active ? 'text-white' : 'text-purple-200'}
                  transition-colors duration-300
                  flex-shrink-0
                `}>
                  {React.cloneElement(item.icon, {
                    className: 'w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5'
                  })}
                </div>
                <span className="font-medium text-xs sm:text-sm md:text-base hidden md:inline truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer/Copyright */}
        <div className="p-2 sm:p-3 md:p-4 lg:p-5 border-t border-purple-500/30">
          <p className="text-purple-200 text-[8px] sm:text-[9px] md:text-xs text-center">
            <span className="hidden md:inline">© 2025 ImageStream</span>
            <span className="md:hidden">© 2025</span>
          </p>
        </div>
      </div>
    </aside>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/20 to-blue-50/30 flex">
        {/* Left Sidebar Navigation */}
        <SidebarNavigation />

        {/* Main content area */}
        <main className="flex-1 ml-16 sm:ml-20 md:ml-56 lg:ml-72 p-4 sm:p-6 md:p-8 transition-all duration-300">
          <Routes>
            <Route path="/" element={<UploadPhotos />} />
            <Route path="/queue" element={<ProcessingQueue />} />
            <Route path="/review" element={<ReviewPhotos />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/photos/:id" element={<PhotoDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

