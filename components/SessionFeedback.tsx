
import React, { useState } from 'react';
import { Star, MessageSquare, Send, CheckCircle, Loader2 } from 'lucide-react';
import { submitUserFeedback } from '../services/supabaseService';

interface SessionFeedbackProps {
  testType: string;
  userId?: string;
  onComplete?: () => void;
}

const SessionFeedback: React.FC<SessionFeedbackProps> = ({ testType, userId, onComplete }) => {
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!userId) return null; // Don't show feedback for guest users who can't save anyway

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await submitUserFeedback(userId, testType, rating, comments);
      setSubmitted(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1500);
    } catch (e) {
      console.error("Feedback error", e);
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 p-6 rounded-3xl border border-green-100 text-center animate-in zoom-in duration-300">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h4 className="text-green-800 font-black uppercase text-sm tracking-widest">Feedback Logged</h4>
        <p className="text-green-600 text-xs font-bold mt-1">Thank you for helping us improve.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 animate-in slide-in-from-bottom-8 duration-700">
      <div className="text-center">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center justify-center gap-2">
          <MessageSquare className="text-blue-600" size={20} /> Rate this Session
        </h3>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
          How was your experience with the {testType}?
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="p-2 hover:scale-110 transition-transform focus:outline-none"
          >
            <Star 
              size={32} 
              className={`${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200 fill-slate-50'}`} 
            />
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Any suggestions or issues? (Optional)"
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all resize-none h-24 placeholder:text-slate-400"
        />
        
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Submit Feedback
        </button>
      </div>
    </div>
  );
};

export default SessionFeedback;
