import React, { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: React.ReactNode;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const DefaultPlaceholder = () => (
  <Box
    sx={{
      backgroundColor: 'grey.200',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    }}
  >
    <svg
      width='32'
      height='32'
      viewBox='0 0 24 24'
      fill='none'
      stroke='text.disabled'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <rect
        x='3'
        y='3'
        width='18'
        height='18'
        rx='2'
        ry='2'
      />
      <circle
        cx='8.5'
        cy='8.5'
        r='1.5'
        fill='currentColor'
      />
      <polyline points='21 15 16 10 5 21' />
    </svg>
  </Box>
);

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  style = {},
  placeholder = <DefaultPlaceholder />,
  fallbackSrc,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const imgElement = entry.target as HTMLImageElement;
            imgElement.src = imgElement.dataset.src || '';
            observerRef.current?.unobserve(imgElement);
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    observerRef.current.observe(img);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError && fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        style={style}
        onLoad={onLoad}
      />
    );
  }

  return (
    <Box
      className={className}
      sx={style}
    >
      {!isLoaded && placeholder}
      <img
        ref={imgRef}
        data-src={src}
        alt={alt}
        style={{
          display: isLoaded ? 'block' : 'none',
          width: '100%',
          height: 'auto',
          ...style,
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </Box>
  );
};

export default LazyImage;
