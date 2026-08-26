import React, { useCallback } from 'react';
import { IconButton } from '@mui/material';
import { Maximize2 } from 'lucide-react';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const FitBoundsControl: React.FC<{
  bounds: [number, number][] | undefined;
  mapRef: React.RefObject<any>;
}> = ({ bounds, mapRef }) => {
  const fitBounds = useCallback(() => {
    const map = mapRef.current;
    if (map && bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [mapRef, bounds]);

  return (
    <IconButton
      onClick={fitBounds}
      aria-label={i18n.t('gis.fit_bounds_control.k0')}
      title={i18n.t('gis.fit_bounds_control.k1')}
      sx={{
        padding: 1,
        backgroundColor: 'common.white',
        borderRadius: 2,
        boxShadow: designTokens.shadows.md,
        '&:hover': {
          backgroundColor: 'grey.50',
        },
        transition: 'background-color 0.2s',
      }}
    >
      <Maximize2
        size={20}
        style={{ color: 'var(--mui-palette-text-secondary)' }}
      />
    </IconButton>
  );
};

export default FitBoundsControl;
