import React, { useState, useEffect, useRef } from 'react';
import { Box, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down' | 'fade';
  duration?: number;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  direction: propDirection,
  duration = 250,
}) => {
  const location = useLocation();
  const theme = useTheme();
  const [transitionStage, setTransitionStage] = useState<'enter' | 'entered' | 'exit'>('entered');
  const prevLocationRef = useRef(location);
  const historyRef = useRef<string[]>([location.pathname]);

  // 计算过渡方向
  const getDirection = (): 'left' | 'right' => {
    if (propDirection) {
      return propDirection === 'left' || propDirection === 'right' ? propDirection : 'right';
    }

    const currentPath = location.pathname;
    const prevPath = prevLocationRef.current.pathname;

    // 检查是否是返回操作
    const history = historyRef.current;
    const prevIndex = history.indexOf(currentPath);
    const isBack = prevIndex !== -1 && prevIndex < history.length - 2;

    if (isBack) {
      return 'left';
    }

    // 按路径深度判断
    const currentDepth = currentPath.split('/').filter(Boolean).length;
    const prevDepth = prevPath.split('/').filter(Boolean).length;

    if (currentDepth > prevDepth) return 'right';
    if (currentDepth < prevDepth) return 'left';

    return 'right';
  };

  const [direction, setDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    if (location.pathname === prevLocationRef.current.pathname) {
      return;
    }

    const dir = getDirection();
    setDirection(dir);

    // 更新历史记录
    historyRef.current = [...historyRef.current, location.pathname].slice(-10);

    // 开始退出动画
    setTransitionStage('exit');

    const timer = setTimeout(() => {
      prevLocationRef.current = location;
      setTransitionStage('enter');

      // 下一帧开始进入动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionStage('entered');
        });
      });
    }, duration * 0.8);

    return () => clearTimeout(timer);
  }, [location, duration]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '100%',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          transform:
            transitionStage === 'enter' || transitionStage === 'entered'
              ? 'translateX(0)'
              : direction === 'left'
                ? '-20%'
                : '20%',
          opacity: transitionStage === 'exit' ? 0 : 1,
          transition: `transform ${duration}ms ${theme.transitions.easing.easeInOut}, opacity ${duration}ms ${theme.transitions.easing.easeInOut}`,
          willChange: 'transform, opacity',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default PageTransition;
