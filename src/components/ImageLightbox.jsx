import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

const ImageLightbox = ({ imageUrl, open, onOpenChange }) => {
  if (!imageUrl) return null;

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      onOpenChange(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 bg-transparent border-0 w-auto h-auto max-w-[90vw] max-h-[90vh] flex items-center justify-center shadow-none">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative"
        >
          <img src={imageUrl} alt="Enlarged view" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
          <button
            onClick={() => handleOpenChange(false)}
            className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 text-gray-800 hover:bg-gray-200 transition-colors z-50"
            aria-label="Close image view"
          >
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageLightbox;