import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

const CountdownTimer = ({ deadline }) => {
  const calculateTimeLeft = () => {
    const difference = new Date(deadline) - new Date();
    let timeLeft = {};

    if (difference > 0) {
      const totalSeconds = Math.floor(difference / 1000);
      timeLeft = {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: Math.floor(totalSeconds % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const totalSecondsLeft = (timeLeft.days || 0) * 86400 + (timeLeft.hours || 0) * 3600 + (timeLeft.minutes || 0) * 60 + (timeLeft.seconds || 0);
  const isUrgent = totalSecondsLeft > 0 && totalSecondsLeft <= 60 * 60; // 1 hour
  const isEndingSoon = totalSecondsLeft > 0 && totalSecondsLeft <= 10 * 60; // 10 minutes

  const timerSegments = [
    { label: 'days', value: timeLeft.days },
    { label: 'hours', value: timeLeft.hours },
    { label: 'minutes', value: timeLeft.minutes },
    { label: 'seconds', value: timeLeft.seconds },
  ].filter(segment => segment.value !== undefined);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  if (totalSecondsLeft <= 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-full shadow-lg"
      >
        Time's up!
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`flex items-center space-x-2 p-1.5 rounded-full shadow-inner ${
        isUrgent ? 'bg-red-500/20' : 'bg-gray-100'
      }`}
    >
      <Clock className={`h-5 w-5 mx-1 ${isUrgent ? 'text-red-500' : 'text-gray-500'} ${isEndingSoon ? 'animate-pulse' : ''}`} />
      <div className="flex items-baseline space-x-1.5 text-sm font-mono tracking-tighter">
        {timerSegments.map((segment, index) => (
          (segment.value > 0 || segment.label === 'seconds' || (segment.label === 'minutes' && timeLeft.hours > 0) || (segment.label === 'hours' && timeLeft.days > 0)) && (
            <motion.div key={segment.label} variants={itemVariants} className="flex items-baseline">
              <span className={`font-bold text-base ${isUrgent ? 'text-red-600' : 'text-gray-800'}`}>
                {String(segment.value).padStart(2, '0')}
              </span>
              <span className={`text-xs ml-0.5 ${isUrgent ? 'text-red-500' : 'text-gray-500'}`}>
                {segment.label.charAt(0)}
              </span>
              {index < timerSegments.length - 1 && <span className={`mx-0.5 ${isUrgent ? 'text-red-400' : 'text-gray-300'}`}>:</span>}
            </motion.div>
          )
        ))}
      </div>
    </motion.div>
  );
};

export default CountdownTimer;