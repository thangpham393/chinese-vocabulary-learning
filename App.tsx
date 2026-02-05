
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import CategoryCard from './components/CategoryCard';
import ReviewSession from './components/ReviewSession';
import FlashcardStudy from './components/FlashcardStudy';
import { HSK_CATEGORIES, TOPIC_CATEGORIES } from './constants';
import { Category, VocabularyItem, Lesson, AppMode } from './types';
import { fetchLessonsByCategory, fetchVocabularyForLesson, enrichVocabularyWithAI, saveCustomLesson, getGlobalStats } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [vocabList, setVocabList] = useState<VocabularyItem[]>([]);
  const [stats, setStats] = useState({ totalWords: 0, totalLessons: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Modal states
  const [importText, setImportText] = useState('');
  const [importLessonTitle, setImportLessonTitle] = useState('');
  const [importLessonNumber, setImportLessonNumber] = useState<number>(1);
  const [modalLevel, setModalLevel] = useState<number>(1);

  const allCategories = useMemo(() => [...HSK_CATEGORIES, ...TOPIC_CATEGORIES], []);

  useEffect(() => {
    getGlobalStats().then(setStats);
  }, [mode]);

  // STT nhảy tự động khi chọn Level
  useEffect(() => {
    if (showImportModal) {
      const cat = allCategories.find(c => c.level === modalLevel);
      if (cat) {
        fetchLessonsByCategory(cat).then(catLessons => {
          const maxNum = catLessons.reduce((max, l) => Math.max(max, Number(l.number)), 0);
          setImportLessonNumber(maxNum + 1);
        });
      }
    }
  }, [modalLevel, showImportModal, allCategories]);

  const handleSelectCategory = async (category: Category) => {
    setSelectedCategory(category);
    setIsLoading(true);
    setMode(AppMode.LOADING);
    const data = await fetchLessonsByCategory(category);
    setLessons(data);
    setMode(AppMode.LESSON_SELECT);
    setIsLoading(false);
  };

  const handleSmartImport = async () => {
    if (!importText.trim() || !importLessonTitle.trim()) {
      alert("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    
    const targetCategory = allCategories.find(c => c.level === modalLevel);
    if (!targetCategory) return;

    setIsEnriching(true);
    const enriched = await enrichVocabularyWithAI(importText);
    
    if (enriched.length > 0) {
      const newLesson: Lesson = { 
        id: `temp-${Date.now()}`, 
        number: importLessonNumber, 
        title: importLessonTitle, 
        description: `Học ${enriched.length} từ` 
      };
      
      const result = await saveCustomLesson(targetCategory, newLesson, enriched);
      if (result.success) {
        setShowImportModal(false);
        setImportText('');
        setImportLessonTitle('');
        handleSelectCategory(targetCategory);
        getGlobalStats().then(setStats);
      } else {
        // Hiển thị lỗi chi tiết để người dùng biết vấn đề nằm ở đâu (ví dụ: thiếu quyền RLS)
        alert(`Lỗi Database: ${result.message}\n\nHãy đảm bảo bạn đã tạo bảng 'lessons' và 'vocabulary' với các chính sách (RLS) cho phép Insert.`);
      }
    } else {
      alert("AI không nhận diện được từ vựng. Hãy kiểm tra lại định dạng nhập vào.");
    }
    setIsEnriching(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-10">
      <Header onHome={() => setMode(AppMode.HOME)} onReview={() => {}} />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {mode === AppMode.HOME && (
          <div className="animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Zhongwen Master</h1>
                <p className="text-slate-500 font-medium mt-2">Tổng: {stats.totalWords} từ / {stats.totalLessons} bài học</p>
              </div>
              <button 
                onClick={() => setShowImportModal(true)} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
              >
                + Thêm bài mới
              </button>
            </div>
            
            <section className="mb-16">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-indigo-600 rounded-full"></span> Lộ trình HSK
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                {HSK_CATEGORIES.map(cat => (
                  <CategoryCard key={cat.id} category={cat} onClick={handleSelectCategory} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-pink-500 rounded-full"></span> Chủ đề học tập
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                {TOPIC_CATEGORIES.map(cat => (
                  <CategoryCard key={cat.id} category={cat} onClick={handleSelectCategory} />
                ))}
              </div>
            </section>
          </div>
        )}

        {mode === AppMode.LESSON_SELECT && (
          <div className="animate-in slide-in-from-right-10 duration-300">
            <div className="flex items-center gap-6 mb-12">
              <button onClick={() => setMode(AppMode.HOME)} className="p-4 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-colors border border-slate-100">← Quay lại</button>
              <div>
                <h2 className="text-3xl font-black">{selectedCategory?.name}</h2>
                <p className="text-slate-400 font-bold">Danh sách bài học</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {lessons.map(l => (
                <button 
                  key={l.id} 
                  onClick={() => { setSelectedLesson(l); setMode(AppMode.STUDY_MODE_SELECT); }} 
                  className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 hover:border-indigo-500 text-left transition-all group shadow-sm hover:shadow-xl"
                >
                  <div className="text-indigo-600 font-black text-sm uppercase mb-2 tracking-widest">BÀI {l.number}</div>
                  <div className="text-2xl font-black group-hover:text-indigo-600 transition-colors">{l.title}</div>
                  <div className="mt-4 text-slate-400 font-medium">{l.description}</div>
                </button>
              ))}
              {lessons.length === 0 && (
                <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                  <p className="text-2xl font-bold text-slate-300 italic">Chưa có bài học nào.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === AppMode.STUDY_MODE_SELECT && (
          <div className="max-w-2xl mx-auto py-20 text-center animate-in zoom-in duration-300">
            <h2 className="text-5xl font-black mb-16 tracking-tight">{selectedLesson?.title}</h2>
            <div className="grid grid-cols-1 gap-6">
              <button 
                onClick={async () => { setIsLoading(true); const v = await fetchVocabularyForLesson(selectedLesson!); setVocabList(v); setMode(AppMode.FLASHCARD); setIsLoading(false); }} 
                className="bg-white p-12 rounded-[3rem] border-2 border-slate-100 font-black text-3xl hover:border-indigo-600 transition-all shadow-sm hover:shadow-xl flex items-center justify-center gap-6"
              >
                <span className="text-5xl">📇</span> Thẻ ghi nhớ
              </button>
              <button 
                onClick={async () => { setIsLoading(true); const v = await fetchVocabularyForLesson(selectedLesson!); setVocabList(v); setMode(AppMode.REVIEW); setIsLoading(false); }} 
                className="bg-indigo-600 text-white p-12 rounded-[3rem] font-black text-3xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-6"
              >
                <span className="text-5xl">✍️</span> Kiểm tra chữ Hán
              </button>
            </div>
          </div>
        )}

        {mode === AppMode.FLASHCARD && <FlashcardStudy items={vocabList} onExit={() => setMode(AppMode.LESSON_SELECT)} onFinish={() => setMode(AppMode.LESSON_SELECT)} />}
        {mode === AppMode.REVIEW && <ReviewSession items={vocabList} onComplete={() => setMode(AppMode.HOME)} onExit={() => setMode(AppMode.LESSON_SELECT)} />}
        {mode === AppMode.LOADING && (
          <div className="flex flex-col items-center justify-center py-48">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-6 font-black text-slate-400 text-lg uppercase tracking-widest">Đang tải...</p>
          </div>
        )}
      </main>

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-8 sm:p-12 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
            <h3 className="text-4xl font-black mb-10 text-slate-900">Thiết lập bài học</h3>
            
            <div className="space-y-8">
              <div>
                <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 block">1. Cấp độ / Chủ đề học</label>
                <select 
                  value={modalLevel} 
                  onChange={e => setModalLevel(Number(e.target.value))} 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-indigo-600 text-xl outline-none focus:border-indigo-500 transition-all"
                >
                  <optgroup label="HSK">
                    {HSK_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                  </optgroup>
                  <optgroup label="Chủ đề">
                    {TOPIC_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                  </optgroup>
                </select>
              </div>
              
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-1">
                  <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 block">Số bài</label>
                  <input 
                    type="number" 
                    value={importLessonNumber} 
                    onChange={e => setImportLessonNumber(Number(e.target.value))} 
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center text-xl outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 block">Tên bài học</label>
                  <input 
                    type="text" 
                    value={importLessonTitle} 
                    onChange={e => setImportLessonTitle(e.target.value)} 
                    placeholder="Ví dụ: Động vật, Rau củ..." 
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 block">2. Danh sách chữ Hán (Mỗi từ 1 dòng)</label>
                <textarea 
                  value={importText} 
                  onChange={e => setImportText(e.target.value)} 
                  className="w-full h-48 p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-chinese text-4xl outline-none focus:border-indigo-500 resize-none shadow-inner" 
                  placeholder="你好&#10;谢谢&#10;..."
                ></textarea>
                <p className="mt-3 text-slate-400 font-bold text-sm italic">✨ AI sẽ tự động tạo bộ từ vựng đầy đủ cho bạn.</p>
              </div>
            </div>

            <div className="flex gap-4 mt-12">
              <button onClick={() => setShowImportModal(false)} className="flex-1 py-5 font-black text-slate-400 hover:text-slate-600 transition-colors text-lg">Hủy bỏ</button>
              <button 
                onClick={handleSmartImport} 
                disabled={isEnriching} 
                className="flex-[2] bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-4 text-xl"
              >
                {isEnriching ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    AI Đang xử lý...
                  </>
                ) : "Xác nhận tạo bài"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
