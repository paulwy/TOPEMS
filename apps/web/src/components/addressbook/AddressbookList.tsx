import React from 'react';
import { ContactCard } from './ContactCard';
import type { AddressbookEntry } from '../../types/addressbook';
import i18n from '@/i18n';

interface AddressbookListProps {
  contacts: AddressbookEntry[];
  loading: boolean;
  onContactClick: (_contact: AddressbookEntry) => void;
}

export const AddressbookList: React.FC<AddressbookListProps> = ({
  contacts,
  loading,
  onContactClick,
}) => {
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
        }}
      >
        <div style={{ color: 'var(--mui-palette-text-secondary)' }}>{i18n.t('components.addressbook_list.k0')}</div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--mui-palette-text-secondary)' }}>{i18n.t('shared.addressbook_list.k0')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: 16,
        padding: 16,
      }}
    >
      {contacts.map((contact) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          onClick={() => onContactClick(contact)}
        />
      ))}
    </div>
  );
};
