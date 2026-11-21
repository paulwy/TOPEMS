import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import DashboardPage from '../DashboardPage';

// 模板仪表盘页：mock imApi.listChatRooms 返回确定性房间数据，
// setup-mocks 的 DashboardTemplate 会渲染 stat cards（title+value），
// 断言统计卡标题（真实中文）与按房间数据计算出的数值。
vi.mock('@/api/im', () => ({
  imApi: {
    listChatRooms: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: [
        {
          id: 'room-1',
          room_type: 'group',
          name: '研发讨论组',
          members: [{ id: 'u1' }, { id: 'u2' }],
        },
        {
          id: 'room-2',
          room_type: 'direct',
          name: '与张三的会话',
          members: [{ id: 'u3' }],
        },
      ],
    }),
    createChatRoom: vi.fn(),
    getChatRoom: vi.fn(),
    deleteChatRoom: vi.fn(),
  },
}));

describe('im DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders four stat cards with computed values from rooms data', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stat-card-total-rooms')).toBeInTheDocument();
    });

    // 总数 = 2（1 群聊 + 1 直聊）；成员数 = 2 + 1 = 3
    expect(screen.getByTestId('stat-card-total-rooms')).toHaveTextContent('聊天室总数');
    expect(screen.getByTestId('stat-card-total-rooms')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-card-group-rooms')).toHaveTextContent('群聊');
    expect(screen.getByTestId('stat-card-group-rooms')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-card-direct-rooms')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-card-total-members')).toHaveTextContent('3');
  });
});
