import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Stack,
  Typography,
  Grid,
} from '@mui/material';
import i18n from '@/i18n';
import { X } from 'lucide-react';
import type { TabType, ModalType, FormErrors, GisEntity } from '../types';
import { InputField, TextAreaField } from './TableUtils';

interface EntityFormModalProps {
  open: boolean;
  modalType: ModalType;
  activeTab: TabType;
  formData: Record<string, unknown>;
  formErrors: FormErrors;
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (key: string, value: unknown) => void;
}
export const EntityFormModal: React.FC<EntityFormModalProps> = ({
  open,
  modalType,
  activeTab,
  formData,
  formErrors,
  onClose,
  onSubmit,
  onFormChange,
}) => {
  const renderFormFields = () => {
    switch (activeTab) {
      case 'devicePoints':
        return (
          <Stack spacing={3}>
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.name')}
              name='name'
              value={formData.name}
              onChange={(v) => onFormChange('name', v)}
              error={formErrors.name}
              required
            />
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.equipment_type')}
              name='device_type'
              value={formData.device_type}
              onChange={(v) => onFormChange('device_type', v)}
              error={formErrors.device_type}
              required
            />
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_6acaee')}
                  name='latitude'
                  type='number'
                  value={formData.latitude}
                  onChange={(v) => onFormChange('latitude', v)}
                  error={formErrors.latitude}
                  required
                />
              </Grid>
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_3d18ca')}
                  name='longitude'
                  type='number'
                  value={formData.longitude}
                  onChange={(v) => onFormChange('longitude', v)}
                  error={formErrors.longitude}
                  required
                />
              </Grid>
            </Grid>
            <TextAreaField
              label={i18n.t('bi.gis_page_components__entity_form_modal.description')}
              value={formData.description}
              onChange={(v) => onFormChange('description', v)}
            />
          </Stack>
        );
      case 'pipelines':
        return (
          <Stack spacing={3}>
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.name')}
              name='name'
              value={formData.name}
              onChange={(v) => onFormChange('name', v)}
              error={formErrors.name}
              required
            />
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.type')}
              name='pipeline_type'
              value={formData.pipeline_type}
              onChange={(v) => onFormChange('pipeline_type', v)}
              error={formErrors.pipeline_type}
              required
            />
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_981a2b')}
                  name='start_lat'
                  type='number'
                  value={formData.start_lat}
                  onChange={(v) => onFormChange('start_lat', v)}
                  error={formErrors.start_lat}
                  required
                />
              </Grid>
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_777f6f')}
                  name='start_lng'
                  type='number'
                  value={formData.start_lng}
                  onChange={(v) => onFormChange('start_lng', v)}
                  error={formErrors.start_lng}
                  required
                />
              </Grid>
            </Grid>
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_60619a')}
                  name='end_lat'
                  type='number'
                  value={formData.end_lat}
                  onChange={(v) => onFormChange('end_lat', v)}
                  error={formErrors.end_lat}
                  required
                />
              </Grid>
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_0ead9c')}
                  name='end_lng'
                  type='number'
                  value={formData.end_lng}
                  onChange={(v) => onFormChange('end_lng', v)}
                  error={formErrors.end_lng}
                  required
                />
              </Grid>
            </Grid>
          </Stack>
        );
      case 'storageLocations':
        return (
          <Stack spacing={3}>
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.name')}
              name='name'
              value={formData.name}
              onChange={(v) => onFormChange('name', v)}
              error={formErrors.name}
              required
            />
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.type_1')}
              name='location_type'
              value={formData.location_type}
              onChange={(v) => onFormChange('location_type', v)}
              error={formErrors.location_type}
              required
            />
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_6acaee')}
                  name='latitude'
                  type='number'
                  value={formData.latitude}
                  onChange={(v) => onFormChange('latitude', v)}
                  error={formErrors.latitude}
                  required
                />
              </Grid>
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_3d18ca')}
                  name='longitude'
                  type='number'
                  value={formData.longitude}
                  onChange={(v) => onFormChange('longitude', v)}
                  error={formErrors.longitude}
                  required
                />
              </Grid>
            </Grid>
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_fe7d74')}
                  name='capacity'
                  type='number'
                  value={formData.capacity}
                  onChange={(v) => onFormChange('capacity', v)}
                />
              </Grid>
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_de3b57')}
                  name='current_usage'
                  type='number'
                  value={formData.current_usage}
                  onChange={(v) => onFormChange('current_usage', v)}
                />
              </Grid>
            </Grid>
          </Stack>
        );
      case 'evidenceRecords':
        return (
          <Stack spacing={3}>
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.title')}
              name='title'
              value={formData.title}
              onChange={(v) => onFormChange('title', v)}
              error={formErrors.title}
              required
            />
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.type_1')}
              name='evidence_type'
              value={formData.evidence_type}
              onChange={(v) => onFormChange('evidence_type', v)}
              error={formErrors.evidence_type}
              required
            />
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_6acaee')}
                  name='latitude'
                  type='number'
                  value={formData.latitude}
                  onChange={(v) => onFormChange('latitude', v)}
                  error={formErrors.latitude}
                  required
                />
              </Grid>
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_3d18ca')}
                  name='longitude'
                  type='number'
                  value={formData.longitude}
                  onChange={(v) => onFormChange('longitude', v)}
                  error={formErrors.longitude}
                  required
                />
              </Grid>
            </Grid>
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.text_bf425d')}
              name='recorded_by'
              value={formData.recorded_by}
              onChange={(v) => onFormChange('recorded_by', v)}
              error={formErrors.recorded_by}
              required
            />
          </Stack>
        );
      case 'factoryMaps':
        return (
          <Stack spacing={3}>
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.name')}
              name='name'
              value={formData.name}
              onChange={(v) => onFormChange('name', v)}
              error={formErrors.name}
              required
            />
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.text_c515f3')}
              name='code'
              value={formData.code}
              onChange={(v) => onFormChange('code', v)}
              error={formErrors.code}
              required
            />
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.type_2')}
              name='map_type'
              value={formData.map_type}
              onChange={(v) => onFormChange('map_type', v)}
              error={formErrors.map_type}
              required
            />
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.text_c2ef90')}
              name='file_url'
              value={formData.file_url}
              onChange={(v) => onFormChange('file_url', v)}
            />
          </Stack>
        );
      case 'businessLocations':
        return (
          <Stack spacing={3}>
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.name_1')}
              name='business_name'
              value={formData.business_name}
              onChange={(v) => onFormChange('business_name', v)}
              error={formErrors.business_name}
              required
            />
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.type_3')}
              name='business_type'
              value={formData.business_type}
              onChange={(v) => onFormChange('business_type', v)}
              error={formErrors.business_type}
              required
            />
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_6acaee')}
                  name='lat'
                  type='number'
                  value={formData.lat}
                  onChange={(v) => onFormChange('lat', v)}
                  error={formErrors.lat}
                  required
                />
              </Grid>
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.text_3d18ca')}
                  name='lng'
                  type='number'
                  value={formData.lng}
                  onChange={(v) => onFormChange('lng', v)}
                  error={formErrors.lng}
                  required
                />
              </Grid>
            </Grid>
            <InputField
              label={i18n.t('bi.gis_page_components__entity_form_modal.address')}
              name='address'
              value={formData.address}
              onChange={(v) => onFormChange('address', v)}
            />
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.contact')}
                  name='contact_person'
                  value={formData.contact_person}
                  onChange={(v) => onFormChange('contact_person', v)}
                />
              </Grid>
              <Grid size={6}>
                <InputField
                  label={i18n.t('bi.gis_page_components__entity_form_modal.phone')}
                  name='contact_phone'
                  value={formData.contact_phone}
                  onChange={(v) => onFormChange('contact_phone', v)}
                />
              </Grid>
            </Grid>
          </Stack>
        );
      default:
        return null;
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle>
        <Stack
          direction='row'
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {modalType === 'create'
              ? i18n.t('bi.gis_page_components__entity_form_modal.text_26bb84')
              : i18n.t('bi.gis_page_components__entity_form_modal.edit')}
          </Typography>
          <IconButton
            onClick={onClose}
            size='small'
            aria-label={i18n.t('bi.gis_page_components__entity_form_modal.close')}
          >
            <X size={20} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack
          spacing={3}
          sx={{ pt: 1 }}
        >
          {renderFormFields()}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          variant='outlined'
        >
          {i18n.t('pages.entity_form_modal.k0')}
        </Button>
        <Button
          onClick={onSubmit}
          variant='contained'
          sx={{
            bgcolor: 'info.main',
            '&:hover': { bgcolor: 'cyan.dark' },
          }}
        >
          {modalType === 'create'
            ? i18n.t('bi.gis_page_components__entity_form_modal.create')
            : i18n.t('bi.gis_page_components__entity_form_modal.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
