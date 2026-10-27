import React from 'react';
import { Box, Typography, Paper, Button, Checkbox, Avatar, Badge, IconButton } from '@mui/material';
import { Grid } from '@/components';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Phone } from 'lucide-react';
import { useAuth } from '@/hooks';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

