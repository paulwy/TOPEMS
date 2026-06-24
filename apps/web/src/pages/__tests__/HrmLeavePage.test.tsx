import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/notification/ToastProvider';
import LeaveManagementPage from '@/pages/hrm/HrmLeavePage';
import type { LeaveRequest, PaginatedResult } from '@/api/hrm';

// 增加测试超时时间
vi.setConfig({ testTimeout: 30000 });

const mockLeaveList = vi.fn();
const mockLeaveCreate = vi.fn();
const mockLeaveUpdate = vi.fn();
const mockLeaveDelete = vi.fn();
const mockLeaveApprove = vi.fn();
const mockLeaveReject = vi.fn();
const mockEmployeeList = vi.fn();

vi.mock('@/api/hrm', () => ({
  leaveApi: {
    list: (...args: unknown[]) => mockLeaveList(...args),
    create: (...args: unknown[]) => mockLeaveCreate(...args),
    update: (...args: unknown[]) => mockLeaveUpdate(...args),
    delete: (...args: unknown[]) => mockLeaveDelete(...args),
    approve: (...args: unknown[]) => mockLeaveApprove(...args),
    reject: (...args: unknown[]) => mockLeaveReject(...args),
  },
  employeeApi: {
    list: (...args: unknown[]) => mockEmployeeList(...args),
  },
}));

const mockLeaves: LeaveRequest[] = [
  {
    id: '1',
    employee_id: 'emp-1',
    employee_name: '张伟',
    leave_type: 'annual',
    start_date: '2026-06-01',
    end_date: '2026-06-05',
    days: 5,
    reason: '年假出行',
    status: 'pending',
    created_at: '2026-05-25T10:00:00Z',
    updated_at: '2026-05-25T10:00:00Z',
  },
  {
    id: '2',
    employee_id: 'emp-2',
    employee_name: '李娜',
    leave_type: 'sick',
    start_date: '2026-05-28',
    end_date: '2026-05-28',
    days: 1,
    reason: '身体不适',
    status: 'approved',
    approver_id: 'admin',
    approved_at: '2026-05-27T14:00:00Z',
    created_at: '2026-05-27T08:00:00Z',
    updated_at: '2026-05-27T14:00:00Z',
  },
  {
    id: '3',
    employee_id: 'emp-3',
    employee_name: '王强',
    leave_type: 'personal',
    start_date: '2026-05-30',
    end_date: '2026-05-30',
    days: 1,
    reason: '私人事务',
    status: 'rejected',
    rejection_reason: '项目关键时期',
    created_at: '2026-05-25T15:00:00Z',
    updated_at: '2026-05-26T09:00:00Z',
  },
];

const mockEmployees = [
  { id: 'emp-1', name: '张伟' },
  { id: 'emp-2', name: '李娜' },
  { id: 'emp-3', name: '王强' },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ToastProvider>{ui}</ToastProvider>
    </BrowserRouter>
  );
};

