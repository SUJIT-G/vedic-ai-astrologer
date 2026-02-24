import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Moon, 
  Sun, 
  Mic, 
  Send, 
  Volume2, 
  VolumeX, 
  Timer, 
  Sparkles, 
  User, 
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import Markdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { cn } from './services/utils';
import { getVedicResponse, ChatMessage } from './services/geminiService';

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

const LANGUAGES = [
  { id: 'en-US', name: 'English', flag: '🇬🇧' },
  { id: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { id: 'bn-IN', name: 'Bengali', flag: '🇮🇳' },
  { id: 'mr-IN', name: 'Marathi', flag: '🇮🇳' },
  { id: 'gu-IN', name: 'Gujarati', flag: '🇮🇳' },
];

const DURATIONS = [
  { id: 'free', mins: 2, price: 0, label: 'Trial', badge: 'FREE' },
  { id: '5min', mins: 5, price: 49, label: 'Quick', badge: 'POPULAR' },
  { id: '10min', mins: 10, price: 89, label: 'Deep', badge: 'BEST VALUE' },
  { id: '30min', mins: 30, price: 189, label: 'Master', badge: 'ELITE' },
];

export default function App() {
  const [step, setStep] = useState<'booking' | 'chat' | 'expired'>('booking');
  const [userName, setUserName] = useState('');
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0]);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (step === 'chat' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setStep('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePayment = () => {
    if (!userName.trim()) {
      alert("Please enter your name to begin.");
      return;
    }

    if (selectedDuration.price === 0) {
      startSession();
      return;
    }

    const options = {
      key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || "rzp_live_SBhTeV8COgZ5KV",
      amount: selectedDuration.price * 100,
      currency: "INR",
      name: "Vedic AI Astrologer",
      description: `${selectedDuration.mins} Minute Cosmic Consultation`,
      image: "https://picsum.photos/seed/vedic/200/200",
      handler: function (response: any) {
        console.log("Payment Success:", response.razorpay_payment_id);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#db2777', '#6366f1']
        });
        startSession();
      },
      prefill: {
        name: userName,
        email: "user@vedicai.com",
        contact: "9999999999"
      },
      theme: {
        color: "#302b63"
      },
      config: {
        display: {
          blocks: {
            upi: {
              name: "Pay via UPI",
              instruments: [{ method: "upi" }]
            }
          },
          sequence: ["block.upi"],
          preferences: { show_default_blocks: false }
        }
      }
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert("Payment Failed: " + response.error.description);
      });
      rzp.open();
    } catch (e) {
      console.error("Razorpay Error:", e);
      alert("Payment gateway error. Please try again.");
    }
  };

  const startSession = () => {
    setTimeLeft(selectedDuration.mins * 60);
    setStep('chat');
    setMessages([{
      role: 'model',
      text: `Namaste ${userName}! I am Acharya AI. The cosmic energies are aligned for our session. What is on your mind today?`
    }]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    const response = await getVedicResponse(userMsg, messages, userName, language.name);
    
    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'model', text: response }]);

    if (isSoundOn) {
      speakText(response, language.id);
    }
  };

  const speakText = (text: string, lang: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language.id;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <div className="min-h-screen vedic-gradient flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-vedic-gold rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-500 rounded-full blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'booking' && (
          <motion.div
            key="booking"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl z-10"
          >
            <div className="text-center mb-8">
              <motion.h1 
                className="text-4xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-vedic-gold to-pink-500 mb-2"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                Vedic AI Astrologer 🕉️
              </motion.h1>
              <p className="text-indigo-200 font-serif italic text-lg">Consult the Cosmic Intelligence</p>
              
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
                <p className="text-xs font-mono text-green-400 uppercase tracking-widest">
                  24 Seekers currently online
                </p>
              </div>
            </div>

            <div className="glass rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-vedic-gold/10 rounded-full blur-2xl -mr-16 -mt-16" />
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-indigo-300 mb-2 flex items-center gap-2">
                    <User size={16} /> Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-black/40 border border-indigo-500/30 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-vedic-gold/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-300 mb-2 flex items-center gap-2">
                    <MessageSquare size={16} /> Preferred Language
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setLanguage(lang)}
                        className={cn(
                          "p-3 rounded-xl border text-sm transition-all flex flex-col items-center gap-1",
                          language.id === lang.id 
                            ? "bg-vedic-gold/20 border-vedic-gold text-vedic-gold" 
                            : "bg-black/20 border-white/10 text-white/60 hover:bg-white/5"
                        )}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-300 mb-4 flex items-center gap-2">
                    <Timer size={16} /> Session Duration
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDuration(d)}
                        className={cn(
                          "relative p-4 rounded-2xl border-2 transition-all group",
                          selectedDuration.id === d.id
                            ? "bg-indigo-900/40 border-vedic-gold shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                            : "bg-black/20 border-white/5 hover:border-white/20"
                        )}
                      >
                        {d.badge && (
                          <span className={cn(
                            "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold",
                            d.id === 'free' ? "bg-green-500 text-black" : "bg-vedic-gold text-black"
                          )}>
                            {d.badge}
                          </span>
                        )}
                        <div className="text-xl font-bold mb-1">{d.mins} Min</div>
                        <div className="text-sm opacity-60">{d.price === 0 ? 'Trial' : `₹${d.price}`}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handlePayment}
                    className="w-full bg-gradient-to-r from-vedic-gold to-amber-600 hover:from-amber-400 hover:to-vedic-gold text-black font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-xl shadow-vedic-gold/20"
                  >
                    {selectedDuration.price === 0 ? (
                      <>
                        <Sparkles size={20} />
                        <span>Start Free Session</span>
                      </>
                    ) : (
                      <>
                        <Zap size={20} />
                        <span>Book Session for ₹{selectedDuration.price}</span>
                      </>
                    )}
                    <ChevronRight size={20} />
                  </button>
                  <p className="text-center text-[10px] text-indigo-300/50 mt-4 flex items-center justify-center gap-1">
                    <ShieldCheck size={12} /> Secure Payment via Razorpay
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-5xl h-[90vh] flex flex-col md:flex-row gap-6 z-10"
          >
            {/* Left Panel: Avatar & Timer */}
            <div className="w-full md:w-80 flex flex-col gap-4">
              <div className="glass rounded-[2rem] p-6 flex flex-col items-center justify-center relative overflow-hidden aspect-square md:aspect-auto md:flex-1">
                <button 
                  onClick={() => setIsSoundOn(!isSoundOn)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {isSoundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>

                <div className="relative w-48 h-48 md:w-full md:aspect-square rounded-full md:rounded-2xl overflow-hidden border-4 border-vedic-gold/30 mb-4">
                  <img 
                    src="https://picsum.photos/seed/astrologer/800/800" 
                    className="w-full h-full object-cover"
                    alt="Acharya AI"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-vedic-dark/80 to-transparent" />
                </div>
                
                <div className="text-center">
                  <h3 className="text-xl font-serif font-bold text-vedic-gold">Acharya AI</h3>
                  <p className="text-xs text-indigo-300 uppercase tracking-widest">Vedic Master</p>
                </div>

                <div className="mt-auto w-full pt-6">
                  <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex flex-col items-center">
                    <span className="text-xs text-indigo-300 uppercase tracking-tighter mb-1">Time Remaining</span>
                    <div className={cn(
                      "text-3xl font-mono font-bold",
                      timeLeft < 60 ? "text-red-500 animate-pulse" : "text-white"
                    )}>
                      {formatTime(timeLeft)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Chat */}
            <div className="flex-1 glass rounded-[2rem] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex items-start gap-3",
                      msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shadow-lg shrink-0",
                      msg.role === 'user' ? "bg-vedic-gold text-black" : "bg-vedic-purple text-white"
                    )}>
                      {msg.role === 'user' ? <User size={20} /> : <Sparkles size={20} />}
                    </div>
                    <div className={cn(
                      "max-w-[85%] p-4 rounded-2xl border",
                      msg.role === 'user' 
                        ? "bg-vedic-gold/10 border-vedic-gold/30 rounded-tr-none" 
                        : "bg-white/5 border-white/10 rounded-tl-none"
                    )}>
                      <div className="prose prose-invert prose-sm max-w-none">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-vedic-purple flex items-center justify-center text-white shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-vedic-gold rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-vedic-gold rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-vedic-gold rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-black/40 border-t border-white/10">
                <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={cn(
                      "p-4 rounded-2xl transition-all flex items-center justify-center shrink-0",
                      isListening ? "bg-red-500 animate-pulse" : "bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <Mic size={20} className={isListening ? "text-white" : "text-vedic-gold"} />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about your destiny..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-vedic-gold/50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className="p-4 bg-vedic-gold text-black rounded-2xl hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'expired' && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md z-10"
          >
            <div className="glass rounded-[2.5rem] p-10 text-center shadow-2xl border-vedic-gold/30">
              <div className="w-20 h-20 bg-vedic-gold/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Timer size={40} className="text-vedic-gold" />
              </div>
              <h2 className="text-3xl font-serif font-bold mb-4">Session Concluded</h2>
              <p className="text-indigo-200 mb-8">
                The cosmic window has closed for now. I hope the insights provided guide you on your journey.
              </p>
              <button
                onClick={() => setStep('booking')}
                className="w-full bg-vedic-gold text-black font-bold py-4 rounded-2xl hover:bg-amber-400 transition-all shadow-lg shadow-vedic-gold/20"
              >
                Book Another Consultation
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-8 text-indigo-300/40 text-[10px] uppercase tracking-[0.2em] z-10">
        © 2026 Cosmic Intelligence Systems • Vedic AI
      </div>
    </div>
  );
}
