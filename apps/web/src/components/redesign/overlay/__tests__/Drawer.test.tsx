import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Drawer } from '../Drawer';

describe('Drawer', () => {
  it('renders with title and children', () => {
    render(
      <Drawer
        open={true}
        title='客户详情'
        onClose={() => {}}
      >
        <div>抽屉内容</div>
      </Drawer>
    );

    expect(screen.getByText('客户详情')).toBeInTheDocument();
    expect(screen.getByText('抽屉内容')).toBeInTheDocument();
  });

  it('renders with footer', () => {
    render(
      <Drawer
        open={true}
        title='客户详情'
        onClose={() => {}}
        footer={<button>关闭</button>}
      >
        <div>抽屉内容</div>
      </Drawer>
    );

    expect(screen.getByText('关闭')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Drawer
        open={false}
        title='客户详情'
        onClose={() => {}}
      >
        <div>抽屉内容</div>
      </Drawer>
    );

    expect(screen.queryByText('客户详情')).not.toBeInTheDocument();
  });
});
