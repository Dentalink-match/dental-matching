import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const StarRating = ({ rating, setRating, size = 6 }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <label key={index}>
            <input
              type="radio"
              name="rating"
              value={ratingValue}
              onClick={() => setRating(ratingValue)}
              className="sr-only"
            />
            <Star
              className={cn(
                'cursor-pointer transition-colors',
                `h-${size} w-${size}`
              )}
              color={ratingValue <= (hover || rating) ? '#ffc107' : '#e4e5e9'}
              fill={ratingValue <= (hover || rating) ? '#ffc107' : 'none'}
              onMouseEnter={() => setHover(ratingValue)}
              onMouseLeave={() => setHover(0)}
            />
          </label>
        );
      })}
    </div>
  );
};

export default StarRating;