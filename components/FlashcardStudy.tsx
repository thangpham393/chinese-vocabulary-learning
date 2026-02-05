
import React, { useState, useEffect } from 'react';
import { VocabularyItem } from '../types';
import { speak, genImage } from '../services/geminiService';

interface FlashcardStudyProps {
  items: VocabularyItem[];
  onExit: () => void;
  onFinish: () => void;
}

const FlashcardStudy: React.FC<FlashcardStudyProps> = ({ items, onExit, onFinish }) => {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [img, setImg] = useState<string | undefined>();
  const [loadingImg, setLoadingImg] = useState(false);

  const item = items[idx];

  useEffect(() => {
    setFlipped(false);
    setImg(undefined);
  }, [idx]);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(item.word);
  };

  const handleGenImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loadingImg) return;
    setLoadingImg(true);
    const url = await genImage(item.word);
    setImg(url);
    setLoadingImg(false);
  };

  if (!item) return null;

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <button onClick={onExit} className="text-slate-400 font-bold">← Thoát</button>
        <span className="font-bold text-slate-300">{idx + 1} / {items.length}</span>
      </div>

      <div 
        className="relative aspect-[3/4] cursor-pointer perspective-1000"
        onClick={() => setFlipped(!flipped)}
      >
        <div className={`relative w-full h-full duration-500 preserve-3d transform transition-transform ${flipped ? 'rotate-y-180' : ''}`}>
          <div className="absolute inset-0 bg-white rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center justify-center backface-hidden p-10">
            {img && <img src={img} className="w-32 h-32 object-cover rounded-2xl mb-6 animate-in zoom-in" />}
            <h2 className="text-7xl font-bold mb-6 font-chinese">{item.word}</h2>
            <div className="flex gap-4">
              <button onClick={handleSpeak} className="p-4 bg-slate-100 rounded-full hover:bg-indigo-100 transition-colors">🔊</button>
              <button onClick={handleGenImage} className="p-4 bg-slate-100 rounded-full hover:bg-indigo-100 transition-colors">{loadingImg ? "⌛" : "✨"}</button>
            </div>
            <p className="mt-8 text-slate-300 text-sm font-bold animate-pulse">Chạm để xem nghĩa</p>
          </div>

          <div className="absolute inset-0 bg-indigo-600 text-white rounded-[3rem] shadow-xl flex flex-col items-center justify-center backface-hidden rotate-y-180 p-10 overflow-y-auto">
            <h3 className="text-4xl font-bold font-chinese mb-2">{item.word}</h3>
            <p className="text-xl text-indigo-200 mb-8">{item.pinyin}</p>
            <div className="text-center space-y-4">
              <p className="text-2xl font-bold">{item.definitionVi}</p>
              <p className="text-sm opacity-70 italic">"{item.exampleZh}"</p>
              <p className="text-xs opacity-50">{item.exampleVi}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-10">
        <button onClick={() => setIdx(Math.max(0, idx - 1))} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-bold">Trước</button>
        <button onClick={() => idx < items.length - 1 ? setIdx(idx + 1) : onFinish()} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200">
          {idx === items.length - 1 ? "Hoàn thành" : "Tiếp theo"}
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
