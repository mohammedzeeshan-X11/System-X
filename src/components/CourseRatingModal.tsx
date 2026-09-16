import React, { useState } from 'react';
import { Star, X, CheckCircle2, MessageSquare } from 'lucide-react';
import { Course } from '../types';

interface CourseRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  initialRating?: number;
  initialReview?: string;
  onSubmitRating: (rating: number, review?: string) => void;
}

export const CourseRatingModal: React.FC<CourseRatingModalProps> = ({
  isOpen,
  onClose,
  course,
  initialRating = 5,
  initialReview = '',
  onSubmitRating,
}) => {
  if (!isOpen || !course) return null;

  const [rating, setRating] = useState<number>(initialRating);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [review, setReview] = useState<string>(initialReview);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitRating(rating, review.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-xs max-w-md w-full p-6 text-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-black fill-black" />
            <h3 className="text-sm font-serif font-bold text-slate-900">Rate &amp; Review Course</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xs text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <div className="text-xs text-slate-500 font-mono">Course:</div>
            <div className="text-sm font-serif font-bold text-slate-900 mt-0.5 line-clamp-2">
              {course.title}
            </div>
            <div className="text-[11px] font-mono text-slate-600 mt-0.5">
              {course.source} • {course.courseCode}
            </div>
          </div>

          {/* Star Rating selector */}
          <div className="text-center py-3 bg-slate-50 rounded-xs border border-slate-200">
            <div className="text-xs text-slate-600 font-medium mb-2 font-mono uppercase tracking-wider">Select Your Rating</div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1.5 focus:outline-hidden transition-transform hover:scale-110 cursor-pointer"
                    title={`${star} Star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-7 h-7 ${
                        isFilled
                          ? 'text-black fill-black'
                          : 'text-slate-300 hover:text-slate-500'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="text-xs font-semibold text-slate-800 mt-2 font-serif">
              {rating === 5 && 'Outstanding • Highly Relevant for MoSPI'}
              {rating === 4 && 'Very Good • Practical & Clear'}
              {rating === 3 && 'Good • Covered Core Concepts'}
              {rating === 2 && 'Fair • Needed More Rigor'}
              {rating === 1 && 'Needs Improvement'}
            </div>
          </div>

          {/* Review text */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5 font-serif">
              <MessageSquare className="w-3.5 h-3.5 text-black" />
              <span>Feedback / In-Service Review (Optional)</span>
            </label>
            <textarea
              rows={3}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="E.g., Excellent coverage of base revision methodology and Laspeyres formulas applicable to PSD..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-black font-sans"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xs text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xs bg-black hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Rating</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
