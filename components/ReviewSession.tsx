
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
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onExit} className="text-gray-600 font-medium">← Quay lại</button>
        <span className="text-sm font-medium text-gray-500">{currentIndex + 1} / {shuffledItems.length}</span>
      </div>

      <div className={`bg-white rounded-3xl shadow-xl border border-gray-100 flex-1 flex flex-col p-8 transition-all ${showResult === 'correct' ? 'ring-4 ring-green-400' : showResult === 'incorrect' ? 'ring-4 ring-red-400' : ''}`}>
        <div className="flex-1 flex flex-col items-center">
          <div className="flex gap-4 mb-8">
             <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase">{currentItem.partOfSpeech}</span>
             <button onClick={handleManualImage} className="text-xs text-gray-400 hover:text-indigo-600">{isLoadingImage ? '⌛...' : '✨ Hiện ảnh'}</button>
          </div>

          {currentImage && <img src={currentImage} className="w-48 h-48 rounded-2xl mb-8 object-cover animate-in zoom-in" />}

          <h2 className="text-4xl font-bold text-indigo-700 mb-6">{showResult !== 'idle' ? currentItem.pinyin : '?? ??? ??'}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
            <div className="bg-gray-50 p-4 rounded-2xl"><p className="text-[10px] font-black uppercase text-gray-400 mb-1">Tiếng Việt</p><p className="font-bold">{currentItem.definitionVi}</p></div>
            <div className="bg-gray-50 p-4 rounded-2xl"><p className="text-[10px] font-black uppercase text-gray-400 mb-1">English</p><p className="font-bold">{currentItem.definitionEn}</p></div>
          </div>

          <div className="w-full bg-indigo-50/50 p-6 rounded-2xl mb-8">
            <p className="text-2xl mb-2 font-chinese">{currentItem.exampleZh.replace(currentItem.word, '____')}</p>
            <p className="text-sm text-gray-500">{currentItem.exampleVi}</p>
          </div>

          <input ref={inputRef} type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCheck()} placeholder="Nhập chữ Hán..." disabled={showResult !== 'idle'} className="w-full text-center py-5 border-2 rounded-3xl text-3xl font-chinese focus:border-indigo-500 outline-none"/>
        </div>

        <div className="pt-6 flex gap-4">
          <button onClick={() => { setShowResult('incorrect'); setUserInput(currentItem.word); setTimeout(nextWord, 2000); }} className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl font-bold">Không biết</button>
          <button onClick={handleCheck} className="flex-[2] bg-indigo-600 text-white rounded-2xl font-bold">Kiểm tra</button>
        </div>
      </div>
    </div>
  );
};

export default ReviewSession;
