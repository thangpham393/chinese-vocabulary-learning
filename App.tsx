
import React, { useState } from 'react';
import Header from './components/Header';
import CategoryCard from './components/CategoryCard';
import FlashcardStudy from './components/FlashcardStudy';
import ReviewSession from './components/ReviewSession';
import ListeningPractice from './components/ListeningPractice';
import BottomNav from './components/BottomNav';
import { HSK_CATEGORIES, TOPIC_CATEGORIES, YCT_CATEGORIES } from './constants';
import { AppMode, Category, Lesson, VocabularyItem } from './types';
import { fetchLessons, fetchVocab, fetchAllVocabByLevel, enrichVocabularyWithAI, saveCustomLesson, deleteLesson } from './services/geminiService';

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

  const ALL_CATS = [...HSK_CATEGORIES, ...YCT_CATEGORIES, ...TOPIC_CATEGORIES];

  const handleSelectCat = async (cat: Category) => {
    setSelectedCat(cat);
    setLoading(true);
    try {
      const data = await fetchLessons(cat.level);
      setLessons(data);
      setMode(AppMode.LESSON_SELECT);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alert("Lỗi khi tải nội dung bài học.");
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalReviewInit = async (cat: Category) => {
    setLoading(true);
    setSelectedCat(cat);
    try {
      const data = await fetchAllVocabByLevel(cat.level);
      if (data.length === 0) {
        alert("Trình độ này hiện chưa có từ vựng nào để ôn tập.");
        return;
      }
      setVocab(data);
      setSelectedLesson({ 
        id: 'global', 
        title: `Ôn tập Tổng hợp ${cat.name}`, 
        number: 0, 
        description: `Bao gồm tất cả ${data.length} từ vựng của trình độ này.` 
      });
      setMode(AppMode.STUDY_MODE_SELECT); // Chuyển đến màn hình chọn chế độ thay vì bắt đầu ngay
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alert("Lỗi khi tập hợp dữ liệu trình độ.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (e: React.MouseEvent, lesson: Lesson) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc muốn xóa bài học "${lesson.title}" không?`)) return;
    
    setLoading(true);
    try {
      await deleteLesson(lesson.id, selectedCat?.level || 1);
      const data = await fetchLessons(selectedCat?.level || 1);
      setLessons(data);
    } catch (e) {
      alert("Xóa bài học thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importTitle || !importText) return alert("Vui lòng nhập tên bài và danh sách từ.");
    setIsProcessing(true);
    try {
      const enriched = await enrichVocabularyWithAI(importText);
      const cat = ALL_CATS.find(c => c.level === importLevel);
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
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 pb-32 pt-24">
      <Header onHome={() => setMode(AppMode.HOME)} onReview={() => setMode(AppMode.GLOBAL_REVIEW_SELECT)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {mode === AppMode.HOME && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-20 gap-12 bg-white p-12 rounded-[4rem] bento-shadow border border-slate-50 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full"></div>
               <div className="relative z-10 max-w-2xl text-center md:text-left">
                  <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                    Học tập không giới hạn
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
                    Chinh Phục <br/>
                    <span className="text-indigo-600 italic">Tiếng Trung.</span>
                  </h1>
                  <p className="text-slate-400 font-medium text-lg md:text-xl leading-relaxed mb-10 max-w-lg">
                    Hệ thống bài học chuẩn HSK & YCT giúp trẻ em và người lớn ghi nhớ từ vựng qua AI 3D trực quan.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setShowModal(true)} className="bg-black text-white px-10 py-5 rounded-[2rem] font-black text-sm shadow-2xl hover:bg-slate-800 hover:-translate-y-1 active:scale-95 transition-all">
                      + Tạo lộ trình riêng
                    </button>
                    <button onClick={() => setMode(AppMode.GLOBAL_REVIEW_SELECT)} className="bg-slate-100 text-slate-600 px-10 py-5 rounded-[2rem] font-bold text-sm hover:bg-slate-200 transition-all">
                      Chế độ Ôn tập Tổng
                    </button>
                  </div>
               </div>
               <div className="relative w-full md:w-1/3 aspect-square bg-slate-50 rounded-[3rem] flex items-center justify-center text-[10rem] animate-bounce duration-[3000ms]">
                 🪁
                 <div className="absolute inset-0 border-[16px] border-white rounded-[3rem] pointer-events-none"></div>
               </div>
            </div>
            
            <section className="mb-20">
              <div className="flex flex-col items-center mb-12">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Lộ trình HSK (Người lớn)</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Theo chuẩn khung ngôn ngữ quốc tế</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                {HSK_CATEGORIES.map(c => <CategoryCard key={c.id} category={c} onClick={handleSelectCat} />)}
              </div>
            </section>

            <section className="mb-20">
              <div className="flex flex-col items-center mb-12">
                <h2 className="text-3xl font-black text-slate-900 mb-2 text-rose-500">Lộ trình YCT (Trẻ em)</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Vui vẻ, sinh động và dễ nhớ</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                {YCT_CATEGORIES.map(c => <CategoryCard key={c.id} category={c} onClick={handleSelectCat} />)}
              </div>
            </section>
          </div>
        )}

        {mode === AppMode.GLOBAL_REVIEW_SELECT && (
          <div className="animate-in slide-in-from-bottom-10 duration-700 max-w-5xl mx-auto py-10">
            <div className="flex flex-col items-center text-center mb-16">
              <div className="bg-indigo-50 text-indigo-600 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-4">Mastery Mode</div>
              <h2 className="text-5xl font-black text-slate-900 mb-4">Ôn tập Tổng hợp</h2>
              <p className="text-slate-400 font-medium max-w-lg">Chọn một trình độ để ôn tập toàn bộ từ vựng đã học. Bạn sẽ được chọn chế độ nghe hoặc viết sau khi chọn Level.</p>
            </div>

            <div className="space-y-20">
              <div>
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                  <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs">A</span>
                  HSK Challenge
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {HSK_CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => handleGlobalReviewInit(c)} className="bg-white p-6 rounded-[2rem] bento-shadow border border-slate-50 hover:border-indigo-600 hover:-translate-y-1 transition-all flex flex-col items-center gap-3">
                      <span className="text-3xl">{c.icon}</span>
                      <span className="font-black text-xs">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                  <span className="w-8 h-8 bg-rose-500 text-white rounded-lg flex items-center justify-center text-xs">B</span>
                  YCT Playground
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {YCT_CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => handleGlobalReviewInit(c)} className="bg-white p-6 rounded-[2rem] bento-shadow border border-slate-50 hover:border-rose-500 hover:-translate-y-1 transition-all flex flex-col items-center gap-3">
                      <span className="text-3xl">{c.icon}</span>
                      <span className="font-black text-xs">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-20 flex justify-center">
              <button onClick={() => setMode(AppMode.HOME)} className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-black transition-colors">← Quay lại trang chủ</button>
            </div>
          </div>
        )}

        {mode === AppMode.LESSON_SELECT && (
          <div className="animate-in slide-in-from-bottom-10 duration-700 max-w-5xl mx-auto">
            <button onClick={() => setMode(AppMode.HOME)} className="mb-12 group flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:text-black transition-all">
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              Quay về trang chủ
            </button>
            
            <div className="flex flex-col items-center text-center mb-16">
              <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-5xl bento-shadow border border-slate-50 mb-6">{selectedCat?.icon}</div>
              <h2 className="text-5xl font-black mb-3">{selectedCat?.name}</h2>
              <p className="text-slate-400 font-bold">Danh sách bài học trình độ {selectedCat?.name}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {lessons.map(l => (
                <div key={l.id} className="group relative bg-white p-10 rounded-[3rem] bento-shadow border border-slate-50 text-left transition-all hover:-translate-y-2 hover:border-indigo-200 cursor-pointer" onClick={() => handleSelectLesson(l)}>
                  <div className="flex justify-between items-center mb-6">
                    <div className="bg-indigo-50 text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Lesson {l.number}</div>
                    <button 
                      onClick={(e) => handleDeleteLesson(e, l)}
                      className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800 mb-2 leading-tight">{l.title}</h3>
                  <p className="text-slate-400 font-medium">{l.description}</p>
                </div>
              ))}
              {lessons.length === 0 && (
                <div className="col-span-full py-32 text-center bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200">
                  <div className="text-7xl mb-6 grayscale opacity-30">🍱</div>
                  <h4 className="text-2xl font-black text-slate-400">Trống vắng quá...</h4>
                  <p className="text-slate-300 font-bold mb-8">Hãy là người đầu tiên tạo nội dung cho bài này!</p>
                  <button onClick={() => setShowModal(true)} className="bg-black text-white px-8 py-4 rounded-2xl font-black text-sm">Thêm bài học ngay</button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === AppMode.STUDY_MODE_SELECT && (
          <div className="max-w-2xl mx-auto py-10 animate-in zoom-in duration-700">
            <button 
              onClick={() => selectedLesson?.id === 'global' ? setMode(AppMode.GLOBAL_REVIEW_SELECT) : setMode(AppMode.LESSON_SELECT)} 
              className="mb-12 flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              Quay lại danh sách
            </button>
            <div className="text-center mb-16">
              <div className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.4em] mb-4">
                {selectedLesson?.id === 'global' ? 'Chế độ Ôn tập Tổng' : 'Chọn chế độ học'}
              </div>
              <h2 className="text-5xl font-black text-slate-900 leading-tight">{selectedLesson?.title}</h2>
              {selectedLesson?.id === 'global' && (
                <p className="mt-4 text-slate-400 font-bold italic">Toàn bộ kho từ trình độ {selectedCat?.name}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-5">
              <button onClick={() => setMode(AppMode.FLASHCARD)} className="group bg-white p-8 rounded-[3rem] bento-shadow border-2 border-slate-50 hover:border-indigo-600 transition-all flex items-center gap-8 text-left">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-6 transition-all">📇</div>
                <div className="flex-1">
                  <div className="text-2xl font-black text-slate-900 mb-1">Flashcards</div>
                  <div className="text-sm text-slate-400 font-bold">Ghi nhớ từ vựng qua thẻ 3D trực quan</div>
                </div>
              </button>
              
              <button onClick={() => setMode(AppMode.REVIEW)} className="group bg-slate-900 p-8 rounded-[3rem] bento-shadow transition-all flex items-center gap-8 text-left">
                <div className="w-20 h-20 bg-white/10 text-white rounded-[2rem] flex items-center justify-center text-4xl group-hover:scale-110 group-hover:-rotate-6 transition-all">✍️</div>
                <div className="text-white flex-1">
                  <div className="text-2xl font-black mb-1">Thử thách Viết</div>
                  <div className="text-sm text-slate-400 font-bold">Luyện gõ Hán tự và nhận diện nghĩa</div>
                </div>
              </button>

              <button onClick={() => setMode(AppMode.LISTENING)} className="group bg-white p-8 rounded-[3rem] bento-shadow border-2 border-slate-50 hover:border-purple-600 transition-all flex items-center gap-8 text-left">
                <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[2rem] flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-6 transition-all">🎧</div>
                <div className="flex-1">
                  <div className="text-2xl font-black text-slate-900 mb-1">Nghe & Gõ câu</div>
                  <div className="text-sm text-slate-400 font-bold">Thử thách tái hiện toàn bộ câu ví dụ</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {mode === AppMode.FLASHCARD && <FlashcardStudy items={vocab} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} onFinish={() => setMode(AppMode.STUDY_MODE_SELECT)} />}
        {mode === AppMode.REVIEW && <ReviewSession items={vocab} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} onComplete={() => setMode(AppMode.STUDY_MODE_SELECT)} />}
        {mode === AppMode.LISTENING && <ListeningPractice level={selectedCat?.level || 1} allVocab={vocab} onExit={() => setMode(AppMode.STUDY_MODE_SELECT)} />}

        {loading && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center">
             <div className="relative w-24 h-24 mb-10">
                <div className="absolute inset-0 border-8 border-indigo-100 rounded-full"></div>
                <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
             </div>
             <p className="font-black text-indigo-600 animate-pulse text-lg uppercase tracking-[0.3em]">Đang chuẩn bị...</p>
          </div>
        )}
      </main>

      <BottomNav currentMode={mode} onHome={() => setMode(AppMode.HOME)} onReview={() => setMode(AppMode.GLOBAL_REVIEW_SELECT)} />

      {/* Modern Modal Design */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] w-full max-w-2xl p-12 shadow-2xl animate-in zoom-in duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-rose-500 to-emerald-500"></div>
            
            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-black hover:rotate-90 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h3 className="text-5xl font-black mb-2 text-slate-900">Tạo lộ trình</h3>
            <p className="text-slate-400 font-bold mb-12">Hô biến danh sách từ thô thành bài học sinh động bằng AI.</p>
            
            <div className="space-y-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Danh mục</label>
                  <select value={importLevel} onChange={e => setImportLevel(Number(e.target.value))} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] font-black outline-none appearance-none cursor-pointer hover:border-indigo-200 transition-colors">
                    <optgroup label="HSK (Người lớn)">
                      {HSK_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                    </optgroup>
                    <optgroup label="YCT (Trẻ em)">
                      {YCT_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                    </optgroup>
                    <optgroup label="Chủ đề">
                      {TOPIC_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên bài học</label>
                  <input type="text" value={importTitle} onChange={e => setImportTitle(e.target.value)} placeholder="VD: Đồ vật trong nhà..." className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] font-black outline-none placeholder:text-slate-200 focus:border-indigo-400 transition-all"/>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Từ vựng (Mỗi dòng 1 từ)</label>
                <textarea value={importText} onChange={e => setImportText(e.target.value)} className="w-full h-48 p-8 bg-slate-50 border border-slate-100 rounded-[3rem] font-chinese text-4xl outline-none placeholder:text-slate-100 resize-none focus:border-indigo-400 transition-all" placeholder="苹果&#10;西瓜&#10;香蕉"/>
              </div>
            </div>

            <div className="mt-12 flex gap-4">
              <button onClick={handleImport} disabled={isProcessing} className="flex-1 bg-black text-white py-6 rounded-[2.5rem] font-black shadow-2xl hover:bg-slate-800 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-3">
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Tạo bằng Gemini AI</span>
                    <span className="text-xl">✨</span>
                  </>
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
