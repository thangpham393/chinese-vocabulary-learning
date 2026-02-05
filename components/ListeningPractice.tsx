
import React, { useState, useEffect, useRef } from 'react';
import { VocabularyItem } from '../types';
import { speakText } from '../services/geminiService';

interface ListeningPracticeProps {
  level: number;
  allVocab: VocabularyItem[];
  onExit: () => void;
}

const normalize = (text: string) => {
  // Loại bỏ các dấu câu tiếng Trung và Latin, khoảng trắng
  return text.replace(/[，。！？；：""''（）【】《》\s,.!?;:]/g, '').toLowerCase();
};

const ListeningPractice: React.FC<ListeningPracticeProps> = ({ level, allVocab, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledItems, setShuffledItems] = useState<VocabularyItem[]>([]);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Xáo trộn dữ liệu
    const shuffled = [...allVocab].sort(() => Math.random() - 0.5);
    setShuffledItems(shuffled);
  }, [allVocab]);

  const currentItem = shuffledItems[currentIndex];

  const handleSpeak = async () => {
    if (!currentItem || isSpeaking) return;
    setIsSpeaking(true);
    await speakText(currentItem.exampleZh);
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
    setIsSpeaking(false);
    
    if (currentIndex < shuffledItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      alert(`Hoàn thành! Bạn đúng ${stats.correct}/${allVocab.length} câu.`);
      onExit();
    }
  };

  const handleShowAnswer = () => {
    setShowResult('incorrect');
    setUserInput(currentItem.exampleZh);
    setStats(prev => ({ ...prev, total: prev.total + 1 }));
  };

  if (!currentItem) return (
    <div className="flex flex-col items-center justify-center p-20 text-center">
      <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
      <p className="text-slate-400 font-bold">Đang chuẩn bị câu hỏi...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <button onClick={onExit} className="text-slate-400 hover:text-indigo-600 font-bold flex items-center transition-all">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          Thoát
        </button>
        <div className="bg-indigo-50 px-4 py-1.5 rounded-full text-indigo-600 font-black text-xs uppercase tracking-widest">
          HSK {level} - Listening ({currentIndex + 1}/{shuffledItems.length})
        </div>
      </div>

      <div className={`bg-white rounded-[3rem] p-8 sm:p-12 shadow-2xl border-2 transition-all duration-300 ${
        showResult === 'correct' ? 'border-green-400 shadow-green-100' : 
        showResult === 'incorrect' ? 'border-red-400 shadow-red-100' : 'border-slate-50'
      }`}>
        <div className="text-center mb-10">
          <p className="text-slate-400 font-bold mb-6 text-sm uppercase tracking-widest">Hãy nghe và gõ lại câu văn</p>
          
          <button 
            onClick={handleSpeak}
            disabled={isSpeaking}
            className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6 transition-all active:scale-90 shadow-xl ${
              isSpeaking ? 'bg-indigo-100 text-indigo-300' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'
            }`}
          >
            {isSpeaking ? (
              <div className="flex gap-1">
                <div className="w-1.5 h-6 bg-indigo-400 animate-bounce"></div>
                <div className="w-1.5 h-10 bg-indigo-400 animate-bounce delay-75"></div>
                <div className="w-1.5 h-6 bg-indigo-400 animate-bounce delay-150"></div>
              </div>
            ) : (
              <svg className="w-14 h-14 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          
          <p className="text-indigo-600 font-black text-lg mb-2">
            {isSpeaking ? 'Đang đọc...' : 'Bấm để nghe'}
          </p>
        </div>

        <div className="space-y-6">
          <input 
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (showResult === 'idle') handleCheck();
                else nextQuestion();
              }
            }}
            placeholder="Nhập chữ Hán tại đây..."
            autoFocus
            disabled={showResult !== 'idle'}
            className={`w-full p-5 bg-slate-50 border-2 rounded-2xl outline-none text-xl sm:text-2xl font-chinese text-center transition-all ${
              showResult === 'correct' ? 'border-green-500 bg-green-50 text-green-700' : 
              showResult === 'incorrect' ? 'border-red-500 bg-red-50 text-red-700' : 'focus:border-indigo-500 border-slate-100'
            }`}
          />

          {showResult === 'incorrect' && (
            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Đáp án đúng:</p>
              </div>
              <p className="text-2xl font-chinese text-red-700 mb-2">{currentItem.exampleZh}</p>
              <p className="text-red-500/70 italic text-sm">{currentItem.exampleVi}</p>
            </div>
          )}

          {showResult === 'correct' && (
             <div className="text-center py-2 animate-in zoom-in">
               <p className="text-green-600 font-black text-xl">✨ Chính xác!</p>
             </div>
          )}

          <div className="flex gap-4">
            {showResult === 'idle' ? (
              <>
                <button 
                  onClick={handleShowAnswer}
                  className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Xem đáp án
                </button>
                <button 
                  onClick={handleCheck}
                  disabled={!userInput.trim()}
                  className={`flex-[2] py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95 ${
                    !userInput.trim() ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Kiểm tra
                </button>
              </>
            ) : (
              <button 
                onClick={nextQuestion}
                className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>Câu tiếp theo</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
           <span className="text-2xl font-black text-green-500">{stats.correct}</span>
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đúng</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
           <span className="text-2xl font-black text-indigo-500">{stats.total}</span>
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng cộng</span>
        </div>
      </div>
    </div>
  );
};

export default ListeningPractice;
