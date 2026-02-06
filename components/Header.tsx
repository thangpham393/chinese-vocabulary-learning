
import React from 'react';

interface HeaderProps {
  onHome: () => void;
  onReview: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHome, onReview }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-[100] px-4 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-card px-6 py-3 rounded-[2rem] shadow-sm">
        <div 
          className="flex items-center cursor-pointer group"
          onClick={onHome}
        >
          <div className="w-10 h-10 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-xl transition-transform group-hover:rotate-12">
            中
          </div>
          <div className="ml-3 hidden sm:block">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">Zhongwen Master</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Premium Language Learning</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl">
          <button onClick={onHome} className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-white transition-all">Lộ trình</button>
          <button onClick={onReview} className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-white transition-all">Ôn tập</button>
          <button className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-white transition-all">Cộng đồng</button>
        </nav>

        <div className="flex items-center gap-3">
          <button className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-amber-200 to-amber-400 text-amber-900 px-5 py-2 rounded-2xl font-black text-xs shadow-sm hover:scale-105 active:scale-95 transition-all">
            <span>PRO</span>
            <div className="w-4 h-4 bg-white/30 rounded-full flex items-center justify-center">✨</div>
          </button>
          <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
