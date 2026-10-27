import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Modal } from '../Modal';

describe('Modal', () => {
  it('renders with title and children', () => {
    render(
      <Modal
        open={true}
