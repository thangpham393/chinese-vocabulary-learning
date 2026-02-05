
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
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

  // Tự động cập nhật STT khi thay đổi Level trong Modal
  useEffect(() => {
    if (showImportModal) {
      const cat = allCategories.find(c => c.level === modalLevel);
      if (cat) {
        fetchLessonsByCategory(cat).then(catLessons => {
          const maxNum = catLessons.reduce((max, l) => Math.max(max, l.number), 0);
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
      alert("Vui lòng nhập tiêu đề và danh sách từ.");
      return;
    }
    
    const targetCategory = allCategories.find(c => c.level === modalLevel);
    if (!targetCategory) return;

    setIsEnriching(true);
    try {
      const enriched = await enrichVocabularyWithAI(importText);
      if (enriched.length === 0) {
        alert("AI không nhận diện được từ vựng. Vui lòng thử lại.");
        setIsEnriching(false);
        return;
      }

      const newLesson: Lesson = { 
        id: `lesson-${Date.now()}`, 
        number: importLessonNumber, 
        title: importLessonTitle, 
        description: `Học ${enriched.length} từ` 
      };
      
      const success = await saveCustomLesson(targetCategory, newLesson, enriched);
      if (success) {
        setShowImportModal(false);
        setImportText('');
        setImportLessonTitle('');
        handleSelectCategory(targetCategory);
        getGlobalStats().then(setStats);
      } else {
        alert("Lỗi lưu dữ liệu. Hãy kiểm tra Console (F12) để xem chi tiết lỗi Database.");
      }
    } catch (err) {
      alert("Đã xảy ra lỗi trong quá trình xử lý.");
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      <Header onHome={() => setMode(AppMode.HOME)} onReview={() => {}} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {mode === AppMode.HOME && (
          <div className="animate-in fade-in">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="text-3xl font-black">Zhongwen Master</h1>
                <p className="text-slate-400 font-bold">Tổng: {stats.totalWords} từ / {stats.totalLessons} bài</p>
              </div>
              <button onClick={() => setShowImportModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all">+ Tạo bài mới</button>
            </div>
            
            <section className="mb-12">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2"><span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span> Lộ trình HSK</h2>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {HSK_CATEGORIES.map(cat => <CategoryCard key={cat.id} category={cat} onClick={handleSelectCategory} />)}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-black mb-6 flex items-center gap-2"><span className="w-1.5 h-6 bg-pink-500 rounded-full"></span> Chủ đề học tập</h2>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {TOPIC_CATEGORIES.map(cat => <CategoryCard key={cat.id} category={cat} onClick={handleSelectCategory} />)}
              </div>
            </section>
          </div>
        )}

        {mode === AppMode.LESSON_SELECT && (
          <div className="animate-in slide-in-from-right-10">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setMode(AppMode.HOME)} className="p-3 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors">← Quay lại</button>
              <h2 className="text-2xl font-black">{selectedCategory?.name}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {lessons.map(l => (
                <button key={l.id} onClick={() => { setSelectedLesson(l); setMode(AppMode.STUDY_MODE_SELECT); }} className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 hover:border-indigo-500 text-left transition-all group">
                  <div className="text-indigo-600 font-black text-xs uppercase mb-1 tracking-widest">Bài {l.number}</div>
                  <div className="text-2xl font-black group-hover:text-indigo-600 transition-colors">{l.title}</div>
                  <div className="mt-4 text-slate-400 text-sm font-medium">{l.description}</div>
                </button>
              ))}
              {lessons.length === 0 && <div className="col-span-full py-20 text-center font-bold text-slate-300 border-2 border-dashed rounded-3xl">Chưa có bài học nào trong mục này.</div>}
            </div>
          </div>
        )}

        {mode === AppMode.STUDY_MODE_SELECT && (
          <div className="max-w-xl mx-auto py-20 text-center animate-in zoom-in">
            <h2 className="text-4xl font-black mb-16">{selectedLesson?.title}</h2>
            <div className="grid grid-cols-1 gap-6">
              <button onClick={async () => { setIsLoading(true); const v = await fetchVocabularyForLesson(selectedLesson!); setVocabList(v); setMode(AppMode.FLASHCARD); setIsLoading(false); }} className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-50 font-black text-2xl hover:border-indigo-600 transition-all flex items-center justify-center gap-4">
                <span className="text-4xl">📇</span> Thẻ ghi nhớ
              </button>
              <button onClick={async () => { setIsLoading(true); const v = await fetchVocabularyForLesson(selectedLesson!); setVocabList(v); setMode(AppMode.REVIEW); setIsLoading(false); }} className="bg-indigo-600 text-white p-10 rounded-[2.5rem] font-black text-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-4">
                <span className="text-4xl">✍️</span> Kiểm tra chữ Hán
              </button>
            </div>
          </div>
        )}

        {mode === AppMode.FLASHCARD && <FlashcardStudy items={vocabList} onExit={() => setMode(AppMode.LESSON_SELECT)} onFinish={() => setMode(AppMode.LESSON_SELECT)} />}
        {mode === AppMode.REVIEW && <ReviewSession items={vocabList} onComplete={() => setMode(AppMode.HOME)} onExit={() => setMode(AppMode.LESSON_SELECT)} />}
        {mode === AppMode.LOADING && <div className="flex flex-col items-center justify-center py-40"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-4 font-bold text-slate-400">Đang tải dữ liệu...</p></div>}
      </main>

      <BottomNav currentMode={mode} onHome={() => setMode(AppMode.HOME)} onReview={() => {}} />

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 sm:p-10 shadow-2xl animate-in zoom-in overflow-y-auto max-h-[95vh]">
            <h3 className="text-3xl font-black mb-8">Thêm bài học mới</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Cột trái: Thông tin bài */}
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">1. Cấp độ / Chủ đề</label>
                  <select 
                    value={modalLevel} 
                    onChange={e => setModalLevel(Number(e.target.value))} 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-indigo-600 outline-none focus:border-indigo-500"
                  >
                    <optgroup label="HSK Levels">
                      {HSK_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                    </optgroup>
                    <optgroup label="Các chủ đề">
                      {TOPIC_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                    </optgroup>
                  </select>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-24">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">STT</label>
                    <input 
                      type="number" 
                      value={importLessonNumber} 
                      onChange={e => setImportLessonNumber(Number(e.target.value))} 
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Tiêu đề bài học</label>
                    <input 
                      type="text" 
                      value={importLessonTitle} 
                      onChange={e => setImportLessonTitle(e.target.value)} 
                      placeholder="Ví dụ: Động vật, Giao tiếp..." 
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <p className="text-sm text-slate-400 font-medium bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  💡 <b>Mẹo:</b> Hệ thống tự động gợi ý số thứ tự tiếp theo cho mỗi cấp độ bạn chọn.
                </p>
              </div>

              {/* Cột phải: Nhập từ vựng */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">2. Danh sách chữ Hán (Mỗi từ 1 dòng)</label>
                <textarea 
                  value={importText} 
                  onChange={e => setImportText(e.target.value)} 
                  className="w-full h-full min-h-[250px] p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-chinese text-3xl outline-none focus:border-indigo-500 resize-none shadow-inner" 
                  placeholder="你好&#10;谢谢&#10;..."
                ></textarea>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowImportModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">Hủy bỏ</button>
              <button 
                onClick={handleSmartImport} 
                disabled={isEnriching} 
                className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
              >
                {isEnriching ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    AI đang xử lý...
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
