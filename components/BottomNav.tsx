
import React from 'react';
import { AppMode } from '../types';

interface BottomNavProps {
  currentMode: AppMode;
  onHome: () => void;
  onReview: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentMode, onHome, onReview }) => {
  // Chỉ sử dụng các mode có trong enum AppMode tại types.ts
  const isHomeActive = [
    AppMode.HOME, 
    AppMode.LESSON_SELECT, 
    AppMode.STUDY_MODE_SELECT, 
    AppMode.FLASHCARD, 
    AppMode.REVIEW
  ].includes(currentMode);
  
  const isReviewActive = [AppMode.LISTENING].includes(currentMode);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-6 py-3 z-50 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <button 
        onClick={onHome}
        className={`flex flex-col items-center gap-1 transition-all ${isHomeActive ? 'text-indigo-600' : 'text-slate-400'}`}
      >
        <svg className="w-6 h-6" fill={isHomeActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-[10px] font-black uppercase tracking-tighter">Học tập</span>
      </button>

      <button 
        onClick={onReview}
        className={`flex flex-col items-center gap-1 transition-all ${isReviewActive ? 'text-indigo-600' : 'text-slate-400'}`}
      >
        <svg className="w-6 h-6" fill={isReviewActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <span className="text-[10px] font-black uppercase tracking-tighter">Ôn tập</span>
      </button>

      <button className="flex flex-col items-center gap-1 text-slate-400">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className="text-[10px] font-black uppercase tracking-tighter">Cộng đồng</span>
      </button>
    </div>
  );
};

export default BottomNav;
