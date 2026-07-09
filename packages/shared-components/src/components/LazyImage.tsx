import React, { useState, useCallback } from 'react';
import { Box, Skeleton } from '@mui/material';
import { useIntersectionObserver } from '@topems/shared-hooks';

export interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  placeholder?: React.ReactNode;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
  rootMargin?: string;
  threshold?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  borderRadius?: number | string;
}

const DefaultPlaceholder: React.FC<{
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
}> = ({ width = '100%', height = '100%', borderRadius = 0 }) => (
  <Skeleton
    variant='rectangular'
    animation='wave'
    width={width}
    height={height}
    sx={{ borderRadius }}
  />
);

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  style,
  width,
  height,
  placeholder,
  fallbackSrc,
  onLoad,
  onError,
  rootMargin = '100px',
  threshold = 0.1,
  objectFit = 'cover',
  borderRadius = 0,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');

  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold,
    triggerOnce: true,
    initialIsIntersecting: false,
  });

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (fallbackSrc && !hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    } else {
      setHasError(true);
      onError?.();
    }
  }, [fallbackSrc, hasError, onError]);

  React.useEffect(() => {
    if (isIntersecting && !imgSrc) {
      setImgSrc(src);
    }
  }, [isIntersecting, src, imgSrc]);

  React.useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setImgSrc('');
  }, [src]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...style,
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit,
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    display: 'block',
  };

  return (
    <Box
      ref={ref}
      className={className}
      style={containerStyle}
    >
      {!isLoaded &&
        (placeholder || (
          <DefaultPlaceholder
            width={width}
            height={height}
            borderRadius={borderRadius}
          />
        ))}
      {imgSrc && (
        <img
          src={imgSrc}
          alt={alt}
          style={imgStyle}
          onLoad={handleLoad}
          onError={handleError}
          loading='lazy'
        />
      )}
    </Box>
  );
};

export default LazyImage;
