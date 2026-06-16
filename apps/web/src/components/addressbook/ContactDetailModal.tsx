import { X, User, Building, Users, Mail, Phone, Calendar } from "lucide-react";
import type { AddressbookDetail } from "../../types/addressbook";

interface ContactDetailModalProps {
  contact: AddressbookDetail | null;
  onClose: () => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  contact,
  onClose,
}) => {
  if (!contact) return null;

  const getIcon = () => {
    switch (contact.contact_type) {
      case "EMPLOYEE":
        return <User sx={{ width: 48, height: 48 }} />;
      case "DEPARTMENT":
        return <Users sx={{ width: 48, height: 48 }} />;
      case "COMPANY":
        return <Building sx={{ width: 48, height: 48 }} />;
      default:
        return <User sx={{ width: 48, height: 48 }} />;
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

  const getTypeLabel = () => {
    switch (contact.contact_type) {
      case "EMPLOYEE":
        return "员工";
      case "DEPARTMENT":
        return "部门";
      case "COMPANY":
        return "公司";
      default:
        return "联系人";
    }
  };

  const color = getColor();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 8,
          width: "100%",
          maxWidth: 576,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  ...color,
                  padding: 16,
                  borderRadius: "50%",
                }}
              >
                {getIcon()}
              </div>
              <div>
                <h2
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: 0,
                  }}
                >
                  {contact.name}
                </h2>
                <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
                  {getTypeLabel()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: 8,
                borderRadius: "50%",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <X sx={{ width: 24, height: 24, color: "#64748b" }} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* 基本信息 */}
            <div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 12,
                }}
              >
                基本信息
              </h3>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: 8,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {contact.code && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: 14, color: "#64748b" }}>编号</span>
                    <span style={{ fontSize: 14, color: "#0f172a" }}>
                      {contact.code}
                    </span>
                  </div>
                )}
                {contact.position && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: 14, color: "#64748b" }}>职位</span>
                    <span style={{ fontSize: 14, color: "#0f172a" }}>
                      {contact.position}
                    </span>
                  </div>
                )}
                {contact.department_name && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: 14, color: "#64748b" }}>部门</span>
                    <span style={{ fontSize: 14, color: "#0f172a" }}>
                      {contact.department_name}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 14, color: "#64748b" }}>状态</span>
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

            {/* 联系方式 */}
            <div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 12,
                }}
              >
                联系方式
              </h3>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: 8,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {contact.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Mail sx={{ width: 20, height: 20, color: "#94a3b8" }} />
                    <a
                      href={`mailto:${contact.email}`}
                      style={{
                        fontSize: 14,
                        color: "#2563eb",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#1d4ed8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#2563eb";
                      }}
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Phone sx={{ width: 20, height: 20, color: "#94a3b8" }} />
                    <a
                      href={`tel:${contact.phone}`}
                      style={{
                        fontSize: 14,
                        color: "#2563eb",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#1d4ed8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#2563eb";
                      }}
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 其他信息 */}
            {contact.hire_date && (
              <div>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0f172a",
                    marginBottom: 12,
                  }}
                >
                  入职信息
                </h3>
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Calendar sx={{ width: 20, height: 20, color: "#94a3b8" }} />
                    <span style={{ fontSize: 14, color: "#0f172a" }}>
                      入职时间: {new Date(contact.hire_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 系统信息 */}
            <div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: 12,
                }}
              >
                系统信息
              </h3>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: 8,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  fontSize: 14,
                  color: "#64748b",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>创建时间</span>
                  <span>{new Date(contact.created_at).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>更新时间</span>
                  <span>{new Date(contact.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f1f5f9",
                color: "#334155",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#f1f5f9";
              }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
