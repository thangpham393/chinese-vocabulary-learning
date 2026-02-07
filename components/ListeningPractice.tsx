
import React, { useState, useEffect, useRef } from 'react';
import { VocabularyItem } from '../types';
import { speak } from '../services/geminiService';

interface ListeningPracticeProps {
  level: number;
  allVocab: VocabularyItem[];
  onExit: () => void;
}

const normalize = (text: string) => text.replace(/[，。！？；：""''（）【】《》\s,.!?;:]/g, '').toLowerCase();

const ListeningPractice: React.FC<ListeningPracticeProps> = ({ level, allVocab, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledItems, setShuffledItems] = useState<VocabularyItem[]>([]);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShuffledItems([...allVocab].sort(() => Math.random() - 0.5));
  }, [allVocab]);

  const currentItem = shuffledItems[currentIndex];

  const handleSpeak = async () => {
    if (!currentItem || isSpeaking) return;
    setIsSpeaking(true);
    await speak(currentItem.exampleZh, playbackSpeed);
    setIsSpeaking(false);
    inputRef.current?.focus();
  };

  const handleCheck = () => {
    if (!currentItem || showResult !== 'idle') return;
    const user = normalize(userInput);
    const target = normalize(currentItem.exampleZh);
    if (user === target) {
      setShowResult('correct');
    } else {
      setShowResult('incorrect');
    }
  };

  const nextQuestion = () => {
    setShowResult('idle');
    setUserInput('');
    if (currentIndex < shuffledItems.length - 1) setCurrentIndex(prev => prev + 1);
    else onExit();
  };

  if (!currentItem) return null;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <button onClick={onExit} className="text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:text-black transition-colors">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
           Quay lại
        </button>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
          <button onClick={() => setPlaybackSpeed(1.0)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${playbackSpeed === 1.0 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>1.0x</button>
          <button onClick={() => setPlaybackSpeed(0.7)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${playbackSpeed === 0.7 ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400'}`}>0.7x 🐢</button>
        </div>
      </div>

      <div className={`bg-white rounded-[4rem] p-12 shadow-2xl border-2 transition-all duration-500 relative overflow-hidden ${showResult === 'correct' ? 'border-emerald-400' : showResult === 'incorrect' ? 'border-red-400' : 'border-slate-50'}`}>
        <div className="text-center mb-12 relative z-10">
          <div className="relative inline-block mb-10">
            {/* Animated Circles behind the button */}
            {isSpeaking && (
              <>
                <div className="absolute inset-0 bg-indigo-400/20 rounded-full animate-ping scale-150"></div>
                <div className="absolute inset-0 bg-indigo-400/10 rounded-full animate-ping delay-300 scale-[2]"></div>
              </>
            )}
            
            <button 
              onClick={handleSpeak} 
              disabled={isSpeaking} 
              className={`w-36 h-36 rounded-full flex items-center justify-center mx-auto shadow-2xl transition-all relative z-20 ${isSpeaking ? 'bg-white scale-95' : 'bg-indigo-600 text-white hover:scale-105 active:scale-90 hover:shadow-indigo-200'}`}
            >
              {isSpeaking ? (
                <div className="flex items-end gap-1 h-8">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-indigo-600 rounded-full animate-bounce" 
                      style={{ animationDelay: `${i * 0.1}s`, height: `${30 + Math.random() * 70}%` }}
                    />
                  ))}
                </div>
              ) : (
                <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
          <h2 className="text-2xl font-black text-slate-800">Nghe và tái hiện</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">Hệ thống đang phát âm câu ví dụ...</p>
        </div>

        <div className="space-y-6 relative z-10">
          <input 
            ref={inputRef} 
            type="text" 
            value={userInput} 
            onChange={(e) => setUserInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && (showResult === 'idle' ? handleCheck() : nextQuestion())} 
            placeholder="Nhập chữ Hán..." 
            disabled={showResult !== 'idle'} 
            className="w-full p-8 bg-slate-50 border-2 border-transparent rounded-[2.5rem] outline-none text-3xl font-chinese text-center focus:border-indigo-500 transition-all placeholder:text-slate-200"
          />

          {showResult === 'incorrect' && (
            <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 animate-in slide-in-from-top-2">
              <p className="text-red-700 text-3xl font-chinese mb-3 text-center leading-relaxed">{currentItem.exampleZh}</p>
              <div className="h-px bg-red-100 w-12 mx-auto mb-3"></div>
              <p className="text-red-500 italic text-center text-sm font-bold">{currentItem.exampleVi}</p>
            </div>
          )}

          {showResult === 'correct' && (
            <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 animate-in slide-in-from-top-2 text-center">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-emerald-700 font-black">Tuyệt vời! Bạn đã nghe rất tốt.</p>
            </div>
          )}

          <button 
            onClick={showResult === 'idle' ? handleCheck : nextQuestion} 
            className={`w-full py-6 rounded-[2.5rem] font-black text-lg shadow-xl transition-all active:scale-95 ${showResult === 'idle' ? 'bg-slate-900 text-white hover:bg-black' : 'bg-indigo-600 text-white shadow-indigo-200'}`}
          >
            {showResult === 'idle' ? 'Kiểm tra' : 'Bài tiếp theo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListeningPractice;
