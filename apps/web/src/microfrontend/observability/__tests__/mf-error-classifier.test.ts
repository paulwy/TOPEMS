import { describe, it, expect } from 'vitest';
import {
  classifyMFError,
  getUserMessage,
  shouldShowToast,
  shouldSuppressToast,
  type MFErrorEvent,
} from '../mf-error-classifier';
