import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/common';
import { CardListTemplate, type CardRenderConfig } from '@/components/templates/CardListTemplate';
import { addressbookApi } from '@/api/addressbook';
import type { AddressbookEntry, AddressbookDetail, DepartmentNode } from '@/types/addressbook';
import { logger } from '@/utils/logger';
import { useAppStore } from '@/store';
import { Users, Mail, Phone, Building2, Briefcase, Filter, Plus } from 'lucide-react';
import { ContactDetailModal } from '@/components/addressbook/ContactDetailModal';

const AddressbookPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [contacts, setContacts] = useState<AddressbookEntry[]>([]);
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<AddressbookDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    type: 'all',
    department_id: '',
    status: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: 20,
      };

      if (filterValues.type !== 'all') {
        params.type = filterValues.type;
      }
      if (filterValues.department_id) {
        params.department_id = filterValues.department_id;
      }
      if (filterValues.status) {
        params.status = filterValues.status;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await addressbookApi.getContacts(params);
      if (response.success) {
        setContacts(response.data.items);
        setTotal(response.data.total);
      }
    } catch (error: unknown) {
      logger.error('加载联系人失败:', error);
      addNotification({
        title: '加载失败',
        message: '加载联系人失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterValues, searchQuery, addNotification]);

  const loadDepartments = useCallback(async () => {
    try {
      const response = await addressbookApi.getDepartmentTree();
      if (response.success) {
        setDepartments(response.data);
      }
    } catch (error: unknown) {
      logger.error('加载部门失败:', error);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleContactClick = useCallback(
    async (contact: AddressbookEntry) => {
      try {
        const response = await addressbookApi.getContactDetail(contact.id, contact.contact_type);
        if (response.success) {
          setSelectedContact(response.data);
        }
      } catch (error: unknown) {
        logger.error('加载联系人详情失败:', error);
        addNotification({
          title: '加载失败',
          message: '加载联系人详情失败',
          type: 'error',
        });
      }
    },
    [addNotification]
  );

  const handleExport = useCallback(async () => {
    try {
      const blob = await addressbookApi.exportContacts({
        contact_type: filterValues.type !== 'all' ? filterValues.type : undefined,
        format: 'csv',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `通讯录_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      logger.error('导出失败:', error);
      addNotification({
        title: '导出失败',
        message: '导出通讯录失败',
        type: 'error',
      });
    }
  }, [filterValues.type]);

  const getTypeIcon = (contact: AddressbookEntry) => {
    switch (contact.contact_type) {
      case 'EMPLOYEE':
        return <Users size={24} />;
      case 'DEPARTMENT':
        return <Building2 size={24} />;
      case 'COMPANY':
        return <Building2 size={24} />;
      default:
        return <Users size={24} />;
    }
  };

  const getTypeColor = (contact: AddressbookEntry) => {
    switch (contact.contact_type) {
      case 'EMPLOYEE':
        return 'primary';
      case 'DEPARTMENT':
        return 'info';
      case 'COMPANY':
        return 'success';
      default:
        return 'primary';
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'success',
      inactive: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: '在职',
      inactive: '离职',
    };
    return labels[status] || status;
  };

  const departmentOptions = React.useMemo(() => {
    const flatten = (nodes: DepartmentNode[], prefix = ''): { label: string; value: string }[] => {
      return nodes.flatMap((node) => [
        { label: `${prefix}${node.name}`, value: node.id },
        ...flatten(node.children, `${prefix}${node.name}/`),
      ]);
    };
    return [{ label: '全部部门', value: '' }, ...flatten(departments)];
  }, [departments]);

  const filters = [
    {
      id: 'type',
      label: '类型',
      type: 'select' as const,
      options: [
        { label: '全部', value: 'all' },
        { label: '员工', value: 'EMPLOYEE' },
        { label: '部门', value: 'DEPARTMENT' },
        { label: '公司', value: 'COMPANY' },
      ],
    },
    {
      id: 'department_id',
      label: '部门',
      type: 'select' as const,
      options: departmentOptions,
    },
    {
      id: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { label: '全部', value: '' },
        { label: '在职', value: 'active' },
        { label: '离职', value: 'inactive' },
      ],
    },
  ];

  const handleFilterChange = (filters: Record<string, any>) => {
    setFilterValues(filters);
    setCurrentPage(1);
  };

  const handleFilterReset = () => {
    setFilterValues({
      type: 'all',
      department_id: '',
      status: '',
    });
    setCurrentPage(1);
  };

  const cardConfig: CardRenderConfig = {
    title: (item: unknown) => (item as AddressbookEntry).name,
    description: (item: unknown) =>
      (item as AddressbookEntry).position || (item as AddressbookEntry).department_name || '',
    status: {
      field: 'status',
      options: {
        active: { label: '在职', color: 'success' },
        inactive: { label: '离职', color: 'error' },
      },
    },
    meta: [
      {
        field: 'email',
        label: '邮箱',
        icon: <Mail size={14} />,
        format: (value: string) => value || '-',
      },
      {
        field: 'phone',
        label: '电话',
        icon: <Phone size={14} />,
        format: (value: string) => value || '-',
      },
      {
        field: 'department_name',
        label: '部门',
        icon: <Briefcase size={14} />,
        format: (value: string) => value || '-',
      },
    ],
    tags: [
      {
        field: 'contact_type',
        options: {
          EMPLOYEE: { label: '员工', color: 'primary' },
          DEPARTMENT: { label: '部门', color: 'info' },
          COMPANY: { label: '公司', color: 'success' },
        },
      },
    ],
    icon: (item: unknown) => getTypeIcon(item as AddressbookEntry),
    iconBgColor: (item: unknown) => `${getTypeColor(item as AddressbookEntry)}.light`,
  };

  return (
    <PageContainer
      title='通讯录'
      subtitle='管理企业通讯录和联系人信息'
    >
      <CardListTemplate
        title=''
        subtitle=''
        data={contacts}
        cardConfig={cardConfig}
        loading={loading}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: '搜索联系人姓名、邮箱、电话...',
        }}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        onSearch={loadContacts}
        addButton={{
          text: '导出',
          icon: <Plus size={18} />,
          onClick: handleExport,
        }}
        onRefresh={loadContacts}
        pagination={{
          page: currentPage,
          pageSize: 20,
          total,
          onPageChange: setCurrentPage,
        }}
        onCardClick={(item: unknown) => handleContactClick(item as AddressbookEntry)}
        gridColumns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
        showStatsOverview={false}
      />
      <ContactDetailModal
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
      />
    </PageContainer>
  );
};

export default AddressbookPage;
