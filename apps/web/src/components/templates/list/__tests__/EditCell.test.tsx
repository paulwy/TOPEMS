import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { renderWithProviders } from '@/__tests__/test-utils';
import type { ColumnDef } from '../types';
