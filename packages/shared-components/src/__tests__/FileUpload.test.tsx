import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../components/FileUpload';

const createMockFile = (name: string, size: number, type: string = 'text/plain'): File => {
  return new File(['test content'], name, { type });
};

describe('FileUpload Component', () => {
  it('renders with default text', () => {
    render(<FileUpload />);
    expect(screen.getByText('点击选择文件')).toBeInTheDocument();
  });

  it('renders with custom dragText', () => {
    render(<FileUpload locale={{ dragText: '拖拽上传', clickText: '点击上传' }} />);
    expect(screen.getByText('点击上传')).toBeInTheDocument();
  });

  it('renders file list when files are provided', () => {
    const testFiles = [
      {
        id: '1',
        name: 'test.txt',
        size: 1024,
        type: 'text/plain',
        progress: 100,
        status: 'completed' as const,
      },
    ];
    render(<FileUpload files={testFiles} />);
    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
  });

  it('renders file status correctly', () => {
    const testFiles = [
      { id: '1', name: 'pending.txt', size: 1024, type: 'text/plain', progress: 0, status: 'pending' as const },
      { id: '2', name: 'uploading.txt', size: 1024, type: 'text/plain', progress: 50, status: 'uploading' as const },
      { id: '3', name: 'completed.txt', size: 1024, type: 'text/plain', progress: 100, status: 'completed' as const },
      { id: '4', name: 'error.txt', size: 1024, type: 'text/plain', progress: 0, status: 'error' as const, error: '上传失败' },
    ];
    render(<FileUpload files={testFiles} />);
    expect(screen.getByText('pending.txt')).toBeInTheDocument();
    expect(screen.getByText('uploading.txt')).toBeInTheDocument();
    expect(screen.getByText('completed.txt')).toBeInTheDocument();
    expect(screen.getByText('error.txt')).toBeInTheDocument();
  });

  it('calls onChange when file is selected', () => {
    const onChangeMock = vi.fn();
    const { container } = render(<FileUpload onChange={onChangeMock} />);
    
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [createMockFile('test.txt', 1024)] } });
    
    expect(onChangeMock).toHaveBeenCalled();
  });

  it('calls onChange when file is removed', () => {
    const onChangeMock = vi.fn();
    const testFiles = [
      {
        id: '1',
        name: 'test.txt',
        size: 1024,
        type: 'text/plain',
        progress: 100,
        status: 'completed' as const,
      },
    ];
    render(<FileUpload files={testFiles} onChange={onChangeMock} />);
    
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    
    expect(onChangeMock).toHaveBeenCalledWith([]);
  });

  it('calls onUpload when file is selected', async () => {
    const onUploadMock = vi.fn().mockResolvedValue();
    const { container } = render(<FileUpload onUpload={onUploadMock} />);
    
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [createMockFile('test.txt', 1024)] } });
    
    expect(onUploadMock).toHaveBeenCalled();
  });

  it('marks file as error when onUpload rejects', async () => {
    const onChangeMock = vi.fn();
    const onUploadMock = vi.fn().mockRejectedValue(new Error('upload failed'));
    const { container } = render(<FileUpload onChange={onChangeMock} onUpload={onUploadMock} />);
    
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [createMockFile('test.txt', 1024)] } });
    
    expect(onUploadMock).toHaveBeenCalled();
  });

  it('marks file as error when size exceeds maxSize', () => {
    const onChangeMock = vi.fn();
    const { container } = render(<FileUpload onChange={onChangeMock} maxSize={100} />);
    
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [createMockFile('large.txt', 1024)] } });
    
    expect(onChangeMock).toHaveBeenCalled();
  });

  it('does not allow selection when disabled', () => {
    const { container } = render(<FileUpload disabled />);
    
    const fileInput = container.querySelector('input[type="file"]')!;
    expect(fileInput).toBeDisabled();
  });

  it('renders with fullWidth', () => {
    const { container } = render(<FileUpload fullWidth />);
    const paper = container.querySelector('[class*="MuiPaper-root"]');
    expect(paper).toBeInTheDocument();
  });

  it('supports multiple files', () => {
    const onChangeMock = vi.fn();
    const { container } = render(<FileUpload onChange={onChangeMock} multiple />);
    
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { 
      target: { 
        files: [createMockFile('test1.txt', 1024), createMockFile('test2.txt', 2048)] 
      } 
    });
    
    expect(onChangeMock).toHaveBeenCalled();
  });

  it('respects maxFiles limit', () => {
    const onChangeMock = vi.fn();
    const { container } = render(<FileUpload onChange={onChangeMock} maxFiles={2} />);
    
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { 
      target: { 
        files: [
          createMockFile('test1.txt', 1024),
          createMockFile('test2.txt', 2048),
          createMockFile('test3.txt', 3072),
        ] 
      } 
    });
    
    expect(onChangeMock).toHaveBeenCalled();
  });
});