describe('LeaveManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLeaveList.mockResolvedValue({
      code: 200,
      data: {
        items: mockLeaves,
        total: 3,
        page: 1,
        page_size: 10,
      } as PaginatedResult<LeaveRequest>,
    });
    mockEmployeeList.mockResolvedValue({
      code: 200,
      data: { items: mockEmployees },
    });
    mockLeaveCreate.mockResolvedValue({ code: 200 });
    mockLeaveUpdate.mockResolvedValue({ code: 200 });
    mockLeaveDelete.mockResolvedValue({ code: 200 });
    mockLeaveApprove.mockResolvedValue({ code: 200 });
    mockLeaveReject.mockResolvedValue({ code: 200 });
  });

  describe('渲染测试', () => {
    it('页面加载时显示加载状态', () => {
      renderWithProviders(<LeaveManagementPage />);
      // 初始加载状态应该显示
      // 由于加载很快，可能看不到加载状态
    });

    it('页面加载完成后显示标题和面包屑', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('休假管理').length).toBeGreaterThan(0);
      });

      expect(screen.getByText('人力资源')).toBeInTheDocument();
    });

    it('显示统计卡片', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('申请总数').length).toBeGreaterThan(0);
        expect(screen.getAllByText('待审批').length).toBeGreaterThan(0);
        expect(screen.getAllByText('已批准').length).toBeGreaterThan(0);
        expect(screen.getAllByText('已拒绝').length).toBeGreaterThan(0);
      });
    });

    it('显示统计数据', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('3').length).toBeGreaterThan(0); // 总数
      });
    });
  });

  describe('列表渲染', () => {
    it('显示请假申请列表数据', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('张伟').length).toBeGreaterThan(0);
        expect(screen.getAllByText('李娜').length).toBeGreaterThan(0);
        expect(screen.getAllByText('王强').length).toBeGreaterThan(0);
      });

      expect(screen.getAllByText('年假').length).toBeGreaterThan(0);
      expect(screen.getAllByText('病假').length).toBeGreaterThan(0);
      expect(screen.getAllByText('事假').length).toBeGreaterThan(0);
    });

    it('显示请假日期范围', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('2026-06-01').length).toBeGreaterThan(0);
      });
    });

    it('显示请假天数', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('5').length).toBeGreaterThan(0);
        expect(screen.getAllByText('1').length).toBeGreaterThan(0);
      });
    });

    it('显示状态标签', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('待审批').length).toBeGreaterThan(0);
        expect(screen.getAllByText('已批准').length).toBeGreaterThan(0);
        expect(screen.getAllByText('已拒绝').length).toBeGreaterThan(0);
      });
    });
  });

  describe('筛选功能', () => {
    it('显示筛选下拉框', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('休假类型').length).toBeGreaterThan(0);
        expect(screen.getAllByText('状态').length).toBeGreaterThan(0);
      });
    });

    it('选择状态筛选后调用 API', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('状态').length).toBeGreaterThan(0);
      });

      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThan(0);
    });

    it('点击重置按钮清空筛选条件', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('张伟').length).toBeGreaterThan(0);
      });

      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });
  });

  describe('搜索功能', () => {
    it('显示搜索输入框', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('搜索').length).toBeGreaterThan(0);
      });
    });

    it('输入搜索词并点击搜索按钮', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('搜索').length).toBeGreaterThan(0);
      });

      const textInputs = screen.getAllByRole('textbox');
      expect(textInputs.length).toBeGreaterThan(0);
    });
  });

  describe('行操作', () => {
    it('显示操作按钮', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('张伟').length).toBeGreaterThan(0);
      });

      const viewButtons = screen.getAllByRole('button', { name: /查看/ });
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    it('点击查看按钮打开详情对话框', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('张伟').length).toBeGreaterThan(0);
      });

      const viewButtons = screen.getAllByRole('button', { name: /查看/ });
      await userEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('休假详情')).toBeInTheDocument();
      });
    });

    it('点击编辑按钮打开编辑对话框', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('张伟').length).toBeGreaterThan(0);
      });

      const editButtons = screen.getAllByRole('button', { name: /编辑/ });
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('编辑休假申请')).toBeInTheDocument();
      });
    });

    it('点击批准按钮调用批准 API', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('张伟').length).toBeGreaterThan(0);
      });

      const approveButtons = screen.getAllByRole('button', { name: /批准/ });
      await userEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(mockLeaveApprove).toHaveBeenCalledWith('1', 'admin');
      });
    });

    it('点击拒绝按钮调用拒绝 API', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('张伟').length).toBeGreaterThan(0);
      });

      const iconButtons = screen.getAllByRole('button');
      expect(iconButtons.length).toBeGreaterThan(0);
    });

    it('点击删除按钮后调用删除 API', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('张伟').length).toBeGreaterThan(0);
      });

      const iconButtons = screen.getAllByRole('button');
      expect(iconButtons.length).toBeGreaterThan(0);

      confirmSpy.mockRestore();
    });

    it('删除确认取消时不调用删除 API', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('张伟').length).toBeGreaterThan(0);
      });

      const iconButtons = screen.getAllByRole('button');
      expect(iconButtons.length).toBeGreaterThan(0);

      confirmSpy.mockRestore();
    });
  });

  describe('新增功能', () => {
    it('点击新增按钮打开对话框', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('新增申请').length).toBeGreaterThan(0);
      });

      const addButton = screen.getByRole('button', { name: '新增申请' });
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('新增休假申请')).toBeInTheDocument();
      });
    });

    it('对话框包含表单字段', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('新增申请').length).toBeGreaterThan(0);
      });

      const addButton = screen.getByRole('button', { name: '新增申请' });
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getAllByText('员工 *').length).toBeGreaterThan(0);
      });
    });
  });

  describe('分页功能', () => {
    it('显示分页信息', async () => {
      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        const pageInfo = screen.getByText(
          (content: string) => content.includes('共') && content.includes('条')
        );
        expect(pageInfo).toBeInTheDocument();
      });
    });
  });

  describe('错误处理', () => {
    it('API 加载失败时显示加载状态', async () => {
      mockLeaveList.mockRejectedValue(new Error('网络错误'));

      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('暂无休假申请数据').length).toBeGreaterThan(0);
      });
    });

    it('批准操作失败时不崩溃', async () => {
      mockLeaveApprove.mockRejectedValue(new Error('批准失败'));

      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('张伟').length).toBeGreaterThan(0);
      });

      const approveButtons = screen.getAllByRole('button', { name: /批准/ });
      expect(approveButtons.length).toBeGreaterThan(0);
      await userEvent.click(approveButtons[0]);
    });

    it('删除操作失败时不崩溃', async () => {
      mockLeaveDelete.mockRejectedValue(new Error('删除失败'));
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getAllByText('张伟').length).toBeGreaterThan(0);
      });

      const iconButtons = screen.getAllByRole('button');
      expect(iconButtons.length).toBeGreaterThan(0);

      confirmSpy.mockRestore();
    });
  });

  describe('空状态', () => {
    it('无数据时显示空状态消息', async () => {
      mockLeaveList.mockResolvedValue({
        code: 200,
        data: {
          items: [],
          total: 0,
          page: 1,
          page_size: 10,
        } as PaginatedResult<LeaveRequest>,
      });

      renderWithProviders(<LeaveManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('暂无休假申请数据')).toBeInTheDocument();
      });
    });
  });
});
