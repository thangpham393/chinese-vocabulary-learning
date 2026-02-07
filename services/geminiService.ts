
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VocabularyItem, Lesson, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// --- LOCAL STORAGE HELPERS ---
const getLocalLessons = (level: number): Lesson[] => {
  const data = localStorage.getItem(`lessons_${level}`);
  return data ? JSON.parse(data) : [];
};

const saveLocalLessons = (level: number, lessons: Lesson[]) => {
  localStorage.setItem(`lessons_${level}`, JSON.stringify(lessons));
};

const saveLocalVocab = (lessonId: string | number, vocab: VocabularyItem[]) => {
  localStorage.setItem(`vocab_${lessonId}`, JSON.stringify(vocab));
};

const getLocalVocab = (lessonId: string | number): VocabularyItem[] => {
  const data = localStorage.getItem(`vocab_${lessonId}`);
  return data ? JSON.parse(data) : [];
};

const deleteLocalLesson = (lessonId: string | number, level: number) => {
  const lessons = getLocalLessons(level).filter(l => String(l.id) !== String(lessonId));
  saveLocalLessons(level, lessons);
  localStorage.removeItem(`vocab_${lessonId}`);
};

// --- API FUNCTIONS ---

export const enrichVocabularyWithAI = async (rawWords: string): Promise<VocabularyItem[]> => {
  const wordsArray = rawWords.split(/[\n,，]+/).map(w => w.trim()).filter(w => w.length > 0);
  if (wordsArray.length === 0) return [];

  const prompt = `Bạn là chuyên gia ngôn ngữ. Hãy phân tích các từ Tiếng Trung này: ${wordsArray.join(', ')}.
  Trả về một mảng JSON các đối tượng. Mỗi đối tượng có: word, pinyin, partOfSpeech, definitionVi, definitionEn, exampleZh, exampleVi.
  Yêu cầu: Không giải thích, chỉ trả về JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              pinyin: { type: Type.STRING },
              partOfSpeech: { type: Type.STRING },
              definitionVi: { type: Type.STRING },
              definitionEn: { type: Type.STRING },
              exampleZh: { type: Type.STRING },
              exampleVi: { type: Type.STRING },
            },
            required: ["word", "pinyin", "partOfSpeech", "definitionVi", "definitionEn", "exampleZh", "exampleVi"],
          },
        },
      },
    });

    const results = JSON.parse(response.text || "[]");
    return results.map((item: any, idx: number) => ({
      ...item,
      id: `${Date.now()}-${idx}`
    }));
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("AI gặp sự cố khi xử lý dữ liệu.");
  }
};

export const saveCustomLesson = async (category: Category, lesson: Lesson, vocabulary: VocabularyItem[]) => {
  const lessonId = lesson.id || String(Date.now());
  const newLesson = { ...lesson, id: lessonId, level: category.level };

  if (supabase) {
    try {
      if (lesson.id) {
        await supabase.from('vocabulary').delete().eq('lesson_id', lessonId);
        await supabase.from('lessons').delete().eq('id', lessonId);
      }
      await supabase.from('lessons').insert({
        id: lessonId,
        level: category.level,
        number: lesson.number,
        title: lesson.title,
        description: lesson.description
      });
      const vocabData = vocabulary.map(v => ({
        lesson_id: lessonId,
        word: v.word,
        pinyin: v.pinyin,
        part_of_speech: v.partOfSpeech,
        definition_vi: v.definitionVi,
        definition_en: v.definitionEn,
        example_zh: v.exampleZh,
        example_vi: v.exampleVi
      }));
      await supabase.from('vocabulary').insert(vocabData);
      return true;
    } catch (err) {
      console.warn("Supabase failed, using local storage");
    }
  }

  const lessons = getLocalLessons(category.level);
  const existingIdx = lessons.findIndex(l => String(l.id) === String(lessonId));
  if (existingIdx > -1) lessons[existingIdx] = newLesson;
  else lessons.push(newLesson);
  saveLocalLessons(category.level, lessons);
  saveLocalVocab(lessonId, vocabulary);
  return true;
};

export const deleteLesson = async (lessonId: string | number, level: number) => {
  if (supabase) {
    try {
      await supabase.from('vocabulary').delete().eq('lesson_id', lessonId);
      await supabase.from('lessons').delete().eq('id', lessonId);
    } catch (e) { console.warn("Supabase delete failed"); }
  }
  deleteLocalLesson(lessonId, level);
  return true;
};

export const fetchLessons = async (level: number): Promise<Lesson[]> => {
  let dbLessons: Lesson[] = [];
  if (supabase) {
    try {
      const { data } = await supabase.from('lessons').select('*').eq('level', level).order('number');
      dbLessons = data || [];
    } catch (e) { console.warn("Fetch lessons DB failed"); }
  }
  const localLessons = getLocalLessons(level);
  return [...dbLessons, ...localLessons];
};

export const fetchVocab = async (lessonId: string | number): Promise<VocabularyItem[]> => {
  if (supabase) {
    try {
      const { data } = await supabase.from('vocabulary').select('*').eq('lesson_id', lessonId);
      if (data && data.length > 0) {
        return data.map(d => ({
          id: String(d.id), word: d.word, pinyin: d.pinyin, partOfSpeech: d.part_of_speech,
          definitionVi: d.definition_vi, definitionEn: d.definition_en,
          exampleZh: d.example_zh, exampleVi: d.example_vi
        }));
      }
    } catch (e) { console.warn("Fetch vocab DB failed"); }
  }
  return getLocalVocab(lessonId);
};

export const fetchAllVocabByLevel = async (level: number): Promise<VocabularyItem[]> => {
  const lessons = await fetchLessons(level);
  const allVocabPromises = lessons.map(l => fetchVocab(l.id));
  const results = await Promise.all(allVocabPromises);
  return results.flat();
};

export const speak = async (text: string, rate: number = 1.0) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      buffer.getChannelData(0).set(Array.from(dataInt16).map(v => v / 32768));
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      src.connect(ctx.destination);
      src.start();
    }
  } catch (e) { console.error("TTS Error", e); }
};

export const genImage = async (word: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `High-quality educational 3D render of "${word}" for language learning, isolated on white background` }] },
    });
    const part = response.candidates[0].content.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : undefined;
  } catch (e) { return undefined; }
};
