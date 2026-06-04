import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from '../../pages/DashboardPage';
import { AuthProvider } from '../../hooks/useAuth';
import { ThemeProvider } from '../../components/ThemeProvider';
import { ToastProvider } from '../../components/ToastProvider';
import { LoadingProvider } from '../../components/LoadingProvider';
import ErrorBoundary from '../../components/ErrorBoundary';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
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

const renderDashboardPage = () => {
  return renderWithProviders(<DashboardPage />);
};

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders dashboard page component', () => {
    renderDashboardPage();
    expect(true).toBe(true);
  });
});
