
import React from 'react';

interface HeaderProps {
  onHome: () => void;
  onReview: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHome, onReview }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div 
          className="flex items-center cursor-pointer group"
          onClick={onHome}
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl group-hover:bg-indigo-700 transition-colors">
            中
          </div>
          <span className="ml-2 sm:ml-3 text-lg sm:text-xl font-black text-gray-900 tracking-tight truncate max-w-[150px] sm:max-w-none">
            Zhongwen Master
          </span>
        </div>

        {/* Desktop Navigation - Hidden on Mobile */}
        <nav className="hidden md:flex space-x-8">
          <button onClick={onHome} className="text-gray-600 hover:text-indigo-600 font-bold transition-colors">Học tập</button>
          <button onClick={onReview} className="text-gray-600 hover:text-indigo-600 font-bold transition-colors">Ôn tập</button>
          <button className="text-gray-600 hover:text-indigo-600 font-bold transition-colors">Cộng đồng</button>
        </nav>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <button className="hidden sm:block bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full font-bold text-sm hover:bg-indigo-100 transition-colors">
            Mở khóa Pro
          </button>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
            <img src="https://picsum.photos/100/100?random=1" alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
