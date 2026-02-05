
import { GoogleGenAI, Type } from "@google/genai";
import { VocabularyItem, Lesson } from "../types";
import { HSK_STATIC_LESSONS, HSK_STATIC_VOCABULARY } from "../data/hskData";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const STORAGE_KEYS = {
  CUSTOM_LESSONS: (level: number) => `zw_v2_hsk_${level}_lessons`,
  VOCAB: (lessonId: string) => `zw_v2_vocab_${lessonId}`,
  IMAGE_CACHE: 'zw_v2_image_cache'
};

const saveToCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage error", e);
  }
};

const getFromCache = (key: string) => {
  const cached = localStorage.getItem(key);
  return cached ? JSON.parse(cached) : null;
};

export const enrichVocabularyWithAI = async (rawWords: string): Promise<VocabularyItem[]> => {
  const prompt = `Bạn là một chuyên gia từ điển Tiếng Trung - Việt. 
  Tôi có danh sách các từ vựng sau: "${rawWords}"
  
  Hãy tra cứu và trả về một mảng JSON các đối tượng từ vựng với cấu trúc:
  {
    "word": "Chữ Hán",
    "pinyin": "Phiên âm có dấu",
    "partOfSpeech": "Từ loại (n, v, adj...)",
    "definitionVi": "Nghĩa tiếng Việt ngắn gọn",
    "definitionEn": "Short English definition",
    "exampleZh": "Câu ví dụ tiếng Trung",
    "exampleVi": "Dịch nghĩa câu ví dụ"
  }
  
  Yêu cầu: Chỉ trả về JSON array, không thêm văn bản giải thích.`;

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
      id: `custom-${Date.now()}-${idx}`,
    }));
  } catch (error) {
    console.error("AI Enrichment failed:", error);
    return [];
  }
};

export const saveCustomLesson = (level: number, lesson: Lesson, vocabulary: VocabularyItem[]) => {
  const lessons = getFromCache(STORAGE_KEYS.CUSTOM_LESSONS(level)) || [];
  
  const existingIdx = lessons.findIndex((l: Lesson) => l.id === lesson.id);
  if (existingIdx >= 0) {
    lessons[existingIdx] = lesson;
  } else {
    lessons.push(lesson);
  }
  
  lessons.sort((a: Lesson, b: Lesson) => a.number - b.number);
  
  saveToCache(STORAGE_KEYS.CUSTOM_LESSONS(level), lessons);
  saveToCache(STORAGE_KEYS.VOCAB(lesson.id), vocabulary);
};

export const deleteCustomLesson = (level: number, lessonId: string) => {
  const lessons = getFromCache(STORAGE_KEYS.CUSTOM_LESSONS(level)) || [];
  const filtered = lessons.filter((l: Lesson) => l.id !== lessonId);
  saveToCache(STORAGE_KEYS.CUSTOM_LESSONS(level), filtered);
  localStorage.removeItem(STORAGE_KEYS.VOCAB(lessonId));
};

export const fetchLessonsForHSK = async (level: number): Promise<Lesson[]> => {
  const custom = getFromCache(STORAGE_KEYS.CUSTOM_LESSONS(level)) || [];
  const staticData = HSK_STATIC_LESSONS[level] || [];
  return [...staticData, ...custom].sort((a, b) => a.number - b.number);
};

export const fetchVocabularyForLesson = async (level: number, lesson: Lesson): Promise<VocabularyItem[]> => {
  if (HSK_STATIC_VOCABULARY[lesson.id]) return HSK_STATIC_VOCABULARY[lesson.id];
  return getFromCache(STORAGE_KEYS.VOCAB(lesson.id)) || [];
};

export const generateImageForWord = async (word: string, definition: string): Promise<string | undefined> => {
  const imgCache = getFromCache(STORAGE_KEYS.IMAGE_CACHE) || {};
  if (imgCache[word]) return imgCache[word];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Minimalist 2D icon for Chinese word "${word}" (${definition}). White background.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64 = `data:image/png;base64,${part.inlineData.data}`;
        imgCache[word] = base64;
        saveToCache(STORAGE_KEYS.IMAGE_CACHE, imgCache);
        return base64;
      }
    }
  } catch (e) {}
  return undefined;
};

// --- TTS Logic ---

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const speakText = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Hãy đọc to câu sau bằng tiếng Trung: ${text}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore là giọng nữ tự nhiên
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(
        decodeBase64(base64Audio),
        audioContext,
        24000,
        1,
      );
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      return true;
    }
  } catch (error) {
    console.error("TTS failed:", error);
  }
  return false;
};
