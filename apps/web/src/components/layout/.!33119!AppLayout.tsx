import React from 'react';
import ErrorBoundary from '../ErrorBoundary';
import { NotificationProvider } from '../notification/NotificationProvider';
import { LoadingProvider } from '../LoadingProvider';
import { ThemeProvider } from '../ThemeProvider';
import { AuthProvider } from '../../hooks/useAuth';
import { PluginProvider } from '../../context/PluginContext';

/**
