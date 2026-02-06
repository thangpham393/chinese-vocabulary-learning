
import React from 'react';
import { AppMode } from '../types';

interface BottomNavProps {
  currentMode: AppMode;
  onHome: () => void;
  onReview: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentMode, onHome, onReview }) => {
  const isHomeActive = [
    AppMode.HOME, 
    AppMode.LESSON_SELECT, 
    AppMode.STUDY_MODE_SELECT, 
    AppMode.FLASHCARD, 
    AppMode.REVIEW
  ].includes(currentMode);
  
  const isReviewActive = [AppMode.LISTENING].includes(currentMode);

  return (
    <div className="md:hidden fixed bottom-6 left-6 right-6 z-[150]">
      <div className="glass-card bg-white/80 backdrop-blur-2xl px-8 py-4 rounded-[2.5rem] shadow-2xl border border-white/50 flex justify-around items-center">
        <button 
          onClick={onHome}
          className={`relative p-3 rounded-2xl transition-all duration-300 ${isHomeActive ? 'text-black scale-110' : 'text-slate-300'}`}
        >
          {isHomeActive && <div className="absolute inset-0 bg-slate-100 rounded-2xl -z-10 animate-in zoom-in"></div>}
          <svg className="w-6 h-6" fill={isHomeActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        <button 
          onClick={onReview}
          className={`relative p-3 rounded-2xl transition-all duration-300 ${isReviewActive ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}
        >
          {isReviewActive && <div className="absolute inset-0 bg-indigo-50 rounded-2xl -z-10 animate-in zoom-in"></div>}
          <svg className="w-6 h-6" fill={isReviewActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        <button className="relative p-3 rounded-2xl text-slate-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
