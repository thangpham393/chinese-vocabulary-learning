
// Add React import to resolve React namespace issues
import React, { useState, useEffect, useMemo } from 'react';
import { VocabularyItem } from '../types';
import { generateImageForWord } from '../services/geminiService';

interface FlashcardStudyProps {
  items: VocabularyItem[];
  onExit: () => void;
  onFinish: () => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const FlashcardStudy: React.FC<FlashcardStudyProps> = ({ items, onExit, onFinish }) => {
  const shuffledItems = useMemo(() => shuffleArray(items), [items]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);
  const [loadingImg, setLoadingImg] = useState(false);

  const currentItem = shuffledItems[currentIndex];

  useEffect(() => {
    setCurrentImage(undefined);
    setLoadingImg(false);
    setIsFlipped(false);
  }, [currentIndex]);

  const handleManualGenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentItem || loadingImg) return;

    setLoadingImg(true);
    const img = await generateImageForWord(currentItem.word, currentItem.definitionVi);
    setCurrentImage(img);
    setLoadingImg(false);
  };

  const handleNext = () => {
    if (currentIndex < shuffledItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!currentItem) return null;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onExit} className="text-gray-500 hover:text-indigo-600 font-medium flex items-center transition-colors">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Thoát
        </button>
        <div className="text-gray-400 font-bold tracking-widest text-sm uppercase">
          Flashcards {currentIndex + 1} / {shuffledItems.length} (Ngẫu nhiên)
        </div>
      </div>

      <div 
        className="relative w-full aspect-[3/4] sm:aspect-[4/3] cursor-pointer group perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full duration-700 preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
          {/* Front */}
          <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center justify-center backface-hidden p-10">
            <div className="w-full flex flex-col items-center">
              {currentImage ? (
                <div className="w-40 h-40 bg-indigo-50 rounded-2xl mb-6 overflow-hidden border border-indigo-100 shadow-inner animate-in zoom-in duration-300">
                  <img src={currentImage} alt="word" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="mb-4">
                  {loadingImg ? (
                    <div className="flex flex-col items-center py-4">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-2"></div>
                      <span className="text-[10px] text-indigo-400 font-bold uppercase">AI đang vẽ...</span>
                    </div>
                  ) : (
                    <button 
                      onClick={handleManualGenerateImage}
                      className="group/btn flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 px-4 py-2 rounded-xl border border-indigo-100 transition-all text-sm font-bold shadow-sm"
                    >
                      <span>✨ Vẽ ảnh minh họa (AI)</span>
                    </button>
                  )}
                </div>
              )}
              
              <h2 className="text-8xl font-bold text-gray-900 mb-4 font-chinese tracking-tight">{currentItem.word}</h2>
              <p className="text-gray-400 text-lg">Bấm để lật thẻ xem ý nghĩa</p>
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 bg-indigo-600 rounded-3xl shadow-2xl flex flex-col items-center justify-center backface-hidden rotate-y-180 p-10 text-white overflow-y-auto">
            <div className="text-center w-full">
              <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-xs font-bold uppercase mb-4 tracking-widest border border-white/10">
                {currentItem.partOfSpeech}
              </span>
              <h2 className="text-6xl font-bold mb-2 font-chinese tracking-tight">{currentItem.word}</h2>
              <p className="text-2xl font-medium text-indigo-100 mb-8 tracking-wide">{currentItem.pinyin}</p>
              
              <div className="space-y-6 max-w-sm mx-auto text-left border-t border-white/10 pt-6">
                <div>
                  <p className="text-[10px] text-indigo-200 uppercase font-extrabold mb-1 tracking-tighter">Định nghĩa</p>
                  <p className="text-xl font-medium leading-tight">{currentItem.definitionVi}</p>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-200 uppercase font-extrabold mb-1 tracking-tighter">Ví dụ</p>
                  <p className="text-lg leading-snug mb-2 font-chinese">{currentItem.exampleZh}</p>
                  <p className="text-sm text-indigo-100 italic opacity-80 leading-relaxed">{currentItem.exampleVi}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-12 gap-4">
        <button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          disabled={currentIndex === 0}
          className={`flex-1 py-4 rounded-2xl font-bold transition-all border-2 ${currentIndex === 0 ? 'border-gray-100 text-gray-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95'}`}
        >
          Trước đó
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="flex-1 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          {currentIndex === shuffledItems.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
        </button>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default FlashcardStudy;
