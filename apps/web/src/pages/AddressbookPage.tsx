import React, { useState, useEffect, useCallback } from "react";
import { AddressbookSidebar } from "../components/addressbook/AddressbookSidebar";
import { AddressbookHeader } from "../components/addressbook/AddressbookHeader";
import { AddressbookFilters } from "../components/addressbook/AddressbookFilters";
import { AddressbookList } from "../components/addressbook/AddressbookList";
import { ContactDetailModal } from "../components/addressbook/ContactDetailModal";
import { addressbookApi } from "../api/addressbook";
import type {
  AddressbookEntry,
  AddressbookDetail,
  DepartmentNode,
} from "../types/addressbook";

const AddressbookPage: React.FC = () => {
  const [contacts, setContacts] = useState<AddressbookEntry[]>([]);
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] =
    useState<AddressbookDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<
    "all" | "EMPLOYEE" | "DEPARTMENT" | "COMPANY"
  >("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage] = useState(1);
  const [_total] = useState(0);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: 20,
      };

      if (selectedType !== "all") {
        params.type = selectedType;
      }
      if (selectedDepartment) {
        params.department_id = selectedDepartment;
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await addressbookApi.getContacts(params);
      if (response.success) {
        setContacts(response.data.items);
      }
    } catch (error) {
      console.error("加载联系人失败:", error);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    selectedType,
    selectedDepartment,
    statusFilter,
    searchQuery,
  ]);

  const loadDepartments = useCallback(async () => {
    try {
      const response = await addressbookApi.getDepartmentTree();
      if (response.success) {
        setDepartments(response.data);
      }
    } catch (error) {
      console.error("加载部门失败:", error);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleContactClick = useCallback(async (contact: AddressbookEntry) => {
    try {
      const response = await addressbookApi.getContactDetail(
        contact.id,
        contact.contact_type,
      );
      if (response.success) {
        setSelectedContact(response.data);
      }
    } catch (error) {
      console.error("加载联系人详情失败:", error);
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const blob = await addressbookApi.exportContacts({
        contact_type: selectedType !== "all" ? selectedType : undefined,
        format: "csv",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `通讯录_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("导出失败:", error);
    }
  }, [selectedType]);

  return (
    <div className="flex h-screen bg-slate-50">
      <AddressbookSidebar
        departments={departments}
        selectedType={selectedType}
        onTypeSelect={setSelectedType}
        selectedDepartment={selectedDepartment}
        onDepartmentSelect={setSelectedDepartment}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AddressbookHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onExport={handleExport}
        />
        <AddressbookFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />
        <div className="flex-1 overflow-y-auto">
          <AddressbookList
            contacts={contacts}
            loading={loading}
            onContactClick={handleContactClick}
          />
        </div>
      </div>
      <ContactDetailModal
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
      />
    </div>
  );
};

export default AddressbookPage;
