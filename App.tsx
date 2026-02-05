
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CategoryCard from './components/CategoryCard';
import FlashcardStudy from './components/FlashcardStudy';
import ReviewSession from './components/ReviewSession';
import ListeningPractice from './components/ListeningPractice';
import BottomNav from './components/BottomNav';
import { HSK_CATEGORIES, TOPIC_CATEGORIES } from './constants';
import { AppMode, Category, Lesson, VocabularyItem } from './types';
import { fetchLessons, fetchVocab, enrichVocabularyWithAI, saveCustomLesson } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [vocab, setVocab] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [importLevel, setImportLevel] = useState(1);
  const [importTitle, setImportTitle] = useState('');
  const [importText, setImportText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectCat = async (cat: Category) => {
    setSelectedCat(cat);
    setLoading(true);
    try {
      const data = await fetchLessons(cat.level);
      setLessons(data);
      setMode(AppMode.LESSON_SELECT);
    } catch (e) {
      alert("Không thể tải danh sách bài học.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLesson = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setLoading(true);
    try {
      const data = await fetchVocab(lesson.id);
      setVocab(data);
      setMode(AppMode.STUDY_MODE_SELECT);
    } catch (e) {
      alert("Lỗi khi tải nội dung bài học.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importTitle || !importText) return alert("Vui lòng nhập tên bài và danh sách từ.");
    setIsProcessing(true);
    try {
      const enriched = await enrichVocabularyWithAI(importText);
      const cat = [...HSK_CATEGORIES, ...TOPIC_CATEGORIES].find(c => c.level === importLevel);
      if (cat) {
        await saveCustomLesson(cat, { 
          id: '', 
          number: lessons.length + 1, 
          title: importTitle, 
          description: `${enriched.length} từ mới` 
        }, enriched);
        
        alert("Đã thêm bài học thành công!");
        setShowModal(false);
        setImportText(''); setImportTitle('');
        handleSelectCat(cat);
      }
    } catch (e: any) {
      alert(e.message || "Lỗi AI không thể phân tích văn bản.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 pb-20">
      <Header onHome={() => setMode(AppMode.HOME)} onReview={() => setMode(AppMode.HOME)} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {mode === AppMode.HOME && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Học Tiếng Trung</h1>
                <p className="text-slate-400 font-medium">Khám phá vựng từ HSK và chủ đề đời sống</p>
              </div>
              <button onClick={() => setShowModal(true)} className="w-full md:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-[0_10px_20px_rgba(79,70,229,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                <span className="text-xl">+</span> Thêm bài học mới
              </button>
            </div>
            
            <section className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-slate-100"></div>
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-[0.2em]">Lộ trình HSK Standard</h2>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
                {HSK_CATEGORIES.map(c => <CategoryCard key={c.id} category={c} onClick={handleSelectCat} />)}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-slate-100"></div>
                <h2 className="text-sm font-black text-slate-300 uppercase tracking-[0.2em]">Từ vựng theo chủ đề</h2>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
                {TOPIC_CATEGORIES.map(c => <CategoryCard key={c.id} category={c} onClick={handleSelectCat} />)}
              </div>
            </section>
          </div>
        )}

        {mode === AppMode.LESSON_SELECT && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
            <button onClick={() => setMode(AppMode.HOME)} className="mb-8 flex items-center text-indigo-600 font-bold hover:gap-2 transition-all">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              Quay lại trang chủ
            </button>
            <div className="flex items-center gap-6 mb-12">
              <div className="text-5xl bg-white p-4 rounded-3xl shadow-sm border border-slate-100">{selectedCat?.icon}</div>
              <h2 className="text-4xl font-black">{selectedCat?.name}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map(l => (
                <button key={l.id} onClick={() => handleSelectLesson(l)} className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-indigo-500 text-left transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Bài {l.number}</div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-800 mb-2">{l.title}</div>
                  <div className="text-slate-400 font-medium text-sm">{l.description}</div>
                </button>
              ))}
              {lessons.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="text-6xl mb-4 opacity-20">📭</div>
                  <p className="text-slate-400 font-bold">Chưa có bài học nào. Hãy nhấn "Thêm bài học mới"!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === AppMode.STUDY_MODE_SELECT && (
          <div className="max-w-xl mx-auto py-10 animate-in zoom-in duration-500">
            <button onClick={() => setMode(AppMode.LESSON_SELECT)} className="mb-8 flex items-center text-indigo-600 font-bold">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              Quay lại bài học
            </button>
            <div className="text-center mb-12">
              <div className="text-indigo-600 font-black text-xs uppercase tracking-[0.3em] mb-4">Lựa chọn chế độ</div>
              <h2 className="text-5xl font-black text-slate-900">{selectedLesson?.title}</h2>
            </div>
            <div className="flex flex-col gap-5">
              <button onClick={() => setMode(AppMode.FLASHCARD)} className="group bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 hover:border-indigo-600 transition-all shadow-sm hover:shadow-lg flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📇</div>
                <div className="text-left">
                  <div className="text-xl font-black">Flashcards</div>
                  <div className="text-sm text-slate-400 font-medium">Học từ vựng qua thẻ ghi nhớ</div>
                </div>
              </button>
              <button onClick={() => setMode(AppMode.REVIEW)} className="group bg-indigo-600 p-8 rounded-[2.5rem] border-2 border-transparent hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-6">
                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">✍️</div>
                <div className="text-left text-white">
                  <div className="text-xl font-black">Viết chữ Hán</div>
                  <div className="text-sm text-indigo-100 font-medium">Luyện tập gõ và nhận diện chữ</div>
                </div>
              </button>
              <button onClick={() => setMode(AppMode.LISTENING)} className="group bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 hover:border-indigo-600 transition-all shadow-sm hover:shadow-lg flex items-center gap-6">
                <div className="w-16 h-16 bg-purple-50 rounded-3xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">🎧</div>
                <div className="text-left">
                  <div className="text-xl font-black">Luyện nghe</div>
                  <div className="text-sm text-slate-400 font-medium">Nghe câu ví dụ và viết lại</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {mode === AppMode.FLASHCARD && <FlashcardStudy items={vocab} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} onFinish={() => setMode(AppMode.STUDY_MODE_SELECT)} />}
        {mode === AppMode.REVIEW && <ReviewSession items={vocab} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} onComplete={() => setMode(AppMode.STUDY_MODE_SELECT)} />}
        {mode === AppMode.LISTENING && <ListeningPractice level={selectedCat?.level || 1} allVocab={vocab} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} />}

        {loading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[200] flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="font-black text-indigo-600 animate-pulse">Đang tải dữ liệu...</p>
          </div>
        )}
      </main>

      <BottomNav currentMode={mode} onHome={() => setMode(AppMode.HOME)} onReview={() => {}} />

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[300] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in duration-300 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <h3 className="text-4xl font-black mb-2">Tạo bài học</h3>
            <p className="text-slate-400 font-medium mb-10">AI sẽ tự động dịch, phiên âm và tạo ví dụ cho bạn.</p>
            
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">Cấp độ / Chủ đề</label>
                  <select value={importLevel} onChange={e => setImportLevel(Number(e.target.value))} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-4 ring-indigo-50/50 focus:border-indigo-400 transition-all appearance-none cursor-pointer">
                    <optgroup label="HSK Standard">
                      {HSK_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                    </optgroup>
                    <optgroup label="Chủ đề mở rộng">
                      {TOPIC_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">Tên bài học</label>
                  <input type="text" value={importTitle} onChange={e => setImportTitle(e.target.value)} placeholder="VD: Đồ dùng học tập" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-4 ring-indigo-50/50 focus:border-indigo-400 transition-all"/>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">Danh sách chữ Hán (Mỗi dòng một từ)</label>
                <textarea 
                  value={importText} 
                  onChange={e => setImportText(e.target.value)} 
                  className="w-full h-44 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] font-chinese text-3xl outline-none focus:ring-4 ring-indigo-50/50 focus:border-indigo-400 transition-all resize-none shadow-inner" 
                  placeholder="苹果&#10;西瓜&#10;香蕉"
                />
              </div>
            </div>

            <div className="mt-12 flex items-center gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-5 font-black text-slate-400 hover:text-slate-600 transition-colors">Hủy bỏ</button>
              <button 
                onClick={handleImport} 
                disabled={isProcessing} 
                className="flex-[2] bg-indigo-600 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>AI đang phân tích...</span>
                  </>
                ) : (
                  <span>Tạo bài học bằng AI</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
