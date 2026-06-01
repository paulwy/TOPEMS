import React, { useEffect, useState, useCallback } from 'react';
import { addressbookApi } from '../api/addressbook';
import AddressbookSidebar from '../components/addressbook/AddressbookSidebar';
import AddressbookHeader from '../components/addressbook/AddressbookHeader';
import AddressbookFilters from '../components/addressbook/AddressbookFilters';
import AddressbookList from '../components/addressbook/AddressbookList';
import ContactDetailModal from '../components/addressbook/ContactDetailModal';
import type {
  AddressbookEntry,
  AddressbookDetail,
  DepartmentNode,
  ContactType,
} from '../types/addressbook';

const AddressbookPage: React.FC = () => {
  const [contacts, setContacts] = useState<AddressbookEntry[]>([]);
  const [departmentTree, setDepartmentTree] = useState<DepartmentNode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ContactType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selectedContact, setSelectedContact] = useState<AddressbookDetail | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await addressbookApi.getContacts({
        type_: selectedType || undefined,
        department_id: selectedDepartmentId || undefined,
        status: selectedStatus || undefined,
        search: search || undefined,
        page,
        page_size: pageSize,
      });

      if (response.success) {
        setContacts(response.data.items);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('获取通讯录失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedDepartmentId, selectedStatus, search, page, pageSize]);

  const fetchDepartmentTree = useCallback(async () => {
    try {
      const response = await addressbookApi.getDepartmentTree();
      if (response.success) {
        setDepartmentTree(response.data);
      }
    } catch (error) {
      console.error('获取部门树失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchDepartmentTree();
  }, [fetchDepartmentTree]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleContactClick = async (contact: AddressbookEntry) => {
    try {
      const response = await addressbookApi.getContactDetail(
        contact.id,
        contact.contact_type
      );
      if (response.success) {
        setSelectedContact(response.data);
        setDetailModalOpen(true);
      }
    } catch (error) {
      console.error('获取联系人详情失败:', error);
    }
  };

  const handleDepartmentSelect = (departmentId: string | null) => {
    setSelectedDepartmentId(departmentId);
    setPage(1);
  };

  const handleTypeSelect = (type: ContactType | null) => {
    setSelectedType(type);
    setPage(1);
  };

  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex h-screen bg-gray-50">
      <AddressbookSidebar
        departmentTree={departmentTree}
        selectedDepartmentId={selectedDepartmentId}
        selectedType={selectedType}
        onDepartmentSelect={handleDepartmentSelect}
        onTypeSelect={handleTypeSelect}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AddressbookHeader
          searchValue={search}
          onSearchChange={handleSearchChange}
          selectedType={selectedType}
        />

        <AddressbookFilters
          selectedType={selectedType}
          selectedStatus={selectedStatus}
          onTypeChange={handleTypeSelect}
          onStatusChange={handleStatusChange}
        />

        <div className="flex-1 overflow-y-auto">
          <AddressbookList
            contacts={contacts}
            loading={loading}
            onContactClick={handleContactClick}
          />
        </div>

        {totalPages > 1 && (
          <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      <ContactDetailModal
        contact={selectedContact}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedContact(null);
        }}
      />
    </div>
  );
};

export default AddressbookPage;
