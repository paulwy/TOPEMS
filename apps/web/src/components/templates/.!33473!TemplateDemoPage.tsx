import {
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Box,
  TextField,
  FormControl,
  FormLabel,
  Typography,
  Chip,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useState, useEffect } from 'react';

import { Download, Play, RefreshCw, FileText, Settings, Sparkles, Search } from 'lucide-react';
import type { Template, TemplateCategory, TemplateVariable } from '../../api/template';
import { logger } from '@/utils/logger';

