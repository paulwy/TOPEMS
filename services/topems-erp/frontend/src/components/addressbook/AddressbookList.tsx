import React from 'react';
import ContactCard from './ContactCard';
import type { AddressbookEntry } from '../../types/addressbook';

interface AddressbookListProps {
  contacts: AddressbookEntry[];
  loading: boolean;
  onContactClick: (contact: AddressbookEntry) => void;
}

const AddressbookList: React.FC<AddressbookListProps> = ({
  contacts,
  loading,
  onContactClick,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-6xl mb-4">📇</div>
        <p className="text-gray-500">暂无联系人</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((contact) => (
          <ContactCard
            key={`${contact.contact_type}-${contact.id}`}
            contact={contact}
            onClick={onContactClick}
          />
        ))}
      </div>
    </div>
  );
};

export default AddressbookList;
