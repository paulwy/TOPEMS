import React, { useState, useEffect, useRef, useCallback } from 'react';
import PageLoader from './PageLoader';
import {
  i18nReady,
  registerI18nForceUpdate,
  hasPendingResourceUpdate,
  clearPendingResourceUpdate,
} from '@/i18n';
import { pluginManager } from '@/lib/plugin-loader/pluginManager';
import { ensureShortcutsLoaded } from '@/store/shortcutsStore';

interface I18nReadyGateProps {
  children: React.ReactNode;
}

/**
