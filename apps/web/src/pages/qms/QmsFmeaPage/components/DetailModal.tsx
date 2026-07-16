import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Tabs,
  Tab,
  Chip,
  Button,
} from '@mui/material';
import type { FmeaAnalysis, FmeaItem, FmeaStatistics } from '@/api/qms';
import { getStatusBadge } from '../utils';
import FmeaItemsTable from './FmeaItemsTable';
import StatisticsPanel from './StatisticsPanel';

interface DetailModalProps {
  open: boolean;
  selectedAnalysis: FmeaAnalysis | null;
  activeTab: number;
  fmeaItems: FmeaItem[];
  statistics: FmeaStatistics | null;
  loadingItems: boolean;
  onClose: () => void;
  onTabChange: (value: number) => void;
  onViewItem: (item: FmeaItem) => void;
  onEditItem: (item: FmeaItem) => void;
  onAddItem: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({
  open,
  selectedAnalysis,
  activeTab,
  fmeaItems,
  statistics,
  loadingItems,
  onClose,
  onTabChange,
  onViewItem,
  onEditItem,
  onAddItem,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
    >
      <DialogTitle>
        {selectedAnalysis?.fmeaName}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          {getStatusBadge(selectedAnalysis?.status || '')}
          <Chip
            label={selectedAnalysis?.fmeaType === 'design' ? '设计 FMEA' : '过程 FMEA'}
            size='small'
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        {selectedAnalysis && (
          <Box sx={{ mt: 1 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => onTabChange(v)}
              sx={{ mb: 2 }}
            >
              <Tab label='风险项列表' />
              <Tab label='统计信息' />
            </Tabs>

            {activeTab === 0 && (
              <FmeaItemsTable
                items={fmeaItems}
                loading={loadingItems}
                onViewItem={onViewItem}
                onEditItem={onEditItem}
                onAddItem={onAddItem}
              />
            )}

            {activeTab === 1 && statistics && (
              <StatisticsPanel statistics={statistics} />
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetailModal;
