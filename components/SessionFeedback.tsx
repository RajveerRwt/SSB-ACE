
import React, { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { submitUserFeedback } from '../services/supabaseService';

interface Props {
  userId?: string;
  testType: string;
  onComplete: () => void;
}

const SessionFeedback: React.FC<Props> = ({ userId, testType, onComplete }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!userId) {
        onComplete();
        return;
    }
    if (rating === 0) {
        onComplete();
        return;
    }
    setSubmitting(true);
    try {
        await submitUserFeedback(userId, testType, rating, comment);
        setSubmitted(true);
        setTimeout(onComplete, 1500); // Wait briefly before closing
    } catch (e) {
        console.error(e);
        onComplete();
    } finally {
        setSubmitting(false);
    }
  };

  if (submitted) {
      return (
          <div className="bg-green-50 p-6 rounded-3xl border border-green-100 text-center animate-in zoom-in max-w-md mx-auto mt-8">
              <p className="text-green-700 font-black uppercase text-xs tracking-widest">Feedback Recorded</p>
              <p className="text-green-600 text-sm font-medium mt-1">Thank you for helping us improve.</p>
          </div>
      );
  }

  return (
    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-4 max-w-md mx-auto mt-8 shadow-inner animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-center gap-2 mb-2">
          <MessageSquare size={16} className="text-blue-600" />
          <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Session Feedback</h4>
      </div>
      
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`transition-all hover:scale-125 hover:-translate-y-1 ${rating >= star ? 'text-yellow-400 drop-shadow-sm' : 'text-slate-300'}`}
          >
            <Star size={32} fill={rating >= star ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional: How was the AI? Any issues?"
        className="w-full p-3 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none placeholder:font-medium placeholder:text-slate-400"
        rows={3}
      />
      
      <div className="flex gap-3">
        <button 
            onClick={onComplete}
            className="flex-1 py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
        >
            Skip
        </button>
        <button 
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 shadow-lg"
        >
            {submitting ? 'Sending...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
};

export default SessionFeedback;
