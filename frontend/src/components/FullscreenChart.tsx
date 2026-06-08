import { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './ui/button';

interface FullscreenChartProps {
  children: React.ReactNode;
  title?: string;
  onClose?: () => void;
}

export const FullscreenChart = ({ children, title, onClose }: FullscreenChartProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        onClose?.();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setScale(1);

  if (!isFullscreen) {
    return (
      <div className="relative group">
        {children}
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="全屏查看"
        >
          <Maximize2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800">{title || '图表详情'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetZoom}
            title="重置"
          >
            <span className="text-sm font-medium w-6 text-center">{Math.round(scale * 100)}%</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(false)}
            title="退出全屏"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsFullscreen(false);
              onClose?.();
            }}
            className="text-red-500 hover:text-red-600"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div 
        className="flex-1 p-8 overflow-auto"
        style={{ 
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          minHeight: `${100 / scale}vh`,
          minWidth: `${100 / scale}vw`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FullscreenChart;
