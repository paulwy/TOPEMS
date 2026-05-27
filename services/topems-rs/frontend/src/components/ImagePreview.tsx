import React, { useState, useCallback } from 'react';

export interface ImagePreviewProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, images]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      <div className="max-w-full max-h-full">
        <img
          src={images[currentIndex]}
          alt={`Preview ${currentIndex + 1}`}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
        {images.length > 1 && (
          <div className="mt-4 text-center text-white">
            <span className="text-lg">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-4 flex space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export interface ImageGalleryProps {
  images: { url: string; alt?: string }[];
  columns?: number;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, columns = 4 }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const imageUrls = images.map((img) => img.url);

  return (
    <>
      <div className={`grid grid-cols-2 sm:grid-cols-${columns} gap-2`}>
        {images.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => {
              setPreviewIndex(index);
              setIsPreviewOpen(true);
            }}
          >
            <img
              src={image.url}
              alt={image.alt || `Image ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-colors flex items-center justify-center">
              <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
      <ImagePreview
        images={imageUrls}
        initialIndex={previewIndex}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
};

export default ImagePreview;
