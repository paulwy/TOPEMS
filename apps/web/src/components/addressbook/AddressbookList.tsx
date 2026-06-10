import React from 'react';
import { ContactCard } from './ContactCard';
import type { AddressbookEntry } from '../../types/addressbook';

interface AddressbookListProps {
  contacts: AddressbookEntry[];
  loading: boolean;
  onContactClick: (contact: AddressbookEntry) => void;
}

export const AddressbookList: React.FC<AddressbookListProps> = ({ contacts, loading, onContactClick }) => {
  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-slate-500'>加载中...</div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <p className='text-slate-500'>没有找到联系人</p>
        </div>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4'>
      {contacts.map((contact) => (
        <ContactCard key={contact.id} contact={contact} onClick={() => onContactClick(contact)} />
      ))}
    </div>
  );
};
