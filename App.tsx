
import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import CategoryCard from './components/CategoryCard';
import ReviewSession from './components/ReviewSession';
import FlashcardStudy from './components/FlashcardStudy';
import ListeningPractice from './components/ListeningPractice';
import { HSK_CATEGORIES } from './constants';
import { Category, VocabularyItem, Lesson, AppMode, CategoryType } from './types';
import { fetchLessonsForHSK, fetchVocabularyForLesson, enrichVocabularyWithAI, saveCustomLesson, deleteCustomLesson } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [listeningLevel, setListeningLevel] = useState<number>(1);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [vocabList, setVocabList] = useState<VocabularyItem[]>([]);
  const [lastResults, setLastResults] = useState<{ completed: string[], failed: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  
  // Import/Edit Form State
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importHskLevel, setImportHskLevel] = useState(1);
  const [importLessonNum, setImportLessonNum] = useState(1);
  const [importLessonTitle, setImportLessonTitle] = useState('');

  const refreshLessons = async (level: number) => {
    const data = await fetchLessonsForHSK(level);
    setLessons(data);
  };

  const handleSelectLevel = async (category: Category) => {
    setSelectedCategory(category);
    if (category.type === CategoryType.HSK && category.level) {
      setIsLoading(true);
      setMode(AppMode.LOADING);
      await refreshLessons(category.level);
      setMode(AppMode.LESSON_SELECT);
      setIsLoading(false);
    } else {
      setMode(AppMode.STUDY_MODE_SELECT);
    }
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setVocabList([]); 
    setMode(AppMode.STUDY_MODE_SELECT);
  };

  const handleSelectListeningLevel = async (level: number) => {
    setIsLoading(true);
    setMode(AppMode.LOADING);
    setListeningLevel(level);

    try {
      const allLessons = await fetchLessonsForHSK(level);
      const allVocabPromises = allLessons.map(l => fetchVocabularyForLesson(level, l));
      const allVocabArrays = await Promise.all(allVocabPromises);
      const combinedVocab = allVocabArrays.flat();

      if (combinedVocab.length === 0) {
        alert("Bạn chưa có dữ liệu từ vựng cho HSK này. Vui lòng tạo bài học trước.");
        setMode(AppMode.LISTENING_PRACTICE_SELECT);
      } else {
        setVocabList(combinedVocab);
        setMode(AppMode.LISTENING_PRACTICE);
      }
    } catch (e) {
      console.error(e);
      setMode(AppMode.LISTENING_PRACTICE_SELECT);
    }
    setIsLoading(false);
  };

  const handleEditLesson = async (e: React.MouseEvent, lesson: Lesson) => {
    e.stopPropagation();
    setIsLoading(true);
    const vocab = await fetchVocabularyForLesson(selectedCategory?.level || 1, lesson);
    
    setEditingLessonId(lesson.id);
    setImportHskLevel(selectedCategory?.level || 1);
    setImportLessonNum(lesson.number);
    setImportLessonTitle(lesson.title);
    setImportText(vocab.map(v => v.word).join('\n'));
    
    setShowImportModal(true);
    setIsLoading(false);
  };

  const handleDeleteLesson = async (e: React.MouseEvent, lesson: Lesson) => {
    e.stopPropagation();
    if (confirm(`Bạn có chắc chắn muốn xóa bài học "${lesson.title}" không?`)) {
      await deleteCustomLesson(selectedCategory?.level || 1, lesson.id);
      await refreshLessons(selectedCategory?.level || 1);
    }
  };

  const startStudy = async (studyMode: 'FLASHCARD' | 'REVIEW') => {
    if (vocabList.length > 0) {
      setMode(studyMode === 'FLASHCARD' ? AppMode.FLASHCARD : AppMode.REVIEW);
      return;
    }

    if (!selectedCategory || !selectedLesson) return;

    setIsLoading(true);
    const oldMode = mode;
    setMode(AppMode.LOADING);
    
    try {
      const items = await fetchVocabularyForLesson(selectedCategory.level!, selectedLesson);
      if (items.length > 0) {
        setVocabList(items);
        setMode(studyMode === 'FLASHCARD' ? AppMode.FLASHCARD : AppMode.REVIEW);
      } else {
        alert("Bài học này chưa có từ vựng.");
        setMode(oldMode);
      }
    } catch (error) {
      setMode(AppMode.HOME);
    }
    setIsLoading(false);
  };

  const handleSmartImport = async () => {
    if (!importText.trim() || !importLessonTitle.trim()) {
      alert("Vui lòng điền đầy đủ thông tin bài học và danh sách từ.");
      return;
    }
    
    setIsEnriching(true);
    try {
      const enrichedVocab = await enrichVocabularyWithAI(importText);
      if (enrichedVocab.length > 0) {
        const lessonId = editingLessonId || `custom-hsk${importHskLevel}-l${importLessonNum}-${Date.now()}`;
        const newLesson: Lesson = {
          id: lessonId,
          number: importLessonNum,
          title: importLessonTitle,
          description: `${editingLessonId ? 'Đã chỉnh sửa' : 'Tự nhập'} (${enrichedVocab.length} từ)`
        };

        const success = await saveCustomLesson(importHskLevel, newLesson, enrichedVocab);
        
        if (success) {
          if (selectedCategory?.level === importHskLevel) {
            await refreshLessons(importHskLevel);
          }
          setVocabList(enrichedVocab);
          setSelectedCategory(HSK_CATEGORIES.find(c => c.level === importHskLevel) || null);
          setSelectedLesson(newLesson);
          setMode(AppMode.STUDY_MODE_SELECT);
          setShowImportModal(false);
          setEditingLessonId(null);
          setImportText('');
          setImportLessonTitle('');
        } else {
          alert("Lỗi khi lưu vào Supabase.");
        }
      } else {
        alert("AI không nhận diện được từ vựng. Hãy thử lại.");
      }
    } catch (e) {
      alert("Lỗi kết nối AI.");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleReviewComplete = (results: { completed: string[], failed: string[] }) => {
    setLastResults(results);
    setMode(AppMode.SUMMARY);
  };

  const handleGoHome = useCallback(() => {
    setMode(AppMode.HOME);
    setSelectedCategory(null);
    setSelectedLesson(null);
    setVocabList([]);
    setLastResults(null);
  }, []);

  const openNewLessonModal = () => {
    setEditingLessonId(null);
    setImportText('');
    setImportLessonTitle('');
    setImportLessonNum(lessons.length + 1);
    setImportHskLevel(selectedCategory?.level || 1);
    setShowImportModal(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <Header 
        onHome={handleGoHome} 
        onReview={() => setMode(AppMode.LISTENING_PRACTICE_SELECT)} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {mode === AppMode.HOME && (
          <div className="animate-in fade-in duration-700">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h1 className="text-5xl font-black tracking-tight text-gray-900 mb-6">
                Kho Từ Vựng <span className="text-indigo-600">Cloud Sync</span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Dữ liệu được lưu trữ an toàn trên Supabase. <br/>Học mọi lúc, mọi nơi trên mọi thiết bị.
              </p>
              <button 
                onClick={openNewLessonModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-bold shadow-2xl transition-all active:scale-95 flex items-center mx-auto text-lg"
              >
                <span className="mr-3 text-2xl">➕</span> Tạo bài học mới
              </button>
            </div>

            <section>
              <div className="flex items-center mb-8">
                <div className="w-1.5 h-8 bg-indigo-600 rounded-full mr-4"></div>
                <h2 className="text-3xl font-extrabold">Lộ trình HSK</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {HSK_CATEGORIES.map(cat => (
                  <CategoryCard key={cat.id} category={cat} onClick={handleSelectLevel} />
                ))}
              </div>
            </section>
          </div>
        )}

        {mode === AppMode.LISTENING_PRACTICE_SELECT && (
           <div className="animate-in slide-in-from-bottom-10 duration-500">
             <div className="text-center mb-16">
               <h2 className="text-4xl font-black mb-4">Luyện nghe & Gõ phím</h2>
               <p className="text-slate-500">Dữ liệu lấy trực tiếp từ database Supabase của bạn</p>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
               {HSK_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => cat.level && handleSelectListeningLevel(cat.level)}
                    className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-500 hover:shadow-xl transition-all group"
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{cat.icon}</div>
                    <div className="font-black text-slate-900 text-lg uppercase tracking-widest">{cat.name}</div>
                  </button>
               ))}
             </div>
           </div>
        )}

        {mode === AppMode.LISTENING_PRACTICE && (
           <ListeningPractice 
             level={listeningLevel} 
             allVocab={vocabList} 
             onExit={() => setMode(AppMode.LISTENING_PRACTICE_SELECT)} 
           />
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                  {editingLessonId ? 'Chỉnh sửa bài học' : 'Thêm bài học mới'}
                </h3>
                <button onClick={() => !isEnriching && setShowImportModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors p-2">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Cấp độ HSK</label>
                  <div className="relative">
                    <select 
                      value={importHskLevel}
                      onChange={(e) => setImportHskLevel(Number(e.target.value))}
                      disabled={!!editingLessonId}
                      className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold appearance-none transition-all cursor-pointer ${editingLessonId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {[1,2,3,4,5,6].map(lv => <option key={lv} value={lv}>HSK {lv}</option>)}
                    </select>
                    {!editingLessonId && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Số bài (Thứ tự)</label>
                  <input 
                    type="number" 
                    value={importLessonNum}
                    onChange={(e) => setImportLessonNum(Number(e.target.value))}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-8">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tên bài học</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Tình yêu của cha mẹ"
                  value={importLessonTitle}
                  onChange={(e) => setImportLessonTitle(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-medium transition-all"
                />
              </div>

              <div className="space-y-2 mb-8 relative">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Danh sách Chữ Hán (mỗi từ một dòng)</label>
                <textarea 
                  className={`w-full h-40 p-5 border-2 rounded-2xl focus:border-indigo-500 outline-none font-chinese text-2xl transition-all resize-none ${isEnriching ? 'bg-slate-50 opacity-40 border-slate-100' : 'bg-white border-slate-100'}`}
                  placeholder="你好&#10;谢谢&#10;老师"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  disabled={isEnriching}
                />
                {isEnriching && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-black text-indigo-600 text-sm animate-pulse tracking-wide uppercase">AI đang cập nhật nội dung...</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowImportModal(false)}
                  disabled={isEnriching}
                  className="flex-1 py-5 font-bold text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSmartImport}
                  disabled={isEnriching || !importText.trim() || !importLessonTitle.trim()}
                  className={`flex-[2] py-5 rounded-2xl font-black shadow-xl transition-all active:scale-95 flex items-center justify-center uppercase tracking-wider ${isEnriching || !importText.trim() || !importLessonTitle.trim() ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
                >
                  {isEnriching ? 'Đang xử lý...' : editingLessonId ? 'Cập nhật bài học' : 'Lưu & Bắt đầu học'}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === AppMode.LESSON_SELECT && (
          <div className="animate-in slide-in-from-right-10 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <button onClick={handleGoHome} className="mb-4 text-indigo-600 font-bold flex items-center hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors w-fit">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  Trang chủ
                </button>
                <h2 className="text-5xl font-black text-slate-900 tracking-tight">{selectedCategory?.name}</h2>
              </div>
              <button 
                onClick={openNewLessonModal}
                className="bg-indigo-600 text-white font-bold px-8 py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center"
              >
                <span className="text-xl mr-2">+</span> Thêm bài học mới
              </button>
            </div>

            {lessons.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center">
                <div className="text-6xl mb-6">🏜️</div>
                <h3 className="text-2xl font-bold text-slate-400">Chưa có bài học nào.</h3>
                <p className="text-slate-400 mt-2">Bấm vào nút "Thêm bài học mới" để bắt đầu.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {lessons.map(lesson => (
                  <div
                    key={lesson.id}
                    className="bg-white rounded-[2rem] border-2 border-slate-100 hover:border-indigo-500 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col"
                  >
                    <button
                      onClick={() => handleSelectLesson(lesson)}
                      className="p-8 text-left flex-1"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rotate-45 translate-x-12 -translate-y-12 group-hover:bg-indigo-100 transition-colors"></div>
                      <div className="relative">
                        <div className="text-indigo-600 font-black text-sm mb-3 tracking-widest uppercase">Bài {lesson.number}</div>
                        <h3 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">{lesson.title}</h3>
                        <p className="text-slate-400 font-medium">{lesson.description}</p>
                      </div>
                    </button>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                       <button 
                        onClick={(e) => handleEditLesson(e, lesson)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                        title="Chỉnh sửa bài học"
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                       </button>
                       <button 
                        onClick={(e) => handleDeleteLesson(e, lesson)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                        title="Xóa bài học"
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === AppMode.STUDY_MODE_SELECT && (
          <div className="max-w-3xl mx-auto text-center py-12 animate-in zoom-in duration-500">
             <button onClick={() => setMode(AppMode.LESSON_SELECT)} className="mb-10 text-indigo-600 font-bold flex items-center mx-auto hover:bg-indigo-50 px-4 py-2 rounded-2xl transition-all">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              Quay lại danh sách bài
            </button>
            <div className="bg-indigo-50 inline-block px-6 py-2 rounded-full text-indigo-600 font-black text-sm uppercase tracking-widest mb-4">
               {selectedCategory?.name} - Bài {selectedLesson?.number}
            </div>
            <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">{selectedLesson?.title}</h2>
            <p className="text-slate-500 text-lg mb-16">Dữ liệu từ Cloud. Bạn muốn bắt đầu học như thế nào?</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <button 
                onClick={() => startStudy('FLASHCARD')}
                className="bg-white p-12 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl transition-all group"
              >
                <div className="text-7xl mb-8 group-hover:scale-110 transition-transform">📇</div>
                <h3 className="text-3xl font-black mb-3">Thẻ nhớ</h3>
                <p className="text-slate-400 font-medium">Đồng bộ đám mây.</p>
              </button>
              <button 
                onClick={() => startStudy('REVIEW')}
                className="bg-white p-12 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-600 hover:shadow-2xl transition-all group"
              >
                <div className="text-7xl mb-8 group-hover:scale-110 transition-transform">✍️</div>
                <h3 className="text-3xl font-black mb-3">Kiểm tra</h3>
                <p className="text-slate-400 font-medium">Gõ chữ Hán.</p>
              </button>
            </div>
          </div>
        )}

        {mode === AppMode.FLASHCARD && <FlashcardStudy items={vocabList} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} onFinish={() => setMode(AppMode.STUDY_MODE_SELECT)} />}
        {mode === AppMode.REVIEW && <ReviewSession items={vocabList} onComplete={handleReviewComplete} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} />}
        {mode === AppMode.LOADING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
            <p className="text-slate-400 font-black text-xl animate-pulse tracking-wide uppercase">Đang đồng bộ Cloud...</p>
          </div>
        )}
        
        {mode === AppMode.SUMMARY && lastResults && (
           <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl text-center border border-indigo-50 animate-in zoom-in duration-500">
             <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-10 text-green-600 text-5xl">🎊</div>
             <h2 className="text-4xl font-black text-slate-900 mb-10 tracking-tight">Tuyệt vời!</h2>
             <div className="grid grid-cols-2 gap-8 mb-12">
               <div className="bg-green-50 p-8 rounded-[2rem]">
                 <p className="text-green-600 font-black text-5xl mb-2">{lastResults.completed.length}</p>
                 <p className="text-green-700 text-xs font-black uppercase tracking-widest">Đã thuộc</p>
               </div>
               <div className="bg-red-50 p-8 rounded-[2rem]">
                 <p className="text-red-600 font-black text-5xl mb-2">{lastResults.failed.length}</p>
                 <p className="text-red-700 text-xs font-black uppercase tracking-widest">Cần xem lại</p>
               </div>
             </div>
             <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => setMode(AppMode.STUDY_MODE_SELECT)} className="flex-1 bg-indigo-50 text-indigo-600 font-black py-5 rounded-2xl hover:bg-indigo-100 transition-all uppercase tracking-widest">Học lại</button>
                <button onClick={handleGoHome} className="flex-[1.5] bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest">Về trang chủ</button>
             </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default App;
