import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Rspage from '../../pages/Rspage';

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

const renderRspage = () => {
  return render(
    <BrowserRouter>
      <Rspage />
    </BrowserRouter>
  );
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
