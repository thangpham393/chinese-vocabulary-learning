
import React, { useState, useEffect, useRef } from 'react';
import { VocabularyItem } from '../types';
import { speakText } from '../services/geminiService';

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
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShuffledItems([...allVocab].sort(() => Math.random() - 0.5));
  }, [allVocab]);

  const currentItem = shuffledItems[currentIndex];

  const handleSpeak = async () => {
    if (!currentItem || isSpeaking) return;
    setIsSpeaking(true);
    await speakText(currentItem.exampleZh, playbackSpeed);
    setIsSpeaking(false);
    inputRef.current?.focus();
  };

  const handleCheck = () => {
    if (!currentItem || showResult !== 'idle') return;
    const user = normalize(userInput);
    const target = normalize(currentItem.exampleZh);
    if (user === target) {
      setShowResult('correct');
      setStats(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setShowResult('incorrect');
      setStats(prev => ({ ...prev, total: prev.total + 1 }));
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
    <div className="max-w-2xl mx-auto py-10 px-4 animate-in fade-in">
      <div className="flex items-center justify-between mb-10">
        <button onClick={onExit} className="text-slate-400 hover:text-indigo-600 font-bold flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg> Thoát
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => setPlaybackSpeed(1.0)} 
            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${playbackSpeed === 1.0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}
          >1.0x</button>
          <button 
            onClick={() => setPlaybackSpeed(0.7)} 
            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${playbackSpeed === 0.7 ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}
          >0.7x 🐢</button>
        </div>
      </div>

      <div className={`bg-white rounded-[3rem] p-12 shadow-2xl border-2 transition-all ${showResult === 'correct' ? 'border-green-400' : showResult === 'incorrect' ? 'border-red-400' : 'border-slate-50'}`}>
        <div className="text-center mb-10">
          <button onClick={handleSpeak} disabled={isSpeaking} className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl transition-all active:scale-90 ${isSpeaking ? 'bg-indigo-100' : 'bg-indigo-600 text-white'}`}>
            {isSpeaking ? <div className="flex gap-1"><div className="w-1.5 h-8 bg-indigo-400 animate-bounce"></div><div className="w-1.5 h-12 bg-indigo-400 animate-bounce delay-75"></div><div className="w-1.5 h-8 bg-indigo-400 animate-bounce delay-150"></div></div> : <svg className="w-16 h-16 ml-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
          </button>
          <p className="text-indigo-600 font-black text-xl">{isSpeaking ? 'Đang đọc...' : 'Nghe và gõ lại'}</p>
        </div>

        <input ref={inputRef} type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (showResult === 'idle' ? handleCheck() : nextQuestion())} placeholder="Nhập chữ Hán..." disabled={showResult !== 'idle'} className="w-full p-6 bg-slate-50 border-2 rounded-2xl outline-none text-2xl font-chinese text-center mb-6 focus:border-indigo-500"/>

        {showResult === 'incorrect' && (
          <div className="bg-red-50 p-6 rounded-2xl mb-6 border border-red-100">
            <p className="text-red-700 text-2xl font-chinese mb-2">{currentItem.exampleZh}</p>
            <p className="text-red-500 italic">{currentItem.exampleVi}</p>
          </div>
        )}

        <button onClick={showResult === 'idle' ? handleCheck : nextQuestion} className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black shadow-xl hover:bg-slate-800 transition-all">{showResult === 'idle' ? 'Kiểm tra' : 'Tiếp theo'}</button>
      </div>
    </div>
  );
};

export default ListeningPractice;
