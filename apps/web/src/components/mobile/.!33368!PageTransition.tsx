import React, { useState, useEffect, useRef, useCallback } from 'react';
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

