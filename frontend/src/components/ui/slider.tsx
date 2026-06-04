'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  max?: number;
  min?: number;
  step?: number;
  className?: string;
}

export function Slider({ value, onValueChange, max = 100, min = 0, step = 1, className }: SliderProps) {
  return (
    <input
      type='range'
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      className={cn('w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary', className)}
    />
  );
}
