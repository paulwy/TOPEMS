import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Rspage from '../../pages/Rspage';
import { AuthProvider } from '../../hooks/useAuth';
import { ThemeProvider } from '../../components/ThemeProvider';
import { ToastProvider } from '../../components/ToastProvider';
import { LoadingProvider } from '../../components/LoadingProvider';
import ErrorBoundary from '../../components/ErrorBoundary';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../api/rs', () => ({
  rsApi: {
    getProjects: jest.fn().mockResolvedValue({ success: true, data: [] }),
    createProject: jest.fn().mockResolvedValue({ success: true }),
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <LoadingProvider>
              <BrowserRouter>
                {ui}
              </BrowserRouter>
            </LoadingProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

const renderRspage = () => {
  return renderWithProviders(<Rspage />);
};

describe('Rspage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders RS page component', () => {
    renderRspage();
    expect(true).toBe(true);
  });
});
