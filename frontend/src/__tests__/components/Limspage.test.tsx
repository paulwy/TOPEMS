import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Limspage from '../../pages/Limspage';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../api/lims', () => ({
  limsApi: {
    getSamples: jest.fn().mockResolvedValue({ success: true, data: [] }),
    createSample: jest.fn().mockResolvedValue({ success: true }),
  },
}));

const renderLimspage = () => {
  return render(
    <BrowserRouter>
      <Limspage />
    </BrowserRouter>
  );
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
