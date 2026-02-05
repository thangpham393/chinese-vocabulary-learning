
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import CategoryCard from './components/CategoryCard';
import ReviewSession from './components/ReviewSession';
import FlashcardStudy from './components/FlashcardStudy';
import ListeningPractice from './components/ListeningPractice';
import { HSK_CATEGORIES, TOPIC_CATEGORIES } from './constants';
import { Category, VocabularyItem, Lesson, AppMode, CategoryType } from './types';
import { fetchLessonsByCategory, fetchVocabularyForLesson, enrichVocabularyWithAI, saveCustomLesson, getGlobalStats } from './services/geminiService';

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
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importLessonTitle, setImportLessonTitle] = useState('');

  useEffect(() => {
    getGlobalStats().then(setStats);
  }, [mode]);

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

  const startStudy = async (studyMode: 'FLASHCARD' | 'REVIEW') => {
    if (vocabList.length > 0) {
      setMode(studyMode === 'FLASHCARD' ? AppMode.FLASHCARD : AppMode.REVIEW);
      return;
    }
    if (!selectedLesson) return;
    setIsLoading(true);
    setMode(AppMode.LOADING);
    const items = await fetchVocabularyForLesson(selectedLesson);
    setVocabList(items);
    setMode(studyMode === 'FLASHCARD' ? AppMode.FLASHCARD : AppMode.REVIEW);
    setIsLoading(false);
  };

  const handleStartListeningPractice = async (category: Category) => {
    setIsLoading(true);
    setMode(AppMode.LOADING);
    const lessonsForCat = await fetchLessonsByCategory(category);
    let allVocab: VocabularyItem[] = [];
    for (const lesson of lessonsForCat) {
      const vocab = await fetchVocabularyForLesson(lesson);
      allVocab = [...allVocab, ...vocab];
    }
    setVocabList(allVocab);
    setSelectedCategory(category);
    setMode(AppMode.LISTENING_PRACTICE);
    setIsLoading(false);
  };

  const handleSmartImport = async () => {
    if (!importText.trim() || !importLessonTitle.trim() || !selectedCategory) return;
    setIsEnriching(true);
    const enrichedVocab = await enrichVocabularyWithAI(importText);
    if (enrichedVocab.length > 0) {
      const lessonId = editingLessonId || `lesson-${Date.now()}`;
      const newLesson: Lesson = { id: lessonId, number: lessons.length + 1, title: importLessonTitle, description: `Học ${enrichedVocab.length} từ mới` };
      const success = await saveCustomLesson(selectedCategory, newLesson, enrichedVocab);
      if (success) {
        await refreshLessons(selectedCategory);
        setVocabList(enrichedVocab);
        setSelectedLesson(newLesson);
        setMode(AppMode.STUDY_MODE_SELECT);
        setShowImportModal(false);
      }
    }
    setIsEnriching(false);
  };

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20 md:pb-0">
      <Header 
        onHome={() => setMode(AppMode.HOME)} 
        onReview={() => setMode(AppMode.LISTENING_PRACTICE_SELECT)} 
      />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-10">
        {mode === AppMode.HOME && (
          <div className="animate-in fade-in duration-700">
            <div className="flex flex-col lg:flex-row gap-10 mb-12 sm:mb-20 items-center">
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-4xl sm:text-6xl font-black text-gray-900 mb-6 leading-tight">
                  Làm chủ Tiếng Trung <br/><span className="text-indigo-600 italic">với Sức mạnh AI</span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-500 mb-10 max-w-xl mx-auto lg:mx-0">Học từ vựng qua hình ảnh AI, luyện nghe với giọng đọc tự nhiên và lưu trữ không giới hạn trên Cloud.</p>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 min-w-[100px]">
                    <div className="text-xl sm:text-2xl font-black text-indigo-600">{stats.totalWords}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Từ vựng</div>
                  </div>
                  <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 min-w-[100px]">
                    <div className="text-xl sm:text-2xl font-black text-indigo-600">{stats.totalLessons}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Bài học</div>
                  </div>
                </div>
              </div>
              <div className="hidden lg:grid flex-1 grid-cols-2 gap-4">
                <div className="bg-indigo-600 rounded-[3rem] p-8 text-white flex flex-col justify-between h-64 shadow-2xl shadow-indigo-200">
                  <div className="text-4xl">🚀</div>
                  <div>
                    <div className="font-black text-2xl text-white">Bắt đầu ngay</div>
                    <div className="text-indigo-100 text-sm">Chọn một cấp độ HSK</div>
                  </div>
                </div>
                <div className="bg-white rounded-[3rem] p-8 border-2 border-slate-50 flex flex-col justify-between h-64">
                  <div className="text-4xl">📚</div>
                  <div>
                    <div className="font-black text-2xl">Thư viện</div>
                    <div className="text-slate-400 text-sm">Xem lại từ đã học</div>
                  </div>
                </div>
              </div>
            </div>

            <section className="mb-12 sm:mb-20">
              <h2 className="text-2xl sm:text-3xl font-black mb-8 flex items-center">
                <span className="w-1.5 sm:w-2 h-6 sm:h-8 bg-indigo-600 rounded-full mr-3 sm:mr-4"></span> Lộ trình HSK
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                {HSK_CATEGORIES.map(cat => <CategoryCard key={cat.id} category={cat} onClick={handleSelectCategory} />)}
              </div>
            </section>

            <section>
              <h2 className="text-2xl sm:text-3xl font-black mb-8 flex items-center">
                <span className="w-1.5 sm:w-2 h-6 sm:h-8 bg-pink-500 rounded-full mr-3 sm:mr-4"></span> Chủ đề phổ biến
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                {/* Fixed: Use TOPIC_CATEGORIES instead of TOP_CATEGORIES */}
                {TOPIC_CATEGORIES.map(cat => <CategoryCard key={cat.id} category={cat} onClick={handleSelectCategory} />)}
              </div>
            </section>
          </div>
        )}

        {mode === AppMode.LISTENING_PRACTICE_SELECT && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
             <div className="text-center mb-12">
               <h2 className="text-4xl font-black mb-4">Luyện Nghe Thông Minh</h2>
               <p className="text-slate-400">Chọn một cấp độ để bắt đầu thử thách nghe hiểu</p>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {HSK_CATEGORIES.map(cat => (
                  <CategoryCard key={cat.id} category={cat} onClick={handleStartListeningPractice} />
                ))}
             </div>
          </div>
        )}

        {mode === AppMode.LESSON_SELECT && (
          <div className="animate-in slide-in-from-right-10 duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
               <div className="flex items-center gap-4">
                 <button onClick={() => setMode(AppMode.HOME)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
                 </button>
                 <h2 className="text-3xl sm:text-4xl font-black">{selectedCategory?.name}</h2>
               </div>
               <div className="flex w-full md:w-auto gap-4">
                 <div className="relative flex-1 md:w-64">
                   <input 
                    type="text" 
                    placeholder="Tìm bài học..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-medium"
                   />
                   <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                 </div>
                 <button onClick={() => setShowImportModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all">+ Thêm</button>
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
               {filteredLessons.map(lesson => (
                 <button key={lesson.id} onClick={() => handleSelectLesson(lesson)} className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-50 hover:border-indigo-500 hover:shadow-xl transition-all text-left group">
                    <div className="text-indigo-600 font-black text-xs sm:text-sm mb-2">BÀI {lesson.number}</div>
                    <h3 className="text-xl sm:text-2xl font-black mb-2 group-hover:text-indigo-600 transition-colors">{lesson.title}</h3>
                    <p className="text-slate-400 text-sm sm:text-base">{lesson.description}</p>
                 </button>
               ))}
               {filteredLessons.length === 0 && (
                 <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                    Chưa có bài học nào trong danh mục này.
                 </div>
               )}
             </div>
          </div>
        )}

        {mode === AppMode.STUDY_MODE_SELECT && (
          <div className="max-w-3xl mx-auto text-center py-10 sm:py-20 animate-in zoom-in">
            <h2 className="text-3xl sm:text-5xl font-black mb-4">{selectedLesson?.title}</h2>
            <p className="text-lg sm:text-xl text-slate-400 mb-10 sm:text-16 sm:mb-16">Bắt đầu hành trình chinh phục từ vựng của bạn</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 px-4 sm:px-0">
               <button onClick={() => startStudy('FLASHCARD')} className="bg-white p-10 sm:p-16 rounded-[2.5rem] sm:rounded-[3rem] border-2 border-slate-50 hover:border-indigo-600 hover:shadow-2xl transition-all group">
                 <div className="text-6xl sm:text-7xl mb-6 group-hover:scale-110 transition-transform">📇</div>
                 <div className="text-xl sm:text-2xl font-black">Thẻ nhớ</div>
               </button>
               <button onClick={() => startStudy('REVIEW')} className="bg-white p-10 sm:p-16 rounded-[2.5rem] sm:rounded-[3rem] border-2 border-slate-50 hover:border-indigo-600 hover:shadow-2xl transition-all group">
                 <div className="text-6xl sm:text-7xl mb-6 group-hover:scale-110 transition-transform">✍️</div>
                 <div className="text-xl sm:text-2xl font-black">Kiểm tra</div>
               </button>
            </div>
            <button onClick={() => setMode(AppMode.LESSON_SELECT)} className="mt-12 text-slate-400 font-bold hover:text-indigo-600">Quay lại danh sách bài học</button>
          </div>
        )}

        {mode === AppMode.FLASHCARD && <FlashcardStudy items={vocabList} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} onFinish={() => setMode(AppMode.STUDY_MODE_SELECT)} />}
        {mode === AppMode.REVIEW && <ReviewSession items={vocabList} onComplete={() => setMode(AppMode.HOME)} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} />}
        {mode === AppMode.LISTENING_PRACTICE && <ListeningPractice level={selectedCategory?.level || 0} allVocab={vocabList} onExit={() => setMode(AppMode.LISTENING_PRACTICE_SELECT)} />}
        {mode === AppMode.LOADING && <div className="flex flex-col items-center justify-center py-40"><div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-slate-400 font-bold">Đang tải dữ liệu...</p></div>}
      </main>

      <BottomNav 
        currentMode={mode} 
        onHome={() => setMode(AppMode.HOME)} 
        onReview={() => setMode(AppMode.LISTENING_PRACTICE_SELECT)} 
      />

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-xl p-6 sm:p-10 shadow-2xl animate-in zoom-in">
            <h3 className="text-2xl sm:text-3xl font-black mb-6 sm:mb-8">Thêm bài học mới</h3>
            <input type="text" placeholder="Tên bài học" value={importLessonTitle} onChange={(e) => setImportLessonTitle(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 focus:border-indigo-500 outline-none font-bold text-sm sm:text-base"/>
            <textarea placeholder="Nhập danh sách chữ Hán (mỗi từ một dòng)..." value={importText} onChange={(e) => setImportText(e.target.value)} className="w-full h-32 sm:h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl mb-6 sm:mb-8 focus:border-indigo-500 outline-none font-chinese text-xl sm:text-2xl resize-none"/>
            <div className="flex gap-4">
              <button onClick={() => setShowImportModal(false)} className="flex-1 py-4 font-bold text-slate-400 text-sm sm:text-base">Hủy</button>
              <button onClick={handleSmartImport} disabled={isEnriching} className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl sm:rounded-2xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-50 text-sm sm:text-base">{isEnriching ? 'AI đang xử lý...' : 'Xác nhận'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
