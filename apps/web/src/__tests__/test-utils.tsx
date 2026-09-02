import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createCustomTheme } from '@/theme';

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
        staleTime: Infinity,
      },
    },
  });
};

const testTheme = createCustomTheme();

export const renderWithProviders = (ui: React.ReactElement, options?: RenderOptions) => {
  const queryClient = createTestQueryClient();

  return render(
    <ThemeProvider theme={testTheme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{ui}</BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>,
    options
  );
};

export { screen, waitFor, fireEvent } from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
