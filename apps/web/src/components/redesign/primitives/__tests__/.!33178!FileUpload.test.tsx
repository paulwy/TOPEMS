import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { FileUpload } from '../FileUpload';

describe('FileUpload', () => {
  it('renders with hint', () => {
    render(<FileUpload hint='点击或拖拽文件到此处上传' />);

    expect(screen.getByText('点击或拖拽文件到此处上传')).toBeInTheDocument();
  });

  it('renders with disabled state', () => {
    render(<FileUpload disabled={true} />);

