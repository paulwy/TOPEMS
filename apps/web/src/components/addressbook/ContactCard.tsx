import { User, Building, Users, Mail, Phone } from "lucide-react";
import type { AddressbookEntry } from "../../types/addressbook";

interface ContactCardProps {
  contact: AddressbookEntry;
  onClick: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onClick,
}) => {
  const getIcon = () => {
    switch (contact.contact_type) {
      case "EMPLOYEE":
        return <User sx={{ width: 24, height: 24 }} />;
      case "DEPARTMENT":
        return <Users sx={{ width: 24, height: 24 }} />;
      case "COMPANY":
        return <Building sx={{ width: 24, height: 24 }} />;
      default:
        return <User sx={{ width: 24, height: 24 }} />;
    }
  };

  const getColor = () => {
    switch (contact.contact_type) {
      case "EMPLOYEE":
        return { bg: "#dbeafe", color: "#2563eb" };
      case "DEPARTMENT":
        return { bg: "#dcfce7", color: "#16a34a" };
      case "COMPANY":
        return { bg: "#f3e8ff", color: "#9333ea" };
      default:
        return { bg: "#f3f4f6", color: "#6b7280" };
    }
  };

  const color = getColor();

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "white",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        padding: 16,
        cursor: "pointer",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div
          style={{
            ...color,
            padding: 12,
            borderRadius: "50%",
          }}
        >
          {getIcon()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#0f172a",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {contact.name}
          </h3>
          {contact.position && (
            <p
              style={{
                fontSize: 14,
                color: "#64748b",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {contact.position}
            </p>
          )}
          {contact.department_name && (
            <p
              style={{
                fontSize: 14,
                color: "#94a3b8",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {contact.department_name}
            </p>
          )}
          <div style={{ marginTop: 8 }}>
            {contact.email && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 14,
                  color: "#64748b",
                }}
              >
                <Mail
                  sx={{ width: 16, height: 16, marginRight: 8, flexShrink: 0 }}
                />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {contact.email}
                </span>
              </div>
            )}
            {contact.phone && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 14,
                  color: "#64748b",
                }}
              >
                <Phone
                  sx={{ width: 16, height: 16, marginRight: 8, flexShrink: 0 }}
                />
                <span>{contact.phone}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0 8px",
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 500,
              ...(contact.status === "active"
                ? { backgroundColor: "#dcfce7", color: "#15803d" }
                : { backgroundColor: "#fee2e2", color: "#b91c1c" }),
            }}
          >
            {contact.status === "active" ? "在职" : "离职"}
          </span>
        </div>
      </div>
    </div>
  );
};
