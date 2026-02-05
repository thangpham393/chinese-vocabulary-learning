
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VocabularyItem, Lesson, Category } from "../types";
import { HSK_STATIC_LESSONS, HSK_STATIC_VOCABULARY } from "../data/hskData";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const IMAGE_CACHE_KEY = 'zw_v2_image_cache';

export const enrichVocabularyWithAI = async (rawWords: string): Promise<VocabularyItem[]> => {
  const prompt = `Bạn là một chuyên gia từ điển Tiếng Trung - Việt. 
  Tôi có danh sách các từ vựng sau: "${rawWords}"
  Hãy trả về mảng JSON: word, pinyin, partOfSpeech, definitionVi, definitionEn, exampleZh, exampleVi.`;

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
      id: `v-${Date.now()}-${idx}`,
    }));
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};

export const saveCustomLesson = async (category: Category, lesson: Lesson, vocabulary: VocabularyItem[]) => {
  if (!supabase) return false;
  
  try {
    // Đảm bảo dữ liệu sạch và đúng kiểu
    const lessonData = {
      id: lesson.id,
      level: category.level ? Number(category.level) : null,
      category_id: String(category.id),
      number: Number(lesson.number),
      title: String(lesson.title),
      description: String(lesson.description || "")
    };

    console.log("Upserting lesson:", lessonData);

    const { error: lessonError } = await supabase
      .from('lessons')
      .upsert(lessonData);
    
    if (lessonError) {
      console.error("Supabase Lesson Error Detail:", JSON.stringify(lessonError));
      throw lessonError;
    }

    // Xóa từ vựng cũ
    await supabase.from('vocabulary').delete().eq('lesson_id', lesson.id);

    // Chuẩn bị từ vựng mới
    const vocabToInsert = vocabulary.map(v => ({
      lesson_id: lesson.id,
      word: String(v.word),
      pinyin: String(v.pinyin || ""),
      part_of_speech: String(v.partOfSpeech || ""),
      definition_vi: String(v.definitionVi || ""),
      definition_en: String(v.definitionEn || ""),
      example_zh: String(v.exampleZh || ""),
      example_vi: String(v.exampleVi || ""),
      image_url: v.imageUrl || null
    }));

    const { error: vocabError } = await supabase.from('vocabulary').insert(vocabToInsert);
    if (vocabError) {
      console.error("Supabase Vocab Error Detail:", JSON.stringify(vocabError));
      throw vocabError;
    }
    
    return true;
  } catch (e) { 
    console.error("Detailed Save Error:", e);
    return false; 
  }
};

export const deleteCustomLesson = async (lessonId: string) => {
  if (!supabase) return false;
  try {
    await supabase.from('vocabulary').delete().eq('lesson_id', lessonId);
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Delete error:", e);
    return false;
  }
};

export const fetchLessonsByCategory = async (category: Category): Promise<Lesson[]> => {
  const staticData = (category.level && HSK_STATIC_LESSONS[category.level]) 
    ? HSK_STATIC_LESSONS[category.level] 
    : [];
    
  if (!supabase) return staticData;

  const query = supabase.from('lessons').select('*');
  if (category.level) {
    query.eq('level', category.level);
  } else {
    query.eq('category_id', category.id);
  }

  const { data, error } = await query.order('number', { ascending: true });
  if (error) return staticData;
  return [...staticData, ...data];
};

export const fetchVocabularyForLesson = async (lesson: Lesson): Promise<VocabularyItem[]> => {
  if (HSK_STATIC_VOCABULARY[lesson.id]) return HSK_STATIC_VOCABULARY[lesson.id];
  if (!supabase) return [];
  const { data } = await supabase.from('vocabulary').select('*').eq('lesson_id', lesson.id);
  return (data || []).map(item => ({
    id: item.id,
    word: item.word,
    pinyin: item.pinyin,
    partOfSpeech: item.part_of_speech,
    definitionVi: item.definition_vi,
    definitionEn: item.definition_en,
    exampleZh: item.example_zh,
    exampleVi: item.example_vi,
    imageUrl: item.image_url
  }));
};

export const getGlobalStats = async () => {
  if (!supabase) return { totalWords: 0, totalLessons: 0 };
  try {
    const { count: vCount } = await supabase.from('vocabulary').select('*', { count: 'exact', head: true });
    const { count: lCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
    return { totalWords: vCount || 0, totalLessons: lCount || 0 };
  } catch (e) {
    return { totalWords: 0, totalLessons: 0 };
  }
};

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
  return buffer;
}

export const speakText = async (text: string, speed: number = 1.0) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioContext);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = speed;
      source.connect(audioContext.destination);
      source.start();
      return true;
    }
  } catch (e) { console.error(e); }
  return false;
};

export const generateImageForWord = async (word: string, definition: string): Promise<string | undefined> => {
  const cached = localStorage.getItem(IMAGE_CACHE_KEY);
  const imgCache = cached ? JSON.parse(cached) : {};
  if (imgCache[word]) return imgCache[word];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Minimalist 2D icon for "${word}" (${definition}). White background.` }] },
    });
    const base64 = response.candidates[0].content.parts.find(p => p.inlineData)?.inlineData?.data;
    if (base64) {
      const url = `data:image/png;base64,${base64}`;
      imgCache[word] = url;
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(imgCache));
      return url;
    }
  } catch (e) {}
  return undefined;
};
