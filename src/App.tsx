import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Volume2, VolumeX, Loader2, Sparkles, User, Zap, RefreshCw, Mic, MicOff, LogOut, MessageSquare, Phone, PhoneOff, Plus, Image, Camera, X, Settings } from "lucide-react";
import { auth, db, signInWithGoogle } from "./lib/firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc,
  setDoc,
  getDocFromServer,
  limit,
  Timestamp,
  increment
} from "firebase/firestore";

interface Message {
  id?: string;
  role: "user" | "bot";
  content: string;
  createdAt?: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const isVoiceModeRef = useRef(false);
  const [isKeyMissing, setIsKeyMissing] = useState(false);
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | "loading">("loading");
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [dailyTokens, setDailyTokens] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  
  const searchAudioRef = useRef<HTMLAudioElement | null>(null);

  // Search sound synthesis
  useEffect(() => {
    if (isSearching && isVoiceEnabled) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.02, audioCtx.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      
      // Pulse animation
      const interval = setInterval(() => {
        gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      }, 800);

      return () => {
        clearInterval(interval);
        oscillator.stop();
        audioCtx.close();
      };
    }
  }, [isSearching]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const maxVolumeRef = useRef<number>(0);
  const hasSpeechStartedRef = useRef<boolean>(false);

  // Test connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Find existing sessions or create a default one
        setSessionId("main_thread");
      } else {
        setSessionId(null);
        setSessions([]);
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const chatsPath = `users/${user.uid}/chats`;
    const q = query(
      collection(db, chatsPath),
      orderBy("updatedAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSessions(chatList);
      
      // If no session is selected, select the most recent one
      if (!sessionId && chatList.length > 0) {
        setSessionId(chatList[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, chatsPath);
    });

    return () => unsubscribe();
  }, [user]);

  const createNewChat = async () => {
    if (!user) return;
    const newSessionId = `chat_${Date.now()}`;
    const chatRef = doc(db, `users/${user.uid}/chats`, newSessionId);
    
    try {
      await setDoc(chatRef, {
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        title: "New Conversation"
      });
      setSessionId(newSessionId);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/chats/${newSessionId}`);
    }
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      // For simplicity, we just delete the chat document. 
      // Subcollections are not automatically deleted in Firestore client SDK, 
      // but they will be "orphaned". For a real app, use a cloud function.
      const chatRef = doc(db, `users/${user.uid}/chats`, id);
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(chatRef);
      if (sessionId === id) setSessionId(null);
    } catch (error) {
      console.error("Delete Chat Error:", error);
    }
  };

  useEffect(() => {
    if (!user || !sessionId) return;

    const messagesPath = `users/${user.uid}/chats/${sessionId}/messages`;
    const q = query(
      collection(db, messagesPath),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, messagesPath);
    });

    return () => unsubscribe();
  }, [user, sessionId]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/health");
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.groqKeySet) {
            setApiStatus("ok");
            setIsKeyMissing(false);
          } else {
            setApiStatus("error");
            setIsKeyMissing(true);
          }
        } else {
          const text = await res.text();
          if (text.includes("Cookie check") || text.includes("Authenticate in new window")) {
            setApiStatus("error");
            console.warn("Platform cookie check detected in health check.");
          } else {
            setApiStatus("error");
          }
        }
      } catch (e) {
        setApiStatus("error");
      }
    };
    checkStatus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) {
      setDailyTokens(0);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const usageRef = doc(db, `users/${user.uid}/usage`, `tts_${today}`);
    
    const unsubscribe = onSnapshot(usageRef, (doc) => {
      if (doc.exists()) {
        setDailyTokens(doc.data().tokens || 0);
      } else {
        setDailyTokens(0);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const trackUsage = async (tokenCount: number) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const usageRef = doc(db, `users/${user.uid}/usage`, `tts_${today}`);

    try {
      await setDoc(usageRef, {
        tokens: increment(tokenCount),
        date: today
      }, { merge: true });
    } catch (error) {
      console.error("Error tracking usage:", error);
    }
  };

  const detectLanguage = (text: string): string => {
    // Czech special characters
    const czechChars = /[áčďéěíňóřšťúůýž]/i;
    if (czechChars.test(text)) return "cs-CZ";
    
    // More comprehensive English word list
    const englishWords = /\b(the|is|and|of|to|in|it|that|for|with|you|this|have|hello|how|are|what|where|when|who|is|am|are|was|were|be|been|being|good|morning|evening|night|please|thanks|thank|welcome|yes|no|can|will|would|should|could|do|did|does|my|your|his|her|their|our)\b/i;
    
    const words = text.toLowerCase().split(/\s+/);
    const englishMatchCount = words.filter(w => englishWords.test(w)).length;
    
    if (englishMatchCount > 0 || (text.length > 20 && !czechChars.test(text))) {
      return "en-US";
    }
    
    return "auto";
  };

  const speakText = async (text: string, onEnd?: () => void) => {
    if (!isVoiceEnabled || !text) {
      if (onEnd) onEnd();
      return;
    }
    const lang = detectLanguage(text);
    
    // Browser voice picker fallback
    const findBestVoice = (language: string, availableVoices: SpeechSynthesisVoice[]) => {
      const isHighQuality = (v: SpeechSynthesisVoice) => 
        (v.name.includes("Natural") || v.name.includes("Online") || v.name.includes("Google") || v.localService === false);

      if (language === "cs-CZ") {
        // Find high quality Czech, if none, try Slovak as it's similar and might have higher quality
        const qualityVoice = availableVoices.find(v => isHighQuality(v) && v.lang.startsWith("cs"))
          || availableVoices.find(v => isHighQuality(v) && v.lang.startsWith("sk"));
        if (qualityVoice) return qualityVoice;
        
        console.warn("No high-quality Czech/Slovak voice found. Skipping robotic system voice.");
        return null;
      }
      if (language === "en-US") {
        return availableVoices.find(v => isHighQuality(v) && v.lang.startsWith("en"))
          || availableVoices.find(v => v.lang.startsWith("en"));
      }
      return availableVoices.find(v => isHighQuality(v)) || availableVoices[0];
    };

    // Use Groq neural voice for English ONLY (currently supported by Groq)
    if (lang === "en-US") {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            if (onEnd) onEnd();
            URL.revokeObjectURL(url);
          };
          
          // Track tokens (approximate characters as tokens for now as per Groq rate limit logs)
          trackUsage(text.length);
          
          audio.play();
          return;
        } else {
          console.warn(`Groq TTS API returned ${response.status}. Using browser fallback.`);
        }
      } catch (error) {
        console.warn("Groq TTS fetch failed, falling back to browser:", error);
      }
    }
    
    // Browser fallback
    if (!window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length === 0) {
      voices = await new Promise(resolve => {
        const handler = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', handler);
          resolve(window.speechSynthesis.getVoices());
        };
        window.speechSynthesis.addEventListener('voiceschanged', handler);
        setTimeout(() => resolve(window.speechSynthesis.getVoices()), 800);
      });
    }
    
    const voice = findBestVoice(lang, voices);
    if (voice) {
      utterance.voice = voice;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      console.log(`Playback skipped for language ${lang} - no quality voice or user rejected robotic fallback.`);
      if (onEnd) onEnd();
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      stopRecording();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Start Audio Context for silence detection
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Find best supported format
        const mimeType = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4"
        ].find(type => MediaRecorder.isTypeSupported(type)) || "";

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          
          // Use a threshold to decide if we should even send this to the API
          // 8 is a safer threshold to ignore background hiss/silence
          if (maxVolumeRef.current < 8) {
            console.log("No significant sound detected (" + maxVolumeRef.current.toFixed(2) + "), skipping STT");
            setIsListening(false);
            setIsLoading(false); 
            stream.getTracks().forEach(track => track.stop());
            if (audioContextRef.current) audioContextRef.current.close();
            return;
          }

          const extension = recorder.mimeType.includes("mp4") ? "m4a" : recorder.mimeType.includes("ogg") ? "ogg" : "webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
          await handleAudioSubmit(audioBlob, extension);
          
          stream.getTracks().forEach(track => track.stop());
          if (audioContextRef.current) audioContextRef.current.close();
        };

        recorder.onstart = () => {
          setIsListening(true);
          maxVolumeRef.current = 0;
          hasSpeechStartedRef.current = false;
        };

        recorder.start();
        mediaRecorderRef.current = recorder;

        // Silence detection loop
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const checkSilence = () => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
          
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          const average = sum / bufferLength;

          // Track the hottest part of the audio to see if user actually spoke
          if (average > maxVolumeRef.current) {
            maxVolumeRef.current = average;
          }

          // Detect start of speech
          if (!hasSpeechStartedRef.current && average > 15) {
            hasSpeechStartedRef.current = true;
          }

          // Threshold for silence (adjusted for browser mic noise)
          // Only start the silence timer if the user has actually started speaking
          if (average < 10) { 
            if (hasSpeechStartedRef.current && !silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                stopRecording();
              }, 1500); // 1.5 seconds of silence
            }
          } else {
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          }
          
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            requestAnimationFrame(checkSilence);
          }
        };
        
        requestAnimationFrame(checkSilence);
        
      } catch (err) {
        console.error("Microphone access error:", err);
        setMessages(prev => [...prev, { 
          role: "bot", 
          content: "Mic access denied. Please allow microphone permissions." 
        }]);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  const handleVoiceModeToggle = (val: boolean) => {
    setIsVoiceMode(val);
    isVoiceModeRef.current = val;
    if (val && !isListening) {
      toggleListening();
    } else if (!val && isListening) {
      stopRecording();
    }
  };

  const handleVoiceLoop = () => {
    // Short delay to avoid cutting off
    setTimeout(() => {
      if (isVoiceModeRef.current && !isListening) {
        toggleListening();
      }
    }, 400);
  };

  const handleAudioSubmit = async (blob: Blob, extension: string) => {
    const formData = new FormData();
    formData.append("audio", blob, `recording.${extension}`);
    setIsLoading(true);

    try {
      const res = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok) {
          if (data.text && data.text.trim()) {
            await executeChat(data.text);
          } else {
            // Silently ignore empty or hallucinated transcriptions
            console.log("Empty or filtered transcription received");
            if (isVoiceModeRef.current) {
              handleVoiceLoop();
            }
          }
        } else {
          throw new Error(data.error || "Transcription failed");
        }
      } else {
        const text = await res.text();
        
        if (text.includes("Cookie check") || text.includes("Authenticate in new window")) {
          setMessages(prev => [...prev, { 
            role: "bot", 
            content: "⚠️ **Tip pro plynulý chod**: Prohlížeč blokuje spojení v náhledu. Pro správné fungování hlasu otevřete aplikaci v nové záložce tlačítkem 'Open in new tab' v záhlaví editoru." 
          }]);
        } else {
          console.error("Non-JSON STT response:", text.substring(0, 200));
          throw new Error(`Server error (${res.status}). Ensure GROQ_API_KEY is correct.`);
        }
      }
    } catch (e: any) {
      console.error("STT Error:", e);
      setMessages(prev => [...prev, { role: "bot", content: `Voice error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeChat = async (text: string) => {
    if ((!text.trim() && !selectedImage) || !user || !sessionId) return;

    const messagesPath = `users/${user.uid}/chats/${sessionId}/messages`;
    const imageToSend = selectedImage; // Store locally as setInput/setSelectedImage clear immediately
    
    setIsLoading(true);
    setInput("");
    setSelectedImage(null);

    try {
      // 0. Ensure chat session exists (silently)
      const chatRef = doc(db, `users/${user.uid}/chats`, sessionId);
      const chatSnap = await getDocFromServer(chatRef);
      
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          title: text ? (text.length > 30 ? text.substring(0, 30) + "..." : text) : "Photo Analysis"
        });
      } else {
        const chatData = chatSnap.data();
        const updatePayload: any = { updatedAt: serverTimestamp() };
        
        // If the title is still default, update it with the first message content
        if (chatData?.title === "New Conversation" || chatData?.title === "Main Conversation" || chatData?.title === "Untitled Conversation") {
          updatePayload.title = text ? (text.length > 30 ? text.substring(0, 30) + "..." : text) : "Photo Analysis";
        }
        
        await updateDoc(chatRef, updatePayload);
      }

      // 1. Save user message to Firestore
      await addDoc(collection(db, messagesPath), {
        role: "user",
        content: text,
        image: imageToSend,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, messagesPath);
    }

    let streamContent = "";
    let botMsgId: string | null = null;
    let hasPlayedFastIntro = false;

    try {
      // 2. Add placeholder bot message to Firestore
      const botDocRef = await addDoc(collection(db, messagesPath), {
        role: "bot",
        content: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: user.uid
      });
      botMsgId = botDocRef.id;

      // 3. Parallel requests: Fast intro + Full stream
      const fastIntroPromise = fetch("/api/chat-fast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, image: imageToSend }),
      }).then(res => res.ok ? res.json() : null).catch(() => null);

      // Determine which API to use: Groq (default) or Gemini (for search/current info)
      const searchKeywords = [
        "najdi", "search", "hledej", "aktuální", "internet", "google", "web", 
        "zisti", "aktuálně", "zjisti", "weather", "počasí", "news", "zprávy",
        "brows", "online", "browsing"
      ];
      const isSearchRequest = searchKeywords.some(keyword => text.toLowerCase().includes(keyword));
      const apiEndpoint = isSearchRequest ? "/api/chat-gemini" : "/api/chat";

      const streamResponsePromise = fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, image: imageToSend }),
      });

      // Handle the fast intro as soon as it arrives
      fastIntroPromise.then((data) => {
        if (data?.content && isVoiceEnabled && !hasPlayedFastIntro) {
          hasPlayedFastIntro = true;
          speakText(data.content);
        }
      });

      const response = await streamResponsePromise;

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          throw new Error(data.details || data.error || "Failed to get response");
        } else {
          const rText = await response.text();
          if (rText.includes("Cookie check") || rText.includes("Authenticate in new window")) {
            if (botMsgId) {
              await updateDoc(doc(db, messagesPath, botMsgId), {
                content: "⚠️ **Auth Required**: Please open the app in a new tab to authenticate."
              });
            }
            return;
          }
          throw new Error(`Chat failed with status ${response.status}`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkText = decoder.decode(value);
        const lines = chunkText.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") {
              setIsSearching(false);
              // If we already played a fast intro, we should ideally only play the REST of the content
              // to avoid repetition. A simple heuristic is to find the first sentence boundary.
              if (hasPlayedFastIntro) {
                const sentences = streamContent.split(/(?<=[.!?])\s+/);
                if (sentences.length > 1) {
                  const rest = sentences.slice(1).join(" ");
                  speakText(rest, handleVoiceLoop);
                } else if (isVoiceModeRef.current) {
                  handleVoiceLoop();
                }
              } else {
                speakText(streamContent, handleVoiceLoop);
              }
              
              // Update final content in Firestore
              if (botMsgId) {
                await updateDoc(doc(db, messagesPath, botMsgId), {
                  content: streamContent,
                  updatedAt: serverTimestamp()
                });
              }
              continue;
            }
            try {
              const data = JSON.parse(dataStr);
              
              // Detect if searching
              if (data.groundingMetadata) {
                setIsSearching(true);
                continue;
              }

              if (data.content) {
                // Once we start getting content, we are likely done searching
                setIsSearching(false);
                streamContent += data.content;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last && last.role === "bot" && (last.id === botMsgId || last.content === "")) {
                    last.content = streamContent;
                    if (!last.id) (last as any).id = botMsgId;
                  }
                  return next;
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (error: any) {
      console.error("Chat Error:", error);
      if (botMsgId) {
        try {
          await updateDoc(doc(db, messagesPath, botMsgId), {
            content: `Error: ${error.message}`,
            updatedAt: serverTimestamp()
          });
        } catch (ue) {
          handleFirestoreError(ue, OperationType.UPDATE, `${messagesPath}/${botMsgId}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;
    executeChat(input);
    setSelectedImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setShowPlusMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setShowPlusMenu(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0);
      setSelectedImage(canvas.toDataURL("image/jpeg"));
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  return (
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-[#0d0d0d] text-zinc-100 font-sans selection:bg-zinc-800">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed inset-y-0 left-0 w-64 border-r border-zinc-800 flex flex-col bg-[#171717] z-50 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}>
        <div className="p-4 flex items-center justify-between">
           <button 
             onClick={createNewChat}
             disabled={!user}
             className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50"
           >
             <div className="w-6 h-6 bg-[#212121] border border-zinc-700/50 rounded-md flex items-center justify-center shadow-lg">
                <Zap className="w-3.5 h-3.5 text-white fill-white" />
             </div>
             <span>New Chat</span>
           </button>
           <button 
             onClick={() => setIsSidebarOpen(false)}
             className="lg:hidden p-2 text-zinc-500 hover:text-white"
           >
             <LogOut size={16} />
           </button>
        </div>

        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto custom-scrollbar pt-2">
          {sessions.map((session) => (
            <div key={session.id} className="relative group/item">
              <button
                onClick={() => {
                  setSessionId(session.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-lg transition-all flex items-center gap-3 text-left
                  ${sessionId === session.id 
                    ? "bg-[#212121] text-zinc-100" 
                    : "hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
                  }`}
              >
                <div className="truncate text-xs font-medium flex-1">
                  {session.title || "Untitled Conversation"}
                </div>
              </button>
              <button 
                onClick={(e) => deleteChat(e, session.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover/item:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-all"
              >
                <LogOut size={12} className="rotate-180" />
              </button>
            </div>
          ))}
        </nav>

        {user && (
          <div className="p-4 border-t border-zinc-800 bg-[#171717]">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center gap-3 p-2 mb-2 rounded-xl border border-zinc-800/50 hover:bg-zinc-900/50 transition-colors text-zinc-400 hover:text-white"
            >
              <Settings size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
            </button>
            <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
              <img src={user.photoURL || ""} alt="" className="w-9 h-9 rounded-xl ring-1 ring-zinc-700/50 object-cover" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[11px] font-bold truncate text-zinc-200 uppercase tracking-tight">{user.displayName}</span>
                <button onClick={() => signOut(auth)} className="text-[10px] text-zinc-500 hover:text-red-400 text-left transition-colors font-semibold uppercase tracking-wider">Sign Out</button>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full w-full bg-[#0d0d0d]">
        <header className="h-14 px-4 flex items-center justify-between z-20 bg-[#0d0d0d]/80 backdrop-blur-md lg:hidden border-b border-zinc-800">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-zinc-500 hover:text-white"
          >
            <Zap size={20} />
          </button>
          <h1 className="text-sm font-black tracking-[0.2em] text-zinc-200">SHATE</h1>
          <div className="w-8"></div>
        </header>

        {/* Camera Overlay */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setIsSettingsOpen(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-[#171717] border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <Settings className="text-zinc-400" />
                    <span>Settings</span>
                  </h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400 font-medium">Daily Voice Usage</span>
                      <Volume2 size={16} className="text-blue-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{dailyTokens.toLocaleString()}</span>
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">characters</span>
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-600 leading-none">
                      Approximate usage of high-quality Groq TTS tokens for today.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-200">Neural Voice</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Enabled for English</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${isVoiceEnabled ? 'bg-blue-600' : 'bg-zinc-700'}`}
                         onClick={() => {
                           const newValue = !isVoiceEnabled;
                           setIsVoiceEnabled(newValue);
                           if (!newValue) {
                             window.speechSynthesis.cancel();
                           }
                         }}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isVoiceEnabled ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                   <div className="text-[10px] text-zinc-600 text-center uppercase tracking-[0.2em] font-black">
                     Session ID: {sessionId}
                   </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera Overlay */}
        <AnimatePresence>
          {isCameraActive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
            >
              <div className="relative w-full max-w-2xl aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <button 
                  onClick={stopCamera}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="mt-8 flex gap-6">
                <button 
                  onClick={capturePhoto}
                  className="w-16 h-16 bg-white rounded-full border-4 border-zinc-300 shadow-xl active:scale-95 transition-transform"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center">
          <div className="w-full max-w-3xl flex-1 flex flex-col min-h-full px-4 py-8 md:py-12">
            {!user ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full"></div>
                      <div className="relative w-20 h-20 bg-white flex items-center justify-center rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                        <Zap className="w-10 h-10 text-black fill-black" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Shate</h2>
                      <p className="text-zinc-400 max-w-sm mx-auto text-[15px] leading-relaxed">
                        Experience lightning-fast intelligence. Focused, secure, and always ready.
                      </p>
                    </div>
                    <button 
                      onClick={signInWithGoogle}
                      className="px-8 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] active:scale-95 text-[15px] flex items-center gap-2"
                    >
                      Sign in with Google
                    </button>
                  </div>
            ) : messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                <Zap className="w-12 h-12 text-zinc-800" />
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-600">How can I help you today?</h2>
                
                {isKeyMissing && (
                  <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-xl text-red-500 text-sm max-w-sm">
                    <p className="font-semibold mb-1 flex items-center gap-2 justify-center">
                      <Zap size={14} className="fill-red-500" />
                      API Key Missing
                    </p>
                    <p className="opacity-80 text-xs">Groq API key not found in secrets.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                  {[
                    "Plan a road trip through Europe",
                    "Write a Python script to scan a PDF",
                    "Explain quantum entanglement simply",
                    "Help me write an email to my boss"
                  ].map((tip, i) => (
                    <button 
                      key={i}
                      onClick={() => setInput(tip)}
                      className="p-4 border border-zinc-800/50 bg-[#171717] rounded-xl hover:bg-zinc-800 transition-all text-sm text-zinc-400 hover:text-zinc-200 text-left flex items-center justify-between group"
                    >
                      <span className="flex-1 truncate mr-2">{tip}</span>
                      <Send size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pb-32">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className={`flex flex-col group ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {msg.role === "bot" && (
                      <div className="flex items-center gap-2 mb-2">
                        <button 
                          onClick={() => speakText(msg.content)}
                          className="p-1 hover:bg-zinc-800 rounded-md transition-colors text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                           <Volume2 size={12} />
                        </button>
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed selection:bg-zinc-700/50 
                      ${msg.role === "user" 
                        ? "bg-zinc-800 text-zinc-100 rounded-tr-none" 
                        : "bg-[#171717] border border-zinc-800/50 text-zinc-200 rounded-tl-none shadow-sm"
                      }`}>
                      {(msg as any).image && (
                         <img src={(msg as any).image} alt="User upload" className="max-w-full h-auto rounded-lg mb-2 border border-zinc-700" />
                      )}
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Search Animation */}
              <AnimatePresence>
                {isSearching && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-start gap-4 p-4 rounded-3xl bg-blue-500/5 border border-blue-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl animate-pulse rounded-full" />
                        <div className="relative w-10 h-10 bg-zinc-900 border border-blue-500/30 rounded-xl flex items-center justify-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          >
                             <RefreshCw className="w-5 h-5 text-blue-400" />
                          </motion.div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                          Searching the web
                          <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          >
                             ...
                          </motion.span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter">
                          Connecting to Gemini Intelligence
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                 <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-40" />
          </div>
        </div>

        {/* Input area */}
        <div className="w-full bg-transparent pointer-events-none absolute bottom-0 left-0 right-0 p-4 md:p-8 flex justify-center">
          <div className="max-w-3xl w-full flex flex-col gap-2 pointer-events-auto">
            {selectedImage && (
              <div className="relative w-20 h-20 ml-2 mb-2 group">
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover rounded-xl border border-zinc-700 shadow-lg" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 p-1 bg-zinc-800 text-white rounded-full border border-zinc-700 hover:bg-zinc-700"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className={`relative bg-[#212121] border rounded-2xl shadow-2xl p-1 transition-all focus-within:border-zinc-700 ${isListening ? "border-blue-500 ring-2 ring-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "border-[#303030]"}`}>
              <form onSubmit={handleSubmit} className="flex items-end relative gap-2 pt-1 pr-1">
                <div className="relative mb-2 ml-1">
                  <button 
                    type="button"
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className="p-2.5 rounded-xl bg-[#2f2f2f] text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all flex items-center justify-center"
                  >
                    <Plus size={20} />
                  </button>
                  
                  <AnimatePresence>
                    {showPlusMenu && (
                      <>
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-40"
                          onClick={() => setShowPlusMenu(false)}
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-2 w-40 bg-[#171717] border border-zinc-800 rounded-xl shadow-2xl p-1 z-50 overflow-hidden"
                        >
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 text-sm text-zinc-300 hover:text-white transition-colors"
                          >
                            <Image size={16} />
                            <span>Upload Image</span>
                          </button>
                          <button 
                            type="button"
                            onClick={startCamera}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 text-sm text-zinc-300 hover:text-white transition-colors"
                          >
                            <Camera size={16} />
                            <span>Take Photo</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                </div>

                <textarea
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'inherit';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                  placeholder={isListening ? "Listening..." : "Message Shate..."}
                  className="w-full bg-transparent border-none py-3 pl-2 pr-12 focus:outline-none text-[15px] text-zinc-100 placeholder-zinc-500 resize-none max-h-[200px]"
                />
                
                <div className="absolute right-2 bottom-2">
                  <AnimatePresence mode="wait">
                    {(!input.trim() && !selectedImage) ? (
                      <motion.button
                        key="voice-toggle"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        type="button"
                        onClick={() => handleVoiceModeToggle(!isVoiceMode)}
                        className={`p-2.5 rounded-xl transition-all flex items-center justify-center 
                          ${isVoiceMode 
                            ? "bg-white text-black shadow-lg" 
                            : "bg-[#2f2f2f] text-zinc-400 hover:text-white hover:bg-zinc-700"
                          }
                        `}
                        title={isVoiceMode ? "Disable Voice Mode" : "Enable Voice Mode"}
                      >
                        {isVoiceMode ? <PhoneOff size={20} /> : <Phone size={20} />}
                      </motion.button>
                    ) : (
                      <motion.button
                        key="send-btn"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        type="submit"
                        disabled={isLoading}
                        className="p-2.5 rounded-xl bg-white text-black shadow-lg hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center font-bold"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </div>
          </div>
        </div>


      </main>
    </div>
  );
}
