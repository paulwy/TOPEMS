import React, { useState, useRef, type ChangeEvent } from 'react';
import { Box, TextField, FormLabel, Divider, Typography, Button } from '@mui/material';
import { Plus, Trash2, Save, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

type NodeType = 'start' | 'task' | 'approval' | 'condition' | 'end';
export interface NodeData {
  id: string;
  type: string;
  x: number;
  y: number;
  label: string;
  description?: string;
  approvers?: string[];
}
export interface EdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}
const NODE_ICONS: Record<string, string> = {
  start: '▶',
