import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuditLogPage from '../../pages/AuditLogPage';
import { AuthProvider } from '../../hooks/useAuth';
import { ThemeProvider } from '../../components/ThemeProvider';
import { ToastProvider } from '../../components/ToastProvider';
import { LoadingProvider } from '../../components/LoadingProvider';
import ErrorBoundary from '../../components/ErrorBoundary';

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => vi.fn(),
}));

// Mock audit APIs
vi.mock('../../api/lims', () => ({
  auditLimsApi: {
    listAuditLogs: vi.fn().mockResolvedValue({
      success: true,
      data: {
        audit_logs: [
          {
            id: '1',
            action: 'create',
            entity_type: 'sample',
            entity_id: '1',
            user_id: 'user-1',
            username: 'testuser',
            status: 'success',
            created_at: new Date().toISOString(),
            ip_address: '127.0.0.1',
            changes: {},
          },
          {
            id: '2',
            action: 'update',
            entity_type: 'sample',
            entity_id: '2',
            user_id: 'user-2',
            username: 'anotheruser',
            status: 'success',
            created_at: new Date().toISOString(),
            ip_address: '127.0.0.2',
            changes: {},
          },
        ],
        total: 2,
      },
    }),
  },
}));

vi.mock('../../api/rs', () => ({
  auditRsApi: {
    listAuditLogs: vi.fn().mockResolvedValue({
      success: true,
      data: {
        audit_logs: [
          {
            id: '1',
            action: 'create',
            entity_type: 'project',
            entity_id: '1',
            user_id: 'user-1',
            username: 'testuser',
            status: 'success',
            created_at: new Date().toISOString(),
            ip_address: '127.0.0.1',
            changes: {},
          },
        ],
        total: 1,
      },
    }),
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <LoadingProvider>
              <BrowserRouter>{ui}</BrowserRouter>
            </LoadingProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

const renderAuditLogPage = () => {
  return renderWithProviders(<AuditLogPage />);
};

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('renders audit log page component', async () => {
    renderAuditLogPage();
    await waitFor(() => {
      expect(screen.getByText('安全审计')).toBeInTheDocument();
    });
  });

  test('renders LIMS and RS service tabs', async () => {
    renderAuditLogPage();

    await waitFor(() => {
      expect(screen.getByText('LIMS')).toBeInTheDocument();
      expect(screen.getByText('RS')).toBeInTheDocument();
    });
  });
});
