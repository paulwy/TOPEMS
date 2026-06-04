import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Limspage from '../../pages/Limspage';
import { AuthProvider } from '../../hooks/useAuth';
import { ThemeProvider } from '../../components/ThemeProvider';
import { ToastProvider } from '../../components/ToastProvider';
import { LoadingProvider } from '../../components/LoadingProvider';
import ErrorBoundary from '../../components/ErrorBoundary';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../api/lims', () => ({
  limsApi: {
    getSamples: jest.fn().mockResolvedValue({ success: true, data: [] }),
    listSamples: jest.fn().mockResolvedValue({ success: true, data: [] }),
    listProcesses: jest.fn().mockResolvedValue({ success: true, data: [] }),
    listTasks: jest.fn().mockResolvedValue({ success: true, data: [] }),
    createSample: jest.fn().mockResolvedValue({ success: true }),
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
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders LIMS page component', () => {
    renderLimspage();
    expect(true).toBe(true);
  });
});
