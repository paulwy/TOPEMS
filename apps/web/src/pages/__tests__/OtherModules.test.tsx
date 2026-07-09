import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GisDashboardPage from '../gis/DashboardPage';
import GisFencePage from '../gis/GisFencePage';
import GisTrackingPage from '../gis/GisTrackingPage';
import IntegrationConnectionsPage from '../integration/IntegrationConnectionsPage';
import IntegrationDashboardPage from '../integration/IntegrationDashboardPage';
import IntegrationEventsPage from '../integration/IntegrationEventsPage';
import IntegrationMappingsPage from '../integration/IntegrationMappingsPage';
import IntegrationSettingsPage from '../integration/IntegrationSettingsPage';
import LowCodeHomePage from '../lowcode/LowCodeHomePage';
import AppManagementPage from '../lowcode/AppManagementPage';
import DataModelListPage from '../lowcode/DataModelListPage';
import FormListPage from '../lowcode/FormListPage';
import PageListPage from '../lowcode/PageListPage';
import DataSourcePage from '../lowcode/DataSourcePage';
import MobileHomePage from '../mobile/MobileHomePage';
import MobileApprovalPage from '../mobile/MobileApprovalPage';
import MobileAttendancePage from '../mobile/MobileAttendancePage';
import MobileInventoryPage from '../mobile/MobileInventoryPage';
import MobileTaskListPage from '../mobile/MobileTaskListPage';
import MobileWorkbenchPage from '../mobile/MobileWorkbenchPage';
import MonitorDashboardPage from '../monitor/MonitorDashboardPage';
import MonitorAlertsPage from '../monitor/MonitorAlertsPage';
import MonitorMetricsPage from '../monitor/MonitorMetricsPage';
import MonitorLogsPage from '../monitor/MonitorLogsPage';
import MonitorSettingsPage from '../monitor/MonitorSettingsPage';
import NotificationCenter from '../notification/NotificationCenter';
import NotificationDashboardPage from '../notification/NotificationDashboardPage';
import NotificationListPage from '../notification/NotificationListPage';
import NotificationSettingsPage from '../notification/NotificationSettingsPage';
import NotificationTemplatesPage from '../notification/NotificationTemplatesPage';
import DocDashboardPage from '../doc/DashboardPage';
import DocumentCenterPage from '../doc/DocumentCenterPage';
import KnowledgeBasePage from '../doc/KnowledgeBasePage';
import { useAppStore } from '@/store';

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['all'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['all'] },
          theme: 'light',
        }
  ),
}));

describe('GIS Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GisDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <GisDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('GisFencePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <GisFencePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('GisTrackingPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <GisTrackingPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });
});

describe('Integration Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IntegrationDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <IntegrationDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('IntegrationConnectionsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <IntegrationConnectionsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('IntegrationEventsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <IntegrationEventsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('IntegrationMappingsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <IntegrationMappingsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('IntegrationSettingsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <IntegrationSettingsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });
});

describe('LowCode Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LowCodeHomePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <LowCodeHomePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('AppManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AppManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('DataModelListPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <DataModelListPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('FormListPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <FormListPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('PageListPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PageListPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('DataSourcePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <DataSourcePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });
});

describe('Mobile Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MobileHomePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MobileHomePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('MobileApprovalPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MobileApprovalPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('MobileAttendancePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MobileAttendancePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('MobileInventoryPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MobileInventoryPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('MobileTaskListPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MobileTaskListPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('MobileWorkbenchPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MobileWorkbenchPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });
});

describe('Monitor Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MonitorDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MonitorDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('MonitorAlertsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MonitorAlertsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('MonitorMetricsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MonitorMetricsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('MonitorLogsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MonitorLogsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('MonitorSettingsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <MonitorSettingsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });
});

describe('Notification Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NotificationCenter', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <NotificationCenter />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('NotificationDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <NotificationDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('NotificationListPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <NotificationListPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('NotificationSettingsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <NotificationSettingsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('NotificationTemplatesPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <NotificationTemplatesPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });
});

describe('Doc Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DocDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <DocDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('DocumentCenterPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <DocumentCenterPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });

  describe('KnowledgeBasePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <KnowledgeBasePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });
  });
});
