import React from "react";
import { ContactCard } from "./ContactCard";
import type { AddressbookEntry } from "../../types/addressbook";

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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 256,
        }}
      >
        <div style={{ color: "#64748b" }}>加载中...</div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 256,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#64748b" }}>没有找到联系人</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(1, 1fr)",
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
