import { useState, useEffect } from 'react';

export const useSound = (soundUrl) => {
  const [audio] = useState(new Audio(soundUrl));
  const [isPlaying, setIsPlaying] = useState(false);

  const play = () => {
    if (!isPlaying) {
      audio.play().catch(e => console.error("Failed to play sound:", e));
    }
  };

  useEffect(() => {
    audio.addEventListener('playing', () => setIsPlaying(true));
    audio.addEventListener('ended', () => setIsPlaying(false));
    return () => {
      audio.removeEventListener('playing', () => setIsPlaying(true));
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [audio]);

  return play;
};