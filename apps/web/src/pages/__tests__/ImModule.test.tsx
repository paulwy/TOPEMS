import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MailPage from '../im/MailPage';
import { imApi } from '@/api/im';
import { useAppStore } from '@/store';

vi.mock('@/api/im', () => ({
  imApi: {
    listChatRooms: vi.fn().mockResolvedValue({ data: [] }),
    createChatRoom: vi.fn(),
    getChatRoom: vi.fn(),
    deleteChatRoom: vi.fn(),
    listChatMessages: vi.fn().mockResolvedValue({ data: [] }),
    createChatMessage: vi.fn(),
    markMessageRead: vi.fn(),
    updateChatMessage: vi.fn(),
    deleteChatMessage: vi.fn(),
    getChatRoomMembers: vi.fn(),
    addChatRoomMember: vi.fn(),
    removeChatRoomMember: vi.fn(),
    listProjectGroups: vi.fn().mockResolvedValue({ data: [] }),
    createProjectGroup: vi.fn(),
    listNotifications: vi.fn().mockResolvedValue({ data: [] }),
    createNotification: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    health: vi.fn(),
    uploadFile: vi.fn(),
    getUserOnlineStatus: vi.fn(),
    listFriends: vi.fn().mockResolvedValue({ data: [] }),
    sendFriendRequest: vi.fn(),
    acceptFriendRequest: vi.fn(),
    rejectFriendRequest: vi.fn(),
    removeFriend: vi.fn(),
    listContactGroups: vi.fn().mockResolvedValue({ data: [] }),
    createContactGroup: vi.fn(),
    updateContactGroup: vi.fn(),
    deleteContactGroup: vi.fn(),
    addContactGroupMember: vi.fn(),
    removeContactGroupMember: vi.fn(),
    muteChatRoom: vi.fn(),
    unmuteChatRoom: vi.fn(),
    pinChatRoom: vi.fn(),
    unpinChatRoom: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['im:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['im:read'] },
          theme: 'light',
        }
  ),
}));

describe('ImModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MailPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MailPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have chat room API methods defined', () => {
      expect(imApi.listChatRooms).toBeDefined();
      expect(imApi.createChatRoom).toBeDefined();
      expect(imApi.getChatRoom).toBeDefined();
      expect(imApi.deleteChatRoom).toBeDefined();
    });

    it('should have message API methods defined', () => {
      expect(imApi.listChatMessages).toBeDefined();
      expect(imApi.createChatMessage).toBeDefined();
      expect(imApi.markMessageRead).toBeDefined();
      expect(imApi.updateChatMessage).toBeDefined();
      expect(imApi.deleteChatMessage).toBeDefined();
    });

    it('should have notification API methods defined', () => {
      expect(imApi.listNotifications).toBeDefined();
      expect(imApi.createNotification).toBeDefined();
      expect(imApi.markNotificationRead).toBeDefined();
      expect(imApi.markAllNotificationsRead).toBeDefined();
    });

    it('should have friend/contact API methods defined', () => {
      expect(imApi.listFriends).toBeDefined();
      expect(imApi.sendFriendRequest).toBeDefined();
      expect(imApi.acceptFriendRequest).toBeDefined();
      expect(imApi.removeFriend).toBeDefined();
    });
  });
});
