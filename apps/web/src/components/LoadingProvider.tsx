import type { ReactNode, CSSProperties } from 'react';
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  memo,
} from 'react';
import {
  // TODO(v2-phase2): Replace CircularProgress with LoadingSpinner from '@/components/common/LoadingSpinner'. Complex usage found - manual review needed.
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Paper,
  Skeleton,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

// ============================================================================
// Types
// ============================================================================

export type LoadingMode = 'fullscreen' | 'inline' | 'overlay' | 'skeleton';
export type ProgressType = 'linear' | 'circular' | 'none';

export interface LoadingOptions {
  mode?: LoadingMode;
  progress?: number; // 0-100
  progressType?: ProgressType;
  timeout?: number; // milliseconds
  timeoutMessage?: string;
  skeleton?: SkeletonOptions;
  customIcon?: ReactNode;
  customMessage?: string;
}

export interface SkeletonOptions {
  rows?: number;
  avatar?: boolean;
  actions?: number;
  variant?: 'text' | 'card' | 'table' | 'custom';
  width?: number | string;
  height?: number | string;
}

interface LoadingContextType {
  isLoading: boolean;
  message: string;
  options: LoadingOptions;
  startLoading: (message?: string, options?: LoadingOptions) => void;
  stopLoading: () => void;
  updateProgress: (progress: number) => void;
  updateMessage: (message: string) => void;
}

interface ExtendedLoadingOptions extends LoadingOptions {
  onTimeout?: () => void;
}

// ============================================================================
// Context
// ============================================================================

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// ============================================================================
// Skeleton Components
// ============================================================================

const SkeletonText: React.FC<{ lines?: number; lastLineWidth?: string }> = memo(
  ({ lines = 5, lastLineWidth = '60%' }) => {
    return (
      <Box sx={{ width: '100%', px: 2 }}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            variant='text'
            sx={{ fontSize: '1rem', mb: 0.5 }}
            width={index === lines - 1 ? lastLineWidth : '100%'}
            animation='wave'
          />
        ))}
      </Box>
    );
  }
);
SkeletonText.displayName = 'SkeletonText';

