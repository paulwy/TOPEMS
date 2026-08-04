import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: React.ReactNode;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  style = {},
  placeholder = (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'grey.100',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
      }}
    >
      <svg
        width='40'
        height='40'
        viewBox='0 0 24 24'
        fill='none'
        stroke='#cbd5e1'
        strokeWidth='1.5'
      >
        <rect
          x='3'
          y='3'
          width='18'
          height='18'
          rx='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <circle
          cx='8.5'
          cy='8.5'
          r='1.5'
          fill='#cbd5e1'
        />
        <polyline
          points='21 15 16 10 5 21'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </div>
  ),
  fallback,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer.disconnect();
            setIsLoaded(true);
          }
        });
      },
      {
        rootMargin: '0px 0px 200px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError && fallback) {
    return (
      <img
        src={fallback}
        alt={alt}
        className={className}
        style={style}
        onLoad={handleLoad}
      />
    );
  }

  return (
    <div
      ref={imgRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
          }}
        >
          {placeholder}
        </div>
      )}
      <img
        src={isLoaded ? src : ''}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

export default LazyImage;
