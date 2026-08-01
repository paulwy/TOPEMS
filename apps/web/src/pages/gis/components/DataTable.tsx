import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { StatusChip } from './StatusChip';
import type {
  DevicePoint,
  Pipeline,
  StorageLocation,
  EvidenceRecord,
  FactoryMap,
  BusinessLocation,
} from '../../../api/gis';
import type { TabType } from '../hooks/useGisPage';

interface DataTableProps {
  data: unknown[];
  type: TabType;
}

export const DataTable: React.FC<DataTableProps> = ({ data, type }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color='text.secondary'>{t('gis.index.empty_no_data')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ backgroundColor: 'grey.50' }}>
            {type === 'devicePoints' && (
              <>
                <th
                  style={{
                    padding: theme.spacing(1.5, 2),
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_name')}
                </th>
                <th
                  style={{
                    padding: theme.spacing(1.5, 2),
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_type')}
                </th>
                <th
                  style={{
                    padding: theme.spacing(1.5, 2),
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_coordinates')}
                </th>
                <th
                  style={{
                    padding: theme.spacing(1.5, 2),
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_status')}
                </th>
              </>
            )}
            {type === 'pipelines' && (
              <>
                <th
                  style={{
                    padding: theme.spacing(1.5, 2),
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_name')}
                </th>
                <th
                  style={{
                    padding: theme.spacing(1.5, 2),
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_type')}
                </th>
                <th
                  style={{
                    padding: theme.spacing(1.5, 2),
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_start_point')}
                </th>
                <th
                  style={{
                    padding: theme.spacing(1.5, 2),
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_end_point')}
                </th>
                <th
                  style={{
                    padding: theme.spacing(1.5, 2),
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_status')}
                </th>
              </>
            )}
            {type === 'storageLocations' && (
              <>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_name')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_type')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_capacity')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_coordinates')}
                </th>
              </>
            )}
            {type === 'evidenceRecords' && (
              <>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_title')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_type')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_recorder')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_time')}
                </th>
              </>
            )}
            {type === 'factoryMaps' && (
              <>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_name')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_code')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_type')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_created_at')}
                </th>
              </>
            )}
            {type === 'businessLocations' && (
              <>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_name')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_type')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_address')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_contact')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: 'grey.700',
                  }}
                >
                  {t('gis.index.col_status')}
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {type === 'devicePoints' &&
            (data as DevicePoint[]).map((item) => (
              <tr
                key={item.id}
                style={{ borderTop: '1px solid grey.200' }}
              >
                <td style={{ padding: '12px 16px' }}>{item.name}</td>
                <td style={{ padding: '12px 16px' }}>{item.device_type}</td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                </td>
                <td style={{ padding: '12px 16px' }}>{<StatusChip status={item.status} />}</td>
              </tr>
            ))}
          {type === 'pipelines' &&
            (data as Pipeline[]).map((item) => (
              <tr
                key={item.id}
                style={{ borderTop: '1px solid grey.200' }}
              >
                <td style={{ padding: '12px 16px' }}>{item.name}</td>
                <td style={{ padding: '12px 16px' }}>{item.pipeline_type}</td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {item.start_point
                    ? `${item.start_point[0].toFixed(4)}, ${item.start_point[1].toFixed(4)}`
                    : ''}
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {item.end_point
                    ? `${item.end_point[0].toFixed(4)}, ${item.end_point[1].toFixed(4)}`
                    : ''}
                </td>
                <td style={{ padding: '12px 16px' }}>{<StatusChip status={item.status} />}</td>
              </tr>
            ))}
          {type === 'storageLocations' &&
            (data as StorageLocation[]).map((item) => (
              <tr
                key={item.id}
                style={{ borderTop: '1px solid grey.200' }}
              >
                <td style={{ padding: '12px 16px' }}>{item.name}</td>
                <td style={{ padding: '12px 16px' }}>{item.location_type}</td>
                <td style={{ padding: '12px 16px' }}>{item.capacity}</td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                </td>
              </tr>
            ))}
          {type === 'evidenceRecords' &&
            (data as EvidenceRecord[]).map((item) => (
              <tr
                key={item.id}
                style={{ borderTop: '1px solid grey.200' }}
              >
                <td style={{ padding: '12px 16px' }}>{item.title}</td>
                <td style={{ padding: '12px 16px' }}>{item.evidence_type}</td>
                <td style={{ padding: '12px 16px' }}>{item.recorded_by}</td>
                <td style={{ padding: '12px 16px' }}>
                  {item.recorded_at ? new Date(item.recorded_at).toLocaleString() : ''}
                </td>
              </tr>
            ))}
          {type === 'factoryMaps' &&
            (data as FactoryMap[]).map((item) => (
              <tr
                key={item.id}
                style={{ borderTop: '1px solid grey.200' }}
              >
                <td style={{ padding: '12px 16px' }}>{item.name}</td>
                <td style={{ padding: '12px 16px' }}>{item.code}</td>
                <td style={{ padding: '12px 16px' }}>{item.map_type}</td>
                <td style={{ padding: '12px 16px' }}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                </td>
              </tr>
            ))}
          {type === 'businessLocations' &&
            (data as BusinessLocation[]).map((item) => (
              <tr
                key={item.id}
                style={{ borderTop: '1px solid grey.200' }}
              >
                <td style={{ padding: '12px 16px' }}>{item.business_name}</td>
                <td style={{ padding: '12px 16px' }}>{item.business_type}</td>
                <td style={{ padding: '12px 16px' }}>{item.address}</td>
                <td style={{ padding: '12px 16px' }}>{item.contact_person}</td>
                <td style={{ padding: '12px 16px' }}>{<StatusChip status={item.status} />}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </Box>
  );
};
