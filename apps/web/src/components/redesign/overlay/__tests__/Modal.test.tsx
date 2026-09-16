import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Modal } from '../Modal';

describe('Modal', () => {
  it('renders with title and children', () => {
    render(
      <Modal
        open={true}
        title='新建客户'
        onClose={() => {}}
      >
        <div>模态框内容</div>
      </Modal>
    );

    expect(screen.getByText('新建客户')).toBeInTheDocument();
    expect(screen.getByText('模态框内容')).toBeInTheDocument();
  });

  it('renders with footer', () => {
    render(
      <Modal
        open={true}
        title='新建客户'
        onClose={() => {}}
        footer={<button>保存</button>}
      >
        <div>模态框内容</div>
      </Modal>
    );

    expect(screen.getByText('保存')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal
        open={false}
        title='新建客户'
        onClose={() => {}}
      >
        <div>模态框内容</div>
      </Modal>
    );

    expect(screen.queryByText('新建客户')).not.toBeInTheDocument();
  });
});
