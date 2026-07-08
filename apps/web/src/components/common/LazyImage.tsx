import React, { useState, useRef, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholderColor?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  style?: React.CSSProperties;
  aspectRatio?: number;
  maxWidth?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholderColor = '#e2e8f0',
  fallbackSrc,
  onLoad,
  onError,
  className,
  style,
  aspectRatio,
  maxWidth = '100%',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    onError?.();
  };

  return (
    <Box
      ref={imgRef}
      className={className}
      style={{
        position: 'relative',
        maxWidth,
        width: '100%',
        ...(aspectRatio && {
          aspectRatio,
        }),
        ...style,
      }}
    >
      {!isLoaded && !isError && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundColor: placeholderColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}

      {(isInView || isLoaded) && (
        <img
          src={isError && fallbackSrc ? fallbackSrc : src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            ...(isLoaded && {
              position: 'relative',
              zIndex: 1,
            }),
          }}
        />
      )}
    </Box>
  );
};

export default LazyImage;