const SkeletonCard: React.FC<{ avatar?: boolean; actions?: number }> = memo(
  ({ avatar = true, actions = 2 }) => {
    return (
      <Card sx={{ maxWidth: 345, m: 1 }}>
        <CardContent>
          {avatar && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Skeleton
                variant='circular'
                width={40}
                height={40}
                animation='wave'
              />
              <Box sx={{ ml: 1.5, flex: 1 }}>
                <Skeleton
                  variant='text'
                  width='60%'
                  animation='wave'
                />
                <Skeleton
                  variant='text'
                  width='40%'
                  height={12}
                  animation='wave'
                />
              </Box>
            </Box>
          )}
          <Skeleton
            variant='text'
            width='100%'
            animation='wave'
          />
          <Skeleton
            variant='text'
            width='90%'
            animation='wave'
          />
          <Skeleton
            variant='text'
            width='75%'
            animation='wave'
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            {Array.from({ length: actions }).map((_, index) => (
              <Skeleton
                key={index}
                variant='rectangular'
                width={60}
                height={32}
                sx={{ borderRadius: 1 }}
                animation='wave'
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }
);
SkeletonCard.displayName = 'SkeletonCard';

const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = memo(
  ({ rows = 5, columns = 4 }) => {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {Array.from({ length: columns }).map((_, index) => (
                <TableCell key={index}>
                  <Skeleton
                    variant='text'
                    width='80%'
                    animation='wave'
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton
                      variant='text'
                      width='70%'
                      animation='wave'
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
);
SkeletonTable.displayName = 'SkeletonTable';

export { SkeletonText, SkeletonCard, SkeletonTable };

// ============================================================================
// Progress Components
// ============================================================================

const LinearProgressBar: React.FC<{ progress: number }> = memo(({ progress }) => (
  <Box sx={{ width: '100%', mb: 1 }}>
    <LinearProgress
      variant='determinate'
      value={progress}
      sx={{
        height: 6,
        borderRadius: 3,
        backgroundColor: 'grey.200',
        '& .MuiLinearProgress-bar': {
          borderRadius: 3,
        },
      }}
    />
  </Box>
));
LinearProgressBar.displayName = 'LinearProgressBar';

const CircularProgressBar: React.FC<{ progress: number }> = memo(({ progress }) => (
  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
    <CircularProgress
      variant='determinate'
      value={progress}
      size={80}
      thickness={4}
      sx={{ color: 'primary.main' }}
    />
    <Box
      sx={{
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography
        variant='caption'
        sx={{ component: 'div', color: 'text.secondary', fontWeight: 'bold' }}
      >
        {`${Math.round(progress)}%`}
      </Typography>
    </Box>
  </Box>
));
CircularProgressBar.displayName = 'CircularProgressBar';

// ============================================================================
// Loading Spinner
// ============================================================================

const LoadingSpinner: React.FC<{ size?: number; customIcon?: ReactNode }> = memo(
  ({ size = 48, customIcon }) => {
    if (customIcon) {
      return <Box sx={{ fontSize: size }}>{customIcon}</Box>;
    }
    return (
      <CircularProgress
        size={size}
        thickness={4}
        sx={{
          color: 'primary.main',
          animation: 'spin 1s linear infinite',
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        }}
      />
    );
  }
);
LoadingSpinner.displayName = 'LoadingSpinner';

// ============================================================================
// Fullscreen Loader
// ============================================================================

const FullscreenLoader: React.FC<{
  message: string;
  progress: number;
  progressType: ProgressType;
  customIcon?: ReactNode;
  timeoutWarning?: boolean;
}> = memo(({ message, progress, progressType, customIcon, timeoutWarning }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 4,
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 280,
          maxWidth: 400,
        }}
      >
        <Box sx={{ mb: 2 }}>
          <LoadingSpinner
            size={56}
            customIcon={customIcon}
          />
        </Box>

        <Typography
          variant='h6'
          color='text.primary'
          sx={{ mb: 1, textAlign: 'center' }}
        >
          {message}
        </Typography>

        {progressType !== 'none' && progress > 0 && (
          <Box sx={{ width: '100%', mt: 2 }}>
            {progressType === 'linear' ? (
              <LinearProgressBar progress={progress} />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <CircularProgressBar progress={progress} />
              </Box>
            )}
          </Box>
        )}

        {timeoutWarning && (
          <Typography
            variant='caption'
            color='warning.main'
            sx={{ mt: 1 }}
          >
            加载时间过长，请稍候...
          </Typography>
        )}
      </Paper>
    </Box>
  );
});
FullscreenLoader.displayName = 'FullscreenLoader';

// ============================================================================
// Overlay Loader
// ============================================================================

const OverlayLoader: React.FC<{
  message: string;
  progress: number;
  progressType: ProgressType;
  customIcon?: ReactNode;
}> = memo(({ message, progress, progressType, customIcon }) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderRadius: 'inherit',
      }}
    >
      <LoadingSpinner
        size={40}
        customIcon={customIcon}
      />
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mt: 1 }}
      >
        {message}
      </Typography>

      {progressType !== 'none' && progress > 0 && (
        <Box sx={{ width: '80%', mt: 1 }}>
          {progressType === 'linear' ? (
            <LinearProgressBar progress={progress} />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgressBar progress={progress} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
});
OverlayLoader.displayName = 'OverlayLoader';

// ============================================================================
// Inline Loader
// ============================================================================

const InlineLoader: React.FC<{
  message: string;
  progress: number;
  progressType: ProgressType;
  customIcon?: ReactNode;
}> = memo(({ message, progress, progressType, customIcon }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
      <LoadingSpinner
        size={32}
        customIcon={customIcon}
      />
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mt: 1 }}
      >
        {message}
      </Typography>

      {progressType !== 'none' && progress > 0 && (
        <Box sx={{ width: '100%', mt: 1 }}>
          {progressType === 'linear' ? (
            <LinearProgressBar progress={progress} />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgressBar progress={progress} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
});
InlineLoader.displayName = 'InlineLoader';

// ============================================================================
// Skeleton Loader
// ============================================================================

const SkeletonLoader: React.FC<{ options: SkeletonOptions }> = memo(({ options }) => {
  const { rows = 5, avatar = true, actions = 2, variant = 'text', width, height } = options;

  const skeletonStyle: CSSProperties = width || height ? { width, height } : {};

  switch (variant) {
    case 'card':
      return (
        <SkeletonCard
          avatar={avatar}
          actions={actions}
        />
      );
    case 'table':
      return (
        <SkeletonTable
          rows={rows}
          columns={4}
        />
      );
    case 'text':
    default:
      return (
        <Box sx={{ width: '100%', ...skeletonStyle }}>
          <SkeletonText lines={rows} />
        </Box>
      );
  }
});
SkeletonLoader.displayName = 'SkeletonLoader';

// ============================================================================
// Main Provider Component
// ============================================================================

interface LoadingProviderProps {
  children: ReactNode;
}

const defaultOptions: LoadingOptions = {
  mode: 'fullscreen',
  progress: 0,
  progressType: 'none',
  timeout: 0,
  timeoutMessage: '加载时间过长，请稍候...',
  skeleton: {
    rows: 5,
    avatar: true,
    actions: 2,
    variant: 'text',
  },
};

export const LoadingProvider: React.FC<LoadingProviderProps> = memo(({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('加载中...');
  const [options, setOptions] = useState<ExtendedLoadingOptions>(defaultOptions);
  const [progress, setProgress] = useState(0);
  const [progressType, setProgressType] = useState<ProgressType>('none');
  const [mode, setMode] = useState<LoadingMode>('fullscreen');
  const [skeletonOptions, setSkeletonOptions] = useState<SkeletonOptions>(defaultOptions.skeleton!);
  const [customIcon, setCustomIcon] = useState<ReactNode | undefined>(undefined);
  const [timeoutWarning, setTimeoutWarning] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (timeoutWarningRef.current) clearTimeout(timeoutWarningRef.current);
    };
  }, []);

  const startLoading = useCallback((msg: string = '加载中...', opts: LoadingOptions = {}) => {
    // Clear any existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (timeoutWarningRef.current) clearTimeout(timeoutWarningRef.current);

    const mergedOptions: ExtendedLoadingOptions = { ...defaultOptions, ...opts };

    setIsLoading(true);
    setMessage(msg || mergedOptions.customMessage || '加载中...');
    setProgress(mergedOptions.progress || 0);
    setProgressType(mergedOptions.progressType || 'none');
    setMode(mergedOptions.mode || 'fullscreen');
    setSkeletonOptions(mergedOptions.skeleton || defaultOptions.skeleton!);
    setCustomIcon(mergedOptions.customIcon);
    setTimeoutWarning(false);
    setOptions(mergedOptions);

    // Set timeout warning (if timeout > 5 seconds, show warning at 5s)
    if (mergedOptions.timeout && mergedOptions.timeout > 5000) {
      timeoutWarningRef.current = setTimeout(() => {
        setTimeoutWarning(true);
      }, 5000);
    }

    // Set overall timeout
    if (mergedOptions.timeout) {
      timeoutRef.current = setTimeout(() => {
        mergedOptions.onTimeout?.();
        setIsLoading(false);
      }, mergedOptions.timeout);
    }
  }, []);

  const stopLoading = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (timeoutWarningRef.current) clearTimeout(timeoutWarningRef.current);
    setIsLoading(false);
    setProgress(0);
    setProgressType('none');
    setTimeoutWarning(false);
  }, []);

  const updateProgress = useCallback((newProgress: number) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
  }, []);

  const updateMessage = useCallback((newMessage: string) => {
    setMessage(newMessage);
  }, []);

  const contextValue = useMemo(
    () => ({
      isLoading,
      message,
      options,
      startLoading,
      stopLoading,
      updateProgress,
      updateMessage,
    }),
    [isLoading, message, options, startLoading, stopLoading, updateProgress, updateMessage]
  );

  // Render based on mode
  const renderLoader = () => {
    if (!isLoading) return null;

    switch (mode) {
      case 'inline':
        return (
          <InlineLoader
            message={message}
            progress={progress}
            progressType={progressType}
            customIcon={customIcon}
          />
        );
      case 'overlay':
        return (
          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            <OverlayLoader
              message={message}
              progress={progress}
              progressType={progressType}
              customIcon={customIcon}
            />
          </Box>
        );
      case 'skeleton':
        return <SkeletonLoader options={skeletonOptions} />;
      case 'fullscreen':
      default:
        return (
          <FullscreenLoader
            message={message}
            progress={progress}
            progressType={progressType}
            customIcon={customIcon}
            timeoutWarning={timeoutWarning}
          />
        );
    }
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      {mode === 'fullscreen' || mode === 'overlay' ? (
        renderLoader()
      ) : (
        <>
          {isLoading && mode === 'inline' && (
            <InlineLoader
              message={message}
              progress={progress}
              progressType={progressType}
              customIcon={customIcon}
            />
          )}
          {isLoading && mode === 'skeleton' && <SkeletonLoader options={skeletonOptions} />}
        </>
      )}
    </LoadingContext.Provider>
  );
});
LoadingProvider.displayName = 'LoadingProvider';

export default LoadingProvider;
