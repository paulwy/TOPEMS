// modules/shared/GisContext.tsx
import type React from 'react';
import { createContext } from 'react';
import type { MapModuleConfig } from '../MapModule/types';
import type { TrackRecord } from '../TrackModule/types';
import type { EvidenceRecord } from '../EvidenceModule/types';
import type { SyncStatus, ToolMode, DrawFeature } from './types';

// State Interface
export interface GisState {
