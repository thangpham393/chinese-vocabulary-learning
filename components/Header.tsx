
import React from 'react';

interface HeaderProps {
  onHome: () => void;
  onReview: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHome, onReview }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div 
          className="flex items-center cursor-pointer group"
          onClick={onHome}
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl group-hover:bg-indigo-700 transition-colors">
            中
          </div>
          <span className="ml-3 text-xl font-bold text-gray-900 tracking-tight">Zhongwen Master</span>
        </div>

        <nav className="hidden md:flex space-x-8">
          <button onClick={onHome} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Học tập</button>
          <button onClick={onReview} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Ôn tập</button>
          <button className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Cộng đồng</button>
        </nav>

        <div className="flex items-center space-x-4">
          <button className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full font-semibold text-sm hover:bg-indigo-100 transition-colors">
            Mở khóa Pro
          </button>
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
            <img src="https://picsum.photos/100/100?random=1" alt="Profile" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
