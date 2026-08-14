import { X, User, Building, Users, Mail, Phone, Calendar } from 'lucide-react';
import type { AddressbookDetail } from '../../types/addressbook';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface ContactDetailModalProps {
  contact: AddressbookDetail | null;
  onClose: () => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({ contact, onClose }) => {
  if (!contact) return null;

  const getIcon = () => {
    switch (contact.contact_type) {
      case 'EMPLOYEE':
        return <User sx={{ width: 48, height: 48 }} />;
      case 'DEPARTMENT':
        return <Users sx={{ width: 48, height: 48 }} />;
      case 'COMPANY':
        return <Building sx={{ width: 48, height: 48 }} />;
      default:
        return <User sx={{ width: 48, height: 48 }} />;
    }
  };

  const getColor = () => {
    switch (contact.contact_type) {
      case 'EMPLOYEE':
        return { bg: 'primary.100', color: 'primary.dark' };
      case 'DEPARTMENT':
        return { bg: 'success.lighter', color: 'success.dark' };
      case 'COMPANY':
        return { bg: 'secondary.100', color: 'purple.600' };
      default:
        return { bg: 'grey.100', color: 'text.secondary' };
    }
  };

  const getTypeLabel = () => {
    switch (contact.contact_type) {
      case 'EMPLOYEE':
        return i18n.t('shared.contact_detail_modal.k0');
      case 'DEPARTMENT':
        return i18n.t('shared.contact_detail_modal.k1');
      case 'COMPANY':
        return i18n.t('shared.contact_detail_modal.k2');
      default:
        return i18n.t('shared.contact_detail_modal.k3');
    }
  };

  const color = getColor();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'action.active',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: 'common.white',
          borderRadius: 8,
          width: '100%',
          maxWidth: 576,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  ...color,
                  padding: 16,
                  borderRadius: '50%',
                }}
              >
                {getIcon()}
              </div>
              <div>
                <h2
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--mui-palette-text-primary)',
                    margin: 0,
                  }}
                >
                  {contact.name}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)', margin: 0 }}>
                  {getTypeLabel()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: 8,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'grey.100';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X sx={{ width: 24, height: 24, color: 'var(--mui-palette-text-secondary)' }} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 基本信息 */}
            <div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--mui-palette-text-primary)',
                  marginBottom: 12,
                }}
              >
                {i18n.t('components.contact_detail_modal.k0')}
              </h3>
              <div
                style={{
                  backgroundColor: 'grey.50',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {contact.code && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
                      {i18n.t('components.contact_detail_modal.k1')}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--mui-palette-text-primary)' }}>
                      {contact.code}
                    </span>
                  </div>
                )}
                {contact.position && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
                      {i18n.t('components.contact_detail_modal.k2')}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--mui-palette-text-primary)' }}>
                      {contact.position}
                    </span>
                  </div>
                )}
                {contact.department_name && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
                      {i18n.t('components.contact_detail_modal.k3')}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--mui-palette-text-primary)' }}>
                      {contact.department_name}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
                    {i18n.t('components.contact_detail_modal.k4')}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0 8px',
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 500,
                      ...(contact.status === 'active'
                        ? { backgroundColor: 'success.lighter', color: 'success.700' }
                        : { backgroundColor: 'error.lighter', color: 'error.darker' }),
                    }}
                  >
                    {contact.status === 'active' ? i18n.t('shared.contact_detail_modal.k5') : i18n.t('shared.contact_detail_modal.k4')}
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
                  color: 'var(--mui-palette-text-primary)',
                  marginBottom: 12,
                }}
              >
                {i18n.t('components.contact_detail_modal.k5')}
              </h3>
              <div
                style={{
                  backgroundColor: 'grey.50',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {contact.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Mail sx={{ width: 20, height: 20, color: 'grey.400' }} />
                    <a
                      href={`mailto:${contact.email}`}
                      style={{
                        fontSize: 14,
                        color: 'primary.dark',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'primary.dark';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'primary.dark';
                      }}
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Phone sx={{ width: 20, height: 20, color: 'grey.400' }} />
                    <a
                      href={`tel:${contact.phone}`}
                      style={{
                        fontSize: 14,
                        color: 'primary.dark',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'primary.dark';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'primary.dark';
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
                    color: 'var(--mui-palette-text-primary)',
                    marginBottom: 12,
                  }}
                >
                  {i18n.t('components.contact_detail_modal.k6')}
                </h3>
                <div
                  style={{
                    backgroundColor: 'grey.50',
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Calendar sx={{ width: 20, height: 20, color: 'grey.400' }} />
                    <span style={{ fontSize: 14, color: 'var(--mui-palette-text-primary)' }}>
                      [i18n.t('components.contact_detail_modal.k7')]: {new Date(contact.hire_date).toLocaleDateString()}
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
                  color: 'var(--mui-palette-text-primary)',
                  marginBottom: 12,
                }}
              >
                {i18n.t('components.contact_detail_modal.k8')}
              </h3>
              <div
                style={{
                  backgroundColor: 'grey.50',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  fontSize: 14,
                  color: 'var(--mui-palette-text-secondary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{i18n.t('shared.contact_detail_modal.k6')}</span>
                  <span>{new Date(contact.created_at).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{i18n.t('shared.contact_detail_modal.k7')}</span>
                  <span>{new Date(contact.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: `${designTokens.spacing.sm} 16px`,
                backgroundColor: 'grey.100',
                color: 'grey.700',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'border.default';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'grey.100';
              }}
            >
              {i18n.t('components.contact_detail_modal.k9')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
