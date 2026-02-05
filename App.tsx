
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import CategoryCard from './components/CategoryCard';
import ReviewSession from './components/ReviewSession';
import FlashcardStudy from './components/FlashcardStudy';
import ListeningPractice from './components/ListeningPractice';
import { HSK_CATEGORIES, TOPIC_CATEGORIES } from './constants';
import { Category, VocabularyItem, Lesson, AppMode } from './types';
import { fetchLessonsByCategory, fetchVocabularyForLesson, enrichVocabularyWithAI, saveCustomLesson, getGlobalStats, deleteCustomLesson } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [vocabList, setVocabList] = useState<VocabularyItem[]>([]);
  const [stats, setStats] = useState({ totalWords: 0, totalLessons: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Modal states
  const [importText, setImportText] = useState('');
  const [importLessonTitle, setImportLessonTitle] = useState('');
  const [importLessonNumber, setImportLessonNumber] = useState<number>(1);
  const [modalCategoryId, setModalCategoryId] = useState<string>('hsk1');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const allCategories = useMemo(() => [...HSK_CATEGORIES, ...TOPIC_CATEGORIES], []);

  useEffect(() => {
    getGlobalStats().then(setStats);
  }, [mode]);

  // Tự động cập nhật số thứ tự khi đổi category trong modal
  useEffect(() => {
    if (!editingLessonId) {
      const cat = allCategories.find(c => c.id === modalCategoryId);
      if (cat) {
        fetchLessonsByCategory(cat).then(catLessons => {
          const maxNum = catLessons.reduce((max, l) => Math.max(max, l.number), 0);
          setImportLessonNumber(maxNum + 1);
        });
      }
    }
  }, [modalCategoryId, editingLessonId, allCategories]);

  const refreshLessons = async (category: Category) => {
    const data = await fetchLessonsByCategory(category);
    setLessons(data);
  };

  const handleSelectCategory = async (category: Category) => {
    setSelectedCategory(category);
    setIsLoading(true);
    setMode(AppMode.LOADING);
    await refreshLessons(category);
    setMode(AppMode.LESSON_SELECT);
    setIsLoading(false);
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setVocabList([]); 
    setMode(AppMode.STUDY_MODE_SELECT);
  };

  const handleEditLesson = async (e: React.MouseEvent, lesson: Lesson) => {
    e.stopPropagation();
    setIsLoading(true);
    const items = await fetchVocabularyForLesson(lesson);
    setImportText(items.map(v => v.word).join('\n'));
    setImportLessonTitle(lesson.title);
    setImportLessonNumber(lesson.number);
    setEditingLessonId(lesson.id);
    if (selectedCategory) setModalCategoryId(selectedCategory.id);
    setShowImportModal(true);
    setIsLoading(false);
  };

  const handleOpenAddModal = () => {
    setEditingLessonId(null);
    setImportText('');
    setImportLessonTitle('');
    if (selectedCategory) setModalCategoryId(selectedCategory.id);
    setShowImportModal(true);
  };

  const handleSmartImport = async () => {
    if (!importText.trim() || !importLessonTitle.trim()) {
      alert("Vui lòng nhập tiêu đề và danh sách từ vựng.");
      return;
    }
    
    const targetCategory = allCategories.find(c => c.id === modalCategoryId);
    if (!targetCategory) return;

    setIsEnriching(true);
    try {
      const enrichedVocab = await enrichVocabularyWithAI(importText);
      if (enrichedVocab.length === 0) {
        alert("AI không nhận diện được từ. Hãy thử lại.");
        return;
      }

      const lessonId = editingLessonId || `lesson-${Date.now()}`;
      const newLesson: Lesson = { 
        id: lessonId, 
        number: importLessonNumber, 
        title: importLessonTitle, 
        description: `Gồm ${enrichedVocab.length} từ vựng` 
      };
      
      const success = await saveCustomLesson(targetCategory, newLesson, enrichedVocab);
      if (success) {
        setShowImportModal(false);
        handleSelectCategory(targetCategory);
      } else {
        alert("Không thể lưu bài học. Hãy kiểm tra console để biết chi tiết.");
      }
    } catch (err) {
      alert("Đã xảy ra lỗi hệ thống.");
    } finally {
      setIsEnriching(false);
    }
  };

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20 md:pb-0">
      <Header onHome={() => setMode(AppMode.HOME)} onReview={() => setMode(AppMode.LISTENING_PRACTICE_SELECT)} />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-10">
        {mode === AppMode.HOME && (
          <div className="animate-in fade-in duration-700">
            <div className="flex flex-col lg:flex-row gap-10 mb-12 items-center">
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-4xl sm:text-6xl font-black text-gray-900 mb-6 leading-tight">
                  Làm chủ Tiếng Trung <br/><span className="text-indigo-600 italic">với AI thông minh</span>
                </h1>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start items-center mb-10">
                  <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-2xl font-black text-indigo-600">{stats.totalWords}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Từ vựng</div>
                  </div>
                  <button onClick={handleOpenAddModal} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all">+ Tạo bài học</button>
                </div>
              </div>
            </div>

            <section className="mb-12">
              <h2 className="text-2xl font-black mb-8">Lộ trình HSK</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {HSK_CATEGORIES.map(cat => <CategoryCard key={cat.id} category={cat} onClick={handleSelectCategory} />)}
              </div>
            </section>
            
            <section>
              <h2 className="text-2xl font-black mb-8">Chủ đề</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {TOPIC_CATEGORIES.map(cat => <CategoryCard key={cat.id} category={cat} onClick={handleSelectCategory} />)}
              </div>
            </section>
          </div>
        )}

        {mode === AppMode.LESSON_SELECT && (
          <div className="animate-in slide-in-from-right-10 duration-500">
             <div className="flex justify-between items-center mb-10">
               <h2 className="text-3xl font-black">{selectedCategory?.name}</h2>
               <button onClick={handleOpenAddModal} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold">+ Thêm bài</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredLessons.map(lesson => (
                 <div key={lesson.id} className="group relative">
                    <button onClick={() => handleSelectLesson(lesson)} className="w-full bg-white p-8 rounded-[2rem] border-2 border-slate-50 hover:border-indigo-500 transition-all text-left">
                        <div className="text-indigo-600 font-black text-xs mb-2 uppercase tracking-widest">Bài {lesson.number}</div>
                        <h3 className="text-2xl font-black mb-1">{lesson.title}</h3>
                        <p className="text-slate-400 text-sm">{lesson.description}</p>
                    </button>
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleEditLesson(e, lesson)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {mode === AppMode.STUDY_MODE_SELECT && (
          <div className="max-w-2xl mx-auto text-center py-20 animate-in zoom-in">
            <h2 className="text-4xl font-black mb-16">{selectedLesson?.title}</h2>
            <div className="grid grid-cols-2 gap-8">
               <button onClick={() => { setIsLoading(true); fetchVocabularyForLesson(selectedLesson!).then(v => { setVocabList(v); setMode(AppMode.FLASHCARD); setIsLoading(false); }); }} className="bg-white p-12 rounded-[3rem] border-2 border-slate-50 hover:border-indigo-600 transition-all">
                 <div className="text-6xl mb-6">📇</div>
                 <div className="text-xl font-black">Thẻ nhớ</div>
               </button>
               <button onClick={() => { setIsLoading(true); fetchVocabularyForLesson(selectedLesson!).then(v => { setVocabList(v); setMode(AppMode.REVIEW); setIsLoading(false); }); }} className="bg-white p-12 rounded-[3rem] border-2 border-slate-50 hover:border-indigo-600 transition-all">
                 <div className="text-6xl mb-6">✍️</div>
                 <div className="text-xl font-black">Kiểm tra</div>
               </button>
            </div>
          </div>
        )}

        {mode === AppMode.FLASHCARD && <FlashcardStudy items={vocabList} onExit={() => setMode(AppMode.LESSON_SELECT)} onFinish={() => setMode(AppMode.LESSON_SELECT)} />}
        {mode === AppMode.REVIEW && <ReviewSession items={vocabList} onComplete={() => setMode(AppMode.HOME)} onExit={() => setMode(AppMode.LESSON_SELECT)} />}
        {mode === AppMode.LOADING && <div className="flex flex-col items-center justify-center py-40"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}
      </main>

      <BottomNav currentMode={mode} onHome={() => setMode(AppMode.HOME)} onReview={() => setMode(AppMode.LISTENING_PRACTICE_SELECT)} />

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 sm:p-10 shadow-2xl animate-in zoom-in overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black mb-8">{editingLessonId ? 'Cập nhật bài học' : 'Tạo bài học mới'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">1. Chọn Cấp độ / Chủ đề</label>
                  <div className="grid grid-cols-3 gap-2">
                    {allCategories.map(cat => (
                      <button key={cat.id} onClick={() => setModalCategoryId(cat.id)} className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${modalCategoryId === cat.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-50 bg-slate-50'}`}>
                        <span className="text-xl">{cat.icon}</span>
                        <span className="text-[10px] font-bold truncate w-full text-center">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-24">
                    <label className="block text-xs font-black text-slate-400 uppercase mb-2">STT</label>
                    <input type="number" value={importLessonNumber} onChange={(e) => setImportLessonNumber(Number(e.target.value))} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-center"/>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-black text-slate-400 uppercase mb-2">Tên bài học</label>
                    <input type="text" placeholder="Ví dụ: Động vật" value={importLessonTitle} onChange={(e) => setImportLessonTitle(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold"/>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">2. Nhập từ vựng (Chữ Hán)</label>
                <textarea placeholder="Mỗi dòng một từ..." value={importText} onChange={(e) => setImportText(e.target.value)} className="w-full h-full min-h-[250px] p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-chinese text-3xl resize-none shadow-inner"/>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowImportModal(false)} className="flex-1 py-4 font-bold text-slate-400">Hủy bỏ</button>
              <button onClick={handleSmartImport} disabled={isEnriching} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-50">
                {isEnriching ? 'Đang xử lý...' : editingLessonId ? 'Cập nhật' : 'Xác nhận tạo bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
