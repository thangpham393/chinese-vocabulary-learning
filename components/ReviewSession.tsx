
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VocabularyItem } from '../types';
import { genImage } from '../services/geminiService';

interface ReviewSessionProps {
  items: VocabularyItem[];
  onComplete: (results: { completed: string[]; failed: string[] }) => void;
  onExit: () => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const ReviewSession: React.FC<ReviewSessionProps> = ({ items, onComplete, onExit }) => {
  const shuffledItems = useMemo(() => shuffleArray(items), [items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState<'correct' | 'incorrect' | 'idle'>('idle');
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const currentItem = shuffledItems[currentIndex];

  useEffect(() => {
    setCurrentImage(undefined);
    setIsLoadingImage(false);
    setShowResult('idle');
    setUserInput('');
    inputRef.current?.focus();
  }, [currentIndex, currentItem]);

  const handleManualImage = async () => {
    if (!currentItem || isLoadingImage) return;
    setIsLoadingImage(true);
    const img = await genImage(currentItem.word);
    setCurrentImage(img);
    setIsLoadingImage(false);
  };

  const handleCheck = () => {
    if (userInput.trim() === currentItem.word) {
      setShowResult('correct');
      if (!failedIds.includes(currentItem.id)) setCompletedIds(prev => [...prev, currentItem.id]);
      setTimeout(() => nextWord(), 1000);
    } else {
      setShowResult('incorrect');
      if (!failedIds.includes(currentItem.id)) setFailedIds(prev => [...prev, currentItem.id]);
    }
  };

  const nextWord = () => {
    if (currentIndex < shuffledItems.length - 1) setCurrentIndex(prev => prev + 1);
    else onComplete({ completed: completedIds, failed: failedIds });
  };

  if (!currentItem) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-64px)] animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onExit} className="text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:text-black transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          Thoát
        </button>
        <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{currentIndex + 1} / {shuffledItems.length}</span>
      </div>

      <div className={`bg-white rounded-[4rem] shadow-2xl border-2 flex-1 flex flex-col p-10 transition-all duration-500 relative overflow-hidden ${showResult === 'correct' ? 'border-emerald-400 ring-4 ring-emerald-50' : showResult === 'incorrect' ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-50'}`}>
        <div className="flex-1 flex flex-col items-center">
          <div className="flex gap-4 mb-8">
             <span className="px-5 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">{currentItem.partOfSpeech}</span>
             <button onClick={handleManualImage} className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-indigo-600 flex items-center gap-1">
               {isLoadingImage ? '⌛...' : '✨ Hiện ảnh minh họa'}
             </button>
          </div>

          <div className="min-h-[160px] flex items-center justify-center mb-8">
            {currentImage ? (
              <img src={currentImage} className="w-40 h-40 rounded-[2.5rem] object-cover animate-in zoom-in shadow-xl" />
            ) : (
              <div className="w-40 h-40 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex items-center justify-center text-4xl grayscale opacity-20">🖼️</div>
            )}
          </div>

          <h2 className="text-6xl font-black text-slate-900 mb-8 font-chinese">
            {showResult !== 'idle' ? currentItem.word : currentItem.pinyin}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-10">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-300 mb-2 tracking-widest">Định nghĩa VI</p>
              <p className="font-bold text-lg">{currentItem.definitionVi}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-300 mb-2 tracking-widest">English Mean</p>
              <p className="font-bold text-lg">{currentItem.definitionEn}</p>
            </div>
          </div>

          <div className="w-full bg-indigo-50/30 p-8 rounded-[3rem] mb-10 border border-indigo-50">
            <p className="text-3xl mb-4 font-chinese leading-relaxed">
              {currentItem.exampleZh.split(currentItem.word).map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part}
                  {i < arr.length - 1 && <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">____</span>}
                </React.Fragment>
              ))}
            </p>
            <p className="text-slate-400 font-medium italic">{currentItem.exampleVi}</p>
          </div>

          <input 
            ref={inputRef} 
            type="text" 
            value={userInput} 
            onChange={(e) => setUserInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()} 
            placeholder="Gõ chữ Hán vào đây..." 
            disabled={showResult !== 'idle'} 
            className="w-full text-center py-6 bg-slate-50 border-2 border-transparent rounded-[2.5rem] text-4xl font-chinese focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200"
          />
        </div>

        <div className="pt-10 flex gap-4">
          <button 
            onClick={() => { setShowResult('incorrect'); setUserInput(currentItem.word); setTimeout(nextWord, 2500); }} 
            className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
          >
            Bỏ qua
          </button>
          <button 
            onClick={handleCheck} 
            className="flex-[2] bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
          >
            Kiểm tra đáp án
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewSession;
