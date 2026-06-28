import React, { useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import { formatRelativeTime } from '@/utils/format';

export interface RelativeTimeProps {
  date: string | Date;
  format?: string;
  updateInterval?: number;
  showAbsolute?: boolean;
  absoluteFormat?: string;
  sx?: any;
}

export const RelativeTime: React.FC<RelativeTimeProps> = ({
  date,
  _format = 'YYYY-MM-DD HH:mm:ss',
  updateInterval = 60000,
  showAbsolute = false,
  _absoluteFormat = 'YYYY-MM-DD HH:mm:ss',
  sx,
}) => {
  const [relativeTime, setRelativeTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const dateString = date instanceof Date ? date.toISOString() : date;
      setRelativeTime(formatRelativeTime(dateString));
    };

    updateTime();

    const timer = setInterval(updateTime, updateInterval);

    return () => {
      clearInterval(timer);
    };
  }, [date, updateInterval]);

  return (
    <Typography
      variant='body2'
      sx={{
        color: 'text.secondary',
        ...sx,
      }}
    >
      {relativeTime}
      {showAbsolute && (
        <Typography
          component='span'
          sx={{ ml: 1, opacity: 0.6, fontSize: 'inherit' }}
        >
          (
          {date instanceof Date ? formatRelativeTime(date.toISOString()) : formatRelativeTime(date)}
          )
        </Typography>
      )}
    </Typography>
  );
};

export default RelativeTime;
