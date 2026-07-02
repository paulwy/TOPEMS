import React, { useState, useRef, useEffect } from 'react';
import { Box } from '@mui/material';

interface LazyImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallbackSrc = '',
  width = '100%',
  height = 'auto',
  className,
  style = {},
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
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
  };

  const handleError = () => {
    if (fallbackSrc) {
      setIsLoaded(false);
    }
  };

  return (
    <Box
      ref={imgRef}
      sx={{
        width,
        height,
        backgroundColor: '#f5f5f5',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
      className={className}
    >
      {!isLoaded && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.4 },
              '50%': { opacity: 0.8 },
            },
          }}
        />
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      )}
    </Box>
  );
};

export default LazyImage;
