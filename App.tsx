
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

  // Tự động nhảy số bài học khi chọn level
  useEffect(() => {
    const cat = allCategories.find(c => c.level === modalLevel);
    if (cat && showImportModal) {
      fetchLessonsByCategory(cat).then(catLessons => {
        const maxNum = catLessons.reduce((max, l) => Math.max(max, l.number), 0);
        setImportLessonNumber(maxNum + 1);
      });
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
    if (!importText.trim() || !importLessonTitle.trim()) return;
    const targetCategory = allCategories.find(c => c.level === modalLevel);
    if (!targetCategory) return;

    setIsEnriching(true);
    const enriched = await enrichVocabularyWithAI(importText);
    if (enriched.length > 0) {
      const newLesson: Lesson = { 
        id: `lesson-${Date.now()}`, number: importLessonNumber, 
        title: importLessonTitle, description: `Học ${enriched.length} từ` 
      };
      const success = await saveCustomLesson(targetCategory, newLesson, enriched);
      if (success) {
        setShowImportModal(false);
        handleSelectCategory(targetCategory);
      } else {
        alert("Lỗi lưu dữ liệu. Vui lòng kiểm tra lại Database.");
      }
    }
    setIsEnriching(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      <Header onHome={() => setMode(AppMode.HOME)} onReview={() => {}} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {mode === AppMode.HOME && (
          <div className="animate-in fade-in">
            <div className="flex justify-between items-center mb-10">
              <h1 className="text-3xl font-black">Zhongwen Master</h1>
              <button onClick={() => setShowImportModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg">+ Tạo bài học</button>
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
          <div>
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setMode(AppMode.HOME)} className="p-2 bg-white rounded-full shadow-sm">←</button>
              <h2 className="text-2xl font-black">{selectedCategory?.name}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {lessons.map(l => (
                <button key={l.id} onClick={() => { setSelectedLesson(l); setMode(AppMode.STUDY_MODE_SELECT); }} className="bg-white p-6 rounded-3xl border-2 border-slate-50 hover:border-indigo-500 text-left transition-all">
                  <div className="text-indigo-600 font-bold text-xs uppercase mb-1">Bài {l.number}</div>
                  <div className="text-xl font-black">{l.title}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === AppMode.STUDY_MODE_SELECT && (
          <div className="max-w-md mx-auto py-20 text-center">
            <h2 className="text-3xl font-black mb-10">{selectedLesson?.title}</h2>
            <div className="grid gap-4">
              <button onClick={async () => { setIsLoading(true); const v = await fetchVocabularyForLesson(selectedLesson!); setVocabList(v); setMode(AppMode.FLASHCARD); setIsLoading(false); }} className="bg-white p-8 rounded-3xl border-2 font-bold text-xl hover:bg-indigo-50">📇 Thẻ ghi nhớ</button>
              <button onClick={async () => { setIsLoading(true); const v = await fetchVocabularyForLesson(selectedLesson!); setVocabList(v); setMode(AppMode.REVIEW); setIsLoading(false); }} className="bg-indigo-600 text-white p-8 rounded-3xl font-bold text-xl">✍️ Kiểm tra</button>
            </div>
          </div>
        )}

        {mode === AppMode.FLASHCARD && <FlashcardStudy items={vocabList} onExit={() => setMode(AppMode.LESSON_SELECT)} onFinish={() => setMode(AppMode.LESSON_SELECT)} />}
        {mode === AppMode.REVIEW && <ReviewSession items={vocabList} onComplete={() => setMode(AppMode.HOME)} onExit={() => setMode(AppMode.LESSON_SELECT)} />}
        {mode === AppMode.LOADING && <div className="flex justify-center py-40"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}
      </main>

      <BottomNav currentMode={mode} onHome={() => setMode(AppMode.HOME)} onReview={() => {}} />

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in">
            <h3 className="text-2xl font-black mb-6">Thêm bài học mới</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Cấp độ / Chủ đề</label>
                <select value={modalLevel} onChange={e => setModalLevel(Number(e.target.value))} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold mt-1">
                  <optgroup label="HSK">
                    {HSK_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                  </optgroup>
                  <optgroup label="Chủ đề">
                    {TOPIC_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="w-20">
                  <label className="text-xs font-bold text-slate-400 uppercase">Bài số</label>
                  <input type="number" value={importLessonNumber} onChange={e => setImportLessonNumber(Number(e.target.value))} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold mt-1 text-center" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Tiêu đề bài học</label>
                  <input type="text" value={importLessonTitle} onChange={e => setImportLessonTitle(e.target.value)} placeholder="Ví dụ: Động vật" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Danh sách chữ Hán (mỗi từ 1 dòng)</label>
                <textarea value={importText} onChange={e => setImportText(e.target.value)} className="w-full h-40 p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-chinese text-2xl mt-1 resize-none" placeholder="爸爸&#10;妈妈"></textarea>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowImportModal(false)} className="flex-1 font-bold text-slate-400">Hủy</button>
              <button onClick={handleSmartImport} disabled={isEnriching} className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-black shadow-lg shadow-indigo-100 disabled:opacity-50">
                {isEnriching ? "Đang xử lý bằng AI..." : "Tạo bài học"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
