
import React, { useState, useEffect } from 'react';
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
  const [importText, setImportText] = useState('');
  const [importLessonTitle, setImportLessonTitle] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  
  const [modalCategoryId, setModalCategoryId] = useState<string>('hsk1');

  const allCategories = [...HSK_CATEGORIES, ...TOPIC_CATEGORIES];

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

  const handleEditLesson = async (e: React.MouseEvent, lesson: Lesson) => {
    e.stopPropagation();
    setIsLoading(true);
    const items = await fetchVocabularyForLesson(lesson);
    const text = items.map(v => v.word).join('\n');
    setImportText(text);
    setImportLessonTitle(lesson.title);
    setEditingLessonId(lesson.id);
    if (selectedCategory) setModalCategoryId(selectedCategory.id);
    setShowImportModal(true);
    setIsLoading(false);
  };

  const handleDeleteLesson = async (e: React.MouseEvent, lessonId: string) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài học này?")) return;
    const success = await deleteCustomLesson(lessonId);
    if (success && selectedCategory) {
      await refreshLessons(selectedCategory);
      getGlobalStats().then(setStats);
    }
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
      alert("Vui lòng nhập đầy đủ tiêu đề và danh sách từ vựng.");
      return;
    }
    
    const targetCategory = allCategories.find(c => c.id === modalCategoryId);
    if (!targetCategory) return;

    setIsEnriching(true);
    try {
      const enrichedVocab = await enrichVocabularyWithAI(importText);
      if (enrichedVocab.length === 0) {
        alert("AI không thể nhận diện được từ vựng. Vui lòng thử lại với danh sách chữ Hán rõ ràng hơn.");
        setIsEnriching(false);
        return;
      }

      const lessonId = editingLessonId || `lesson-${Date.now()}`;
      const existingLesson = lessons.find(l => l.id === lessonId);
      const newLesson: Lesson = { 
        id: lessonId, 
        number: existingLesson?.number || (lessons.length + 1), 
        title: importLessonTitle, 
        description: `Học ${enrichedVocab.length} từ mới` 
      };
      
      const success = await saveCustomLesson(targetCategory, newLesson, enrichedVocab);
      if (success) {
        if (selectedCategory?.id === targetCategory.id) {
          await refreshLessons(targetCategory);
          setVocabList(enrichedVocab);
          setSelectedLesson(newLesson);
          setMode(AppMode.STUDY_MODE_SELECT);
        } else {
          handleSelectCategory(targetCategory);
        }
        setShowImportModal(false);
      } else {
        alert("Lỗi khi lưu vào Database. Vui lòng kiểm tra console hoặc thử lại sau.");
      }
    } catch (err) {
      alert("Đã có lỗi xảy ra trong quá trình xử lý.");
    } finally {
      setIsEnriching(false);
    }
  };

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.description.toLowerCase().includes(searchTerm.toLowerCase())
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
                  Làm chủ Tiếng Trung <br/><span className="text-indigo-600 italic">với Sức mạnh AI</span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-500 mb-10 max-w-xl mx-auto lg:mx-0">Học từ vựng qua hình ảnh AI, luyện nghe với giọng đọc tự nhiên.</p>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start items-center">
                  <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-2xl font-black text-indigo-600">{stats.totalWords}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Từ vựng</div>
                  </div>
                  <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-2xl font-black text-indigo-600">{stats.totalLessons}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Bài học</div>
                  </div>
                  <button 
                    onClick={handleOpenAddModal}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    <span className="text-2xl">+</span> Tạo bài học mới
                  </button>
                </div>
              </div>
              <div className="hidden lg:grid flex-1 grid-cols-2 gap-4">
                <div className="bg-indigo-600 rounded-[3rem] p-8 text-white flex flex-col justify-between h-64 shadow-2xl shadow-indigo-200">
                  <div className="text-4xl">🚀</div>
                  <div className="font-black text-2xl">Bắt đầu ngay</div>
                </div>
                <div className="bg-white rounded-[3rem] p-8 border-2 border-slate-50 flex flex-col justify-between h-64">
                  <div className="text-4xl">📚</div>
                  <div className="font-black text-2xl">Thư viện</div>
                </div>
              </div>
            </div>

            <section className="mb-12">
              <h2 className="text-2xl sm:text-3xl font-black mb-8 flex items-center">
                <span className="w-2 h-8 bg-indigo-600 rounded-full mr-4"></span> Lộ trình HSK
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                {HSK_CATEGORIES.map(cat => <CategoryCard key={cat.id} category={cat} onClick={handleSelectCategory} />)}
              </div>
            </section>

            <section>
              <h2 className="text-2xl sm:text-3xl font-black mb-8 flex items-center">
                <span className="w-2 h-8 bg-pink-500 rounded-full mr-4"></span> Chủ đề phổ biến
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                {TOPIC_CATEGORIES.map(cat => <CategoryCard key={cat.id} category={cat} onClick={handleSelectCategory} />)}
              </div>
            </section>
          </div>
        )}

        {mode === AppMode.LISTENING_PRACTICE_SELECT && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
             <div className="text-center mb-12">
               <h2 className="text-4xl font-black mb-4">Luyện Nghe Thông Minh</h2>
               <p className="text-slate-400">Chọn một cấp độ để bắt đầu thử thách</p>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {HSK_CATEGORIES.map(cat => <CategoryCard key={cat.id} category={cat} onClick={handleStartListeningPractice} />)}
             </div>
          </div>
        )}

        {mode === AppMode.LESSON_SELECT && (
          <div className="animate-in slide-in-from-right-10 duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
               <div className="flex items-center gap-4">
                 <button onClick={() => setMode(AppMode.HOME)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
                 </button>
                 <h2 className="text-3xl sm:text-4xl font-black">{selectedCategory?.name}</h2>
               </div>
               <div className="flex w-full md:w-auto gap-4">
                 <input 
                    type="text" placeholder="Tìm bài học..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 md:w-64 px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none"
                 />
                 <button onClick={handleOpenAddModal} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">+ Thêm</button>
               </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
               {filteredLessons.map(lesson => (
                 <div key={lesson.id} className="group relative">
                    <button onClick={() => handleSelectLesson(lesson)} className="w-full bg-white p-8 rounded-[2rem] border-2 border-slate-50 hover:border-indigo-500 hover:shadow-xl transition-all text-left">
                        <div className="text-indigo-600 font-black text-sm mb-2">BÀI {lesson.number}</div>
                        <h3 className="text-2xl font-black mb-2">{lesson.title}</h3>
                        <p className="text-slate-400">{lesson.description}</p>
                    </button>
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleEditLesson(e, lesson)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Sửa bài học">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button onClick={(e) => handleDeleteLesson(e, lesson.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors" title="Xóa bài học">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                 </div>
               ))}
               {filteredLessons.length === 0 && (
                 <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 text-slate-400 font-bold">
                    Không tìm thấy bài học nào.
                 </div>
               )}
             </div>
          </div>
        )}

        {mode === AppMode.STUDY_MODE_SELECT && (
          <div className="max-w-3xl mx-auto text-center py-10 sm:py-20 animate-in zoom-in">
            <h2 className="text-3xl sm:text-5xl font-black mb-4">{selectedLesson?.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-16">
               <button onClick={() => startStudy('FLASHCARD')} className="bg-white p-12 rounded-[3rem] border-2 border-slate-50 hover:border-indigo-600 transition-all">
                 <div className="text-7xl mb-6">📇</div>
                 <div className="text-2xl font-black">Thẻ nhớ</div>
               </button>
               <button onClick={() => startStudy('REVIEW')} className="bg-white p-12 rounded-[3rem] border-2 border-slate-50 hover:border-indigo-600 transition-all">
                 <div className="text-7xl mb-6">✍️</div>
                 <div className="text-2xl font-black">Kiểm tra</div>
               </button>
            </div>
          </div>
        )}

        {mode === AppMode.FLASHCARD && <FlashcardStudy items={vocabList} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} onFinish={() => setMode(AppMode.STUDY_MODE_SELECT)} />}
        {mode === AppMode.REVIEW && <ReviewSession items={vocabList} onComplete={() => setMode(AppMode.HOME)} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} />}
        {mode === AppMode.LISTENING_PRACTICE && <ListeningPractice level={selectedCategory?.level || 0} allVocab={vocabList} onExit={() => setMode(AppMode.LISTENING_PRACTICE_SELECT)} />}
        {mode === AppMode.LOADING && <div className="flex flex-col items-center justify-center py-40"><div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-slate-400 font-bold">Đang xử lý dữ liệu...</p></div>}
      </main>

      <BottomNav currentMode={mode} onHome={() => setMode(AppMode.HOME)} onReview={() => setMode(AppMode.LISTENING_PRACTICE_SELECT)} />

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 sm:p-10 shadow-2xl animate-in zoom-in overflow-y-auto max-h-[95vh]">
            <h3 className="text-3xl font-black mb-8">{editingLessonId ? 'Cập nhật bài học' : 'Thêm bài học mới'}</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Chọn cấp độ / Chủ đề</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {allCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setModalCategoryId(cat.id)}
                      className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-2 ${
                        modalCategoryId === cat.id 
                        ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className={`text-sm font-bold truncate ${modalCategoryId === cat.id ? 'text-indigo-600' : 'text-slate-500'}`}>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tên bài học</label>
                <input type="text" placeholder="Ví dụ: Từ vựng Gia đình" value={importLessonTitle} onChange={(e) => setImportLessonTitle(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold"/>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Danh sách từ vựng (Chữ Hán)</label>
                <textarea placeholder="Nhập mỗi từ một dòng (Ví dụ: 爸爸, 妈妈...)" value={importText} onChange={(e) => setImportText(e.target.value)} className="w-full h-32 sm:h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-chinese text-2xl resize-none"/>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowImportModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">Hủy</button>
              <button onClick={handleSmartImport} disabled={isEnriching} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                {isEnriching ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AI đang xử lý...
                  </span>
                ) : editingLessonId ? 'Cập nhật ngay' : 'Xác nhận tạo bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
