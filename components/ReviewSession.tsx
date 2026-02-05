
// Add React import to resolve React namespace issues
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VocabularyItem } from '../types';
import { generateImageForWord } from '../services/geminiService';

interface ReviewSessionProps {
  items: VocabularyItem[];
  onComplete: (results: { completed: string[]; failed: string[] }) => void;
  onExit: () => void;
}

// Thuật toán xáo trộn Fisher-Yates
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const ReviewSession: React.FC<ReviewSessionProps> = ({ items, onComplete, onExit }) => {
  // Xáo trộn danh sách từ vựng ngay khi bắt đầu (chỉ chạy một lần khi component mount)
  const shuffledItems = useMemo(() => shuffleArray(items), [items]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState<'correct' | 'incorrect' | 'idle'>('idle');
  const [showHint, setShowHint] = useState(false);
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
    setShowHint(false);
    setUserInput('');
    inputRef.current?.focus();
  }, [currentIndex, currentItem]);

  const handleManualImage = async () => {
    if (!currentItem || isLoadingImage) return;
    setIsLoadingImage(true);
    const img = await generateImageForWord(currentItem.word, currentItem.definitionVi);
    setCurrentImage(img);
    setIsLoadingImage(false);
  };

  const handleCheck = () => {
    if (userInput.trim().toLowerCase() === currentItem.word.toLowerCase()) {
      setShowResult('correct');
      if (!failedIds.includes(currentItem.id)) {
        setCompletedIds(prev => [...prev, currentItem.id]);
      }
      setTimeout(() => nextWord(), 1000);
    } else {
      setShowResult('incorrect');
      if (!failedIds.includes(currentItem.id)) {
        setFailedIds(prev => [...prev, currentItem.id]);
      }
    }
  };

  const nextWord = () => {
    if (currentIndex < shuffledItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete({ completed: completedIds, failed: failedIds });
    }
  };

  const handleDontKnow = () => {
    setShowResult('incorrect');
    setUserInput(currentItem.word);
    if (!failedIds.includes(currentItem.id)) {
      setFailedIds(prev => [...prev, currentItem.id]);
    }
    setTimeout(() => nextWord(), 2000);
  };

  if (!currentItem) return null;

  const progress = ((currentIndex + 1) / shuffledItems.length) * 100;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onExit} className="flex items-center text-gray-600 hover:text-indigo-600 font-medium transition-colors">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Quay lại
        </button>
        <div className="flex-1 mx-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-bold text-gray-700">Tiến độ ôn tập (Ngẫu nhiên)</span>
            <span className="text-sm font-medium text-gray-500">{currentIndex + 1} / {shuffledItems.length} từ</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div 
              className="bg-indigo-600 h-full transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex-1 flex flex-col transition-all duration-300 ${showResult === 'correct' ? 'ring-4 ring-green-400' : showResult === 'incorrect' ? 'ring-4 ring-red-400' : ''}`}>
        <div className="p-8 flex flex-col items-center flex-1 overflow-y-auto">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider">
              {currentItem.partOfSpeech}
            </span>
            <button 
              onClick={handleManualImage}
              className="text-xs text-gray-400 hover:text-indigo-600 flex items-center"
            >
              {isLoadingImage ? '⌛ Đang vẽ...' : currentImage ? '✅ Đã có ảnh' : '✨ Hiện ảnh minh họa'}
            </button>
          </div>

          {currentImage && (
            <div className="w-48 h-48 bg-indigo-50 rounded-2xl mb-8 overflow-hidden border border-indigo-100 shadow-sm animate-in fade-in zoom-in duration-300">
              <img src={currentImage} alt="Illustration" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="text-center w-full max-w-lg">
             <h2 className="text-4xl font-bold text-indigo-700 mb-6 flex items-center justify-center">
               {showHint || showResult !== 'idle' ? currentItem.pinyin : '?? ??? ??'}
             </h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tighter mb-1">Định nghĩa Tiếng Việt</p>
                  <p className="text-gray-800 font-bold">{currentItem.definitionVi}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tighter mb-1">English Definition</p>
                  <p className="text-gray-800 font-medium italic">{currentItem.definitionEn}</p>
                </div>
             </div>

             <div className="mb-8 text-left">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tighter mb-2 ml-4">Ví dụ thực tế</p>
                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50">
                  <p className="text-xl text-gray-900 mb-2 font-chinese leading-relaxed">
                    {currentItem.exampleZh.split(currentItem.word).map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && <span className="text-indigo-600 font-bold px-1 bg-indigo-100 rounded">____</span>}
                      </span>
                    ))}
                  </p>
                  <p className="text-sm text-gray-500 italic">{currentItem.exampleVi}</p>
                </div>
             </div>

             {showHint && (
               <div className="mb-4 bg-yellow-50 border border-yellow-200 py-2 px-4 rounded-lg inline-block animate-in slide-in-from-bottom-2">
                 <span className="text-yellow-700 font-bold italic">Gợi ý: {currentItem.word[0]}...</span>
               </div>
             )}

             <div className="relative group max-w-md mx-auto">
               <input
                 ref={inputRef}
                 type="text"
                 value={userInput}
                 onChange={(e) => setUserInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                 placeholder="Nhập chữ Hán..."
                 disabled={showResult !== 'idle'}
                 className="w-full text-center py-5 px-6 border-2 border-gray-200 rounded-3xl text-3xl font-chinese focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
               />
               <button 
                 onClick={() => setShowHint(true)}
                 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-yellow-500 transition-colors"
                 title="Gợi ý chữ đầu tiên"
               >
                 <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.586 15.586a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM10 6a4 4 0 100 8 4 4 0 000-8z" /></svg>
               </button>
             </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between gap-4 sticky bottom-0">
          <button
            onClick={handleDontKnow}
            className="flex-1 bg-white hover:bg-red-50 text-red-500 border-2 border-red-100 font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-sm flex items-center justify-center space-x-2"
          >
            <span>Quên mất rồi</span>
          </button>
          <button
            onClick={handleCheck}
            disabled={!userInput.trim() || showResult !== 'idle'}
            className={`flex-1 font-bold py-4 rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 ${
              !userInput.trim() || showResult !== 'idle' 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
            }`}
          >
            <span>Kiểm tra</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewSession;
