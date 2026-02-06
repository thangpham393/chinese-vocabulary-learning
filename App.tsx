
import React, { useState } from 'react';
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
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 pb-32 pt-24">
      <Header onHome={() => setMode(AppMode.HOME)} onReview={() => setMode(AppMode.HOME)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {mode === AppMode.HOME && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-20 gap-12 bg-white p-12 rounded-[4rem] bento-shadow border border-slate-50 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full"></div>
               <div className="relative z-10 max-w-2xl text-center md:text-left">
                  <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                    Hành trình bắt đầu từ đây
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
                    Học Tiếng Trung <br/>
                    <span className="text-indigo-600 italic">Thật Đơn Giản.</span>
                  </h1>
                  <p className="text-slate-400 font-medium text-lg md:text-xl leading-relaxed mb-10 max-w-lg">
                    Hệ thống học vựng chuẩn HSK với trí tuệ nhân tạo Gemini giúp bạn ghi nhớ nhanh hơn 3 lần qua hình ảnh và âm thanh.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setShowModal(true)} className="bg-black text-white px-10 py-5 rounded-[2rem] font-black text-sm shadow-2xl hover:bg-slate-800 hover:-translate-y-1 active:scale-95 transition-all">
                      + Tạo lộ trình riêng
                    </button>
                    <button className="bg-slate-100 text-slate-600 px-10 py-5 rounded-[2rem] font-bold text-sm hover:bg-slate-200 transition-all">
                      Tìm hiểu thêm
                    </button>
                  </div>
               </div>
               <div className="relative w-full md:w-1/3 aspect-square bg-slate-50 rounded-[3rem] flex items-center justify-center text-[10rem] animate-bounce duration-[3000ms]">
                 🧧
                 <div className="absolute inset-0 border-[16px] border-white rounded-[3rem] pointer-events-none"></div>
               </div>
            </div>
            
            <section className="mb-20">
              <div className="flex flex-col items-center mb-12">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Lộ trình HSK Standard</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Học bài bản theo cấp độ thế giới</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
                {HSK_CATEGORIES.map(c => <CategoryCard key={c.id} category={c} onClick={handleSelectCat} />)}
              </div>
            </section>

            <section className="mb-20">
              <div className="flex flex-col items-center mb-12">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Chủ đề Đời sống</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Mở rộng vốn từ linh hoạt</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
                {TOPIC_CATEGORIES.map(c => <CategoryCard key={c.id} category={c} onClick={handleSelectCat} />)}
              </div>
            </section>
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
              <p className="text-slate-400 font-bold">Danh sách bài học dành cho trình độ {selectedCat?.level}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {lessons.map(l => (
                <button key={l.id} onClick={() => handleSelectLesson(l)} className="group relative bg-white p-10 rounded-[3rem] bento-shadow border border-slate-50 text-left transition-all hover:-translate-y-2 hover:border-indigo-200">
                  <div className="flex justify-between items-center mb-6">
                    <div className="bg-indigo-50 text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Lesson {l.number}</div>
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800 mb-2 leading-tight">{l.title}</h3>
                  <p className="text-slate-400 font-medium">{l.description}</p>
                </button>
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
            <button onClick={() => setMode(AppMode.LESSON_SELECT)} className="mb-12 flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              Quay lại danh sách
            </button>
            <div className="text-center mb-16">
              <div className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.4em] mb-4">Select Mode</div>
              <h2 className="text-5xl font-black text-slate-900 leading-tight">{selectedLesson?.title}</h2>
            </div>
            <div className="grid grid-cols-1 gap-5">
              <button onClick={() => setMode(AppMode.FLASHCARD)} className="group bg-white p-8 rounded-[3rem] bento-shadow border-2 border-slate-50 hover:border-indigo-600 transition-all flex items-center gap-8">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-6 transition-all">📇</div>
                <div className="text-left flex-1">
                  <div className="text-2xl font-black text-slate-900 mb-1">Flashcards</div>
                  <div className="text-sm text-slate-400 font-bold">Ghi nhớ từ vựng qua thẻ 3D trực quan</div>
                </div>
                <div className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
              
              <button onClick={() => setMode(AppMode.REVIEW)} className="group bg-slate-900 p-8 rounded-[3rem] bento-shadow transition-all flex items-center gap-8">
                <div className="w-20 h-20 bg-white/10 text-white rounded-[2rem] flex items-center justify-center text-4xl group-hover:scale-110 group-hover:-rotate-6 transition-all">✍️</div>
                <div className="text-left text-white flex-1">
                  <div className="text-2xl font-black mb-1">Thử thách Viết</div>
                  <div className="text-sm text-slate-400 font-bold">Luyện gõ Hán tự và nhận diện nghĩa</div>
                </div>
              </button>

              <button onClick={() => setMode(AppMode.LISTENING)} className="group bg-white p-8 rounded-[3rem] bento-shadow border-2 border-slate-50 hover:border-purple-600 transition-all flex items-center gap-8">
                <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[2rem] flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-6 transition-all">🎧</div>
                <div className="text-left flex-1">
                  <div className="text-2xl font-black text-slate-900 mb-1">Luyện nghe siêu cấp</div>
                  <div className="text-sm text-slate-400 font-bold">Nghe phát âm chuẩn và tái hiện câu</div>
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
             <p className="font-black text-indigo-600 animate-pulse text-lg uppercase tracking-[0.3em]">Preparing your journey...</p>
          </div>
        )}
      </main>

      <BottomNav currentMode={mode} onHome={() => setMode(AppMode.HOME)} onReview={() => {}} />

      {/* Modern Modal Design */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] w-full max-w-2xl p-12 shadow-2xl animate-in zoom-in duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
            
            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-black hover:rotate-90 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h3 className="text-5xl font-black mb-2 text-slate-900">Custom Path</h3>
            <p className="text-slate-400 font-bold mb-12">Hô biến danh sách từ thô thành bài học sinh động bằng AI.</p>
            
            <div className="space-y-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select value={importLevel} onChange={e => setImportLevel(Number(e.target.value))} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] font-black outline-none appearance-none cursor-pointer hover:border-indigo-200 transition-colors">
                    {HSK_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                    {TOPIC_CATEGORIES.map(c => <option key={c.id} value={c.level}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lesson Title</label>
                  <input type="text" value={importTitle} onChange={e => setImportTitle(e.target.value)} placeholder="Tên bài học..." className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] font-black outline-none placeholder:text-slate-200 focus:border-indigo-400 transition-all"/>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chinese Words (Line by line)</label>
                <textarea value={importText} onChange={e => setImportText(e.target.value)} className="w-full h-48 p-8 bg-slate-50 border border-slate-100 rounded-[3rem] font-chinese text-4xl outline-none placeholder:text-slate-100 resize-none focus:border-indigo-400 transition-all" placeholder="苹果&#10;西瓜&#10;香蕉"/>
              </div>
            </div>

            <div className="mt-12 flex gap-4">
              <button onClick={handleImport} disabled={isProcessing} className="flex-1 bg-black text-white py-6 rounded-[2.5rem] font-black shadow-2xl hover:bg-slate-800 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-3">
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Generate with AI</span>
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
