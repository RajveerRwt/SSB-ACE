
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Shield, Loader2, RefreshCw } from 'lucide-react';
import { createSSBChat } from '../services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  text: string;
}

const SSBBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Jai Hind! I am Major Veer. I am here to guide you through the Services Selection Board procedure. You can ask me about Screening, Psychology, GTO, or the Interview. What is your query, Gentleman?" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Chat Session
    if (!chatRef.current) {
      chatRef.current = createSSBChat();
    }
    scrollToBottom();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading || !chatRef.current) return;

    const userMsg = inputText.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputText('');
    setIsLoading(true);

    try {
      const result: GenerateContentResponse = await chatRef.current.sendMessage({ message: userMsg });
      const responseText = result.text || "I copy you, but I'm unable to process that request right now. Please rephrase.";
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Connection interruption detected. Please try asking again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    chatRef.current = createSSBChat();
    setMessages([{ role: 'model', text: "Session Reset. Major Veer online. Ready for your queries regarding the SSB procedure." }]);
  };

  return (
    <div className="max-w-4xl mx-auto h-[80vh] md:h-[85vh] flex flex-col bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-500">
      {/* Header */}
      <div className="bg-slate-900 p-4 md:p-6 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
            <Bot className="text-yellow-400 w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-sm md:text-lg">SSB AI Guide</h3>
            <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Major Veer (AI) Active
            </p>
          </div>
        </div>
        <button 
          onClick={handleReset}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
          title="Reset Session"
        >
          <RefreshCw size={16} className="md:w-[18px]" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-yellow-400'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Shield size={16} />}
            </div>
            <div className={`max-w-[85%] md:max-w-[80%] p-4 md:p-5 rounded-3xl shadow-sm text-xs md:text-sm font-medium leading-relaxed whitespace-pre-line ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-900 text-yellow-400 rounded-full flex items-center justify-center shrink-0 shadow-md">
              <Shield size={16} />
            </div>
            <div className="bg-white p-4 md:p-5 rounded-3xl rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Processing Query...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white border-t border-slate-100">
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about PPDT, TAT, Interview, or GTO tasks..."
            className="w-full p-4 md:p-5 pr-14 md:pr-16 bg-slate-100 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-2xl font-bold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 text-xs md:text-sm"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || isLoading}
            className="absolute right-2 p-2.5 md:p-3 bg-slate-900 text-white rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-center mt-3 md:mt-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300">
          AI guidance is for reference only.
        </p>
      </div>
    </div>
  );
};

export default SSBBot;
