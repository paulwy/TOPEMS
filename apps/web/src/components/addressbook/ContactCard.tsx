import { User, Building, Users, Mail, Phone } from 'lucide-react';
import type { AddressbookEntry } from '../../types/addressbook';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface ContactCardProps {
  contact: AddressbookEntry;
  onClick: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact, onClick }) => {
  const getIcon = () => {
    switch (contact.contact_type) {
      case 'EMPLOYEE':
        return <User sx={{ width: 24, height: 24 }} />;
      case 'DEPARTMENT':
        return <Users sx={{ width: 24, height: 24 }} />;
      case 'COMPANY':
        return <Building sx={{ width: 24, height: 24 }} />;
      default:
        return <User sx={{ width: 24, height: 24 }} />;
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

  const color = getColor();

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        backgroundColor: 'common.white',
        borderRadius: 8,
        border: '1px solid border.default',
        padding: 16,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 6px -1px ${designTokens.colors.action.selected}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div
          style={{
            ...color,
            padding: 12,
            borderRadius: '50%',
          }}
        >
          {getIcon()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'grey.900',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {contact.name}
          </h3>
          {contact.position && (
            <p
              style={{
                fontSize: 14,
                color: 'grey.600',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {contact.position}
            </p>
          )}
          {contact.department_name && (
            <p
              style={{
                fontSize: 14,
                color: 'grey.400',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {contact.department_name}
            </p>
          )}
          <div style={{ marginTop: 8 }}>
            {contact.email && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 14,
                  color: 'grey.600',
                }}
              >
                <Mail sx={{ width: 16, height: 16, marginRight: 8, flexShrink: 0 }} />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {contact.email}
                </span>
              </div>
            )}
            {contact.phone && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 14,
                  color: 'grey.600',
                }}
              >
                <Phone sx={{ width: 16, height: 16, marginRight: 8, flexShrink: 0 }} />
                <span>{contact.phone}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
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
            {contact.status === 'active'
              ? i18n.t('shared.contact_card.k1')
              : i18n.t('shared.contact_card.k0')}
          </span>
        </div>
      </div>
    </div>
  );
};
