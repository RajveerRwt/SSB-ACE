
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Shield, Loader2, RefreshCw, X, MessageSquare } from 'lucide-react';
import { createSSBChat, sendMessageWithRetry } from '../services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  text: string;
}

const SSBBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
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
      const result: GenerateContentResponse = await sendMessageWithRetry(chatRef.current, userMsg);
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
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-yellow-400 rounded-full shadow-2xl hover:scale-105 transition-all ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'} flex items-center justify-center`}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[90vw] max-w-[400px] h-[80vh] max-h-[600px] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* Header */}
          <div className="bg-slate-900 p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                <Bot className="text-yellow-400 w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm">SSB AI Guide</h3>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Major Veer (AI) Active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleReset}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
                title="Reset Session"
              >
                <RefreshCw size={16} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-yellow-400'}`}>
              {msg.role === 'user' ? <User size={14} /> : <Shield size={14} />}
            </div>
            <div className={`max-w-[85%] p-3 md:p-4 rounded-2xl shadow-sm text-xs font-medium leading-relaxed whitespace-pre-line ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-slate-900 text-yellow-400 rounded-full flex items-center justify-center shrink-0 shadow-md">
              <Shield size={14} />
            </div>
            <div className="bg-white p-3 md:p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-3">
              <Loader2 size={14} className="animate-spin text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about PPDT, TAT..."
            className="w-full p-3 pr-12 bg-slate-100 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-xl font-bold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 text-xs"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || isLoading}
            className="absolute right-1.5 p-2 bg-slate-900 text-white rounded-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Send size={14} />
          </button>
        </form>
        <p className="text-center mt-2 text-[8px] font-black uppercase tracking-widest text-slate-300">
          AI guidance is for reference only.
        </p>
      </div>
        </div>
      )}
    </>
  );
};

export default SSBBot;
