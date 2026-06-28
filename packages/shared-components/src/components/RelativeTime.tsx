import React, { useEffect, useState } from 'react';
import { Typography, SxProps, Theme } from '@mui/material';
import { formatRelativeTime } from '@topems/shared-utils';

export interface RelativeTimeProps {
  date: string | Date;
  updateInterval?: number;
  showAbsolute?: boolean;
  sx?: SxProps<Theme>;
}

export const RelativeTime: React.FC<RelativeTimeProps> = ({
  date,
  updateInterval = 60000,
  showAbsolute = false,
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
      variant="body2"
      sx={{
        color: 'text.secondary',
        ...sx,
      }}
    >
      {relativeTime}
      {showAbsolute && (
        <Typography
          component="span"
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
