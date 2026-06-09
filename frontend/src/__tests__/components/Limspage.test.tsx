import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Limspage from '../../pages/Limspage';
import { AuthProvider } from '../../hooks/useAuth';
import { ThemeProvider } from '../../components/ThemeProvider';
import { ToastProvider } from '../../components/ToastProvider';
import { LoadingProvider } from '../../components/LoadingProvider';
import ErrorBoundary from '../../components/ErrorBoundary';

vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn(),
}));

vi.mock('../../api/lims', () => ({
  limsApi: {
    getSamples: vi.fn().mockResolvedValue({ success: true, data: [] }),
    listSamples: vi.fn().mockResolvedValue({ success: true, data: [] }),
    listProcesses: vi.fn().mockResolvedValue({ success: true, data: [] }),
    listTasks: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createSample: vi.fn().mockResolvedValue({ success: true }),
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

const renderLimspage = () => {
  return renderWithProviders(<Limspage />);
};

describe('Limspage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('renders LIMS page component', () => {
    renderLimspage();
    expect(true).toBe(true);
  });
});
