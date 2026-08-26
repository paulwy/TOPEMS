import { Box, Button, Tabs, Tab, Typography } from '@mui/material';
import React from 'react';
import { Mail, Send, Plus, ChevronLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MasterDetailPageTemplate } from '@/components/templates';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useMailPage } from '@/components/im/MailPageHooks';
import EmailStatsCards from './components/EmailStatsCards';
import EmailList from './components/EmailList';
import TemplateList from './components/TemplateList';
import SendEmailDialog from './components/SendEmailDialog';
import EmailDetailDialog from './components/EmailDetailDialog';
import CreateTemplateDialog from './components/CreateTemplateDialog';
import EditTemplateDialog from './components/EditTemplateDialog';
import TemplatePreviewDialog from './components/TemplatePreviewDialog';
import ConfirmDialogs from './components/ConfirmDialogs';
import { useTranslation } from 'react-i18next';

const MailPage: React.FC = () => {
  const { t } = useTranslation('im');
  const navigate = useNavigate();
  const m = useMailPage();

  return (
    <MasterDetailPageTemplate
      title={t('im.index.k0')}
      subtitle={t('im.mail_page_index.e2')}
      loading={m.loading}
      items={[]}
      columns={[]}
      getRowId={() => ''}
      renderDetail={() => null}
    >
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Box
          sx={{
            bgcolor: 'background.paper',
            boxShadow: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant='text'
                  onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
                >
                  <ChevronLeft size={20} />
                </Button>
                <Box>
                  <Typography
                    variant='h5'
                    sx={{
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Mail
                      size={28}
                      color='primary.dark'
                      style={{ marginRight: 12 }}
                    />
                    {t('im.mail_page_index.e1')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ mt: 0.5, color: 'grey.500' }}
                  >
                    {t('im.mail_page_index.e2')}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {m.activeTab === 'emails' && (
                  <Button onClick={() => m.setShowSendModal(true)}>
                    <Send
                      size={20}
                      style={{ marginRight: 8 }}
                    />
                    {t('im.mail_page_components_send_email_dialog.e1')}
                  </Button>
                )}
                {m.activeTab === 'templates' && (
                  <Button onClick={() => m.setShowTemplateModal(true)}>
                    <Plus
                      size={20}
                      style={{ marginRight: 8 }}
                    />
                    {t('im.mail_page_index.e4')}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 4 }}>
          <Box
            sx={{
              mb: 3,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Tabs
              value={m.activeTab}
              onChange={(_, v) => m.setActiveTab(v)}
              sx={{ width: '100%' }}
            >
              <Tab
                value='emails'
                icon={<Mail size={16} />}
                iconPosition='start'
                sx={{ textTransform: 'none', minHeight: 48 }}
                label={t('im.index.k1')}
              />
              <Tab
                value='templates'
                icon={<FileText />}
                iconPosition='start'
                sx={{ textTransform: 'none', minHeight: 48 }}
                label={t('im.index.k2')}
              />
            </Tabs>
          </Box>

          {m.activeTab === 'emails' && (
            <Box sx={{ mt: 0 }}>
              <EmailStatsCards
                stats={m.stats}
                statsLoading={m.statsLoading}
              />
              <EmailList
                searchQuery={m.searchQuery}
                setSearchQuery={m.setSearchQuery}
                statusFilter={m.statusFilter}
                setStatusFilter={m.setStatusFilter}
                priorityFilter={m.priorityFilter}
                setPriorityFilter={m.setPriorityFilter}
                setCurrentPage={m.setCurrentPage}
                emails={m.emails}
                totalEmails={m.totalEmails}
                currentPage={m.currentPage}
                pageSize={m.pageSize}
                loading={m.loading}
                selectedEmails={m.selectedEmails}
                setSelectedEmails={m.setSelectedEmails}
                copiedId={m.copiedId}
                copyToClipboard={m.copyToClipboard}
                openEmailDetail={m.openEmailDetail}
                openResendEmailDialog={m.openResendEmailDialog}
                openDeleteEmailDialog={m.openDeleteEmailDialog}
                handlePrevPage={m.handlePrevPage}
                handleNextPage={m.handleNextPage}
                setBatchResendDialogOpen={m.setBatchResendDialogOpen}
                setBatchDeleteDialogOpen={m.setBatchDeleteDialogOpen}
                getStatusBadge={m.getStatusBadge}
                getPriorityBadge={m.getPriorityBadge}
              />
            </Box>
          )}

          {m.activeTab === 'templates' && (
            <TemplateList
              searchQuery={m.searchQuery}
              setSearchQuery={m.setSearchQuery}
              categoryFilter={m.categoryFilter}
              setCategoryFilter={m.setCategoryFilter}
              setCurrentPage={m.setCurrentPage}
              templates={m.templates}
              totalTemplates={m.totalTemplates}
              currentPage={m.currentPage}
              pageSize={m.pageSize}
              loading={m.loading}
              handleEyeTemplate={m.handleEyeTemplate}
              openEditTemplate={m.openEditTemplate}
              handleToggleTemplateStatus={m.handleToggleTemplateStatus}
              openDeleteTemplateDialog={m.openDeleteTemplateDialog}
              handlePrevPage={m.handlePrevPage}
              handleNextPage={m.handleNextPage}
              getCategoryLabel={m.getCategoryLabel}
            />
          )}
        </Box>

        <SendEmailDialog
          open={m.showSendModal}
          onClose={() => m.setShowSendModal(false)}
          sendForm={m.sendForm}
          setSendForm={m.setSendForm}
          formErrors={m.formErrors}
          templates={m.templates}
          handleTemplateChange={m.handleTemplateChange}
          handleSendEmail={m.handleSendEmail}
          resetSendForm={m.resetSendForm}
        />

        <EmailDetailDialog
          open={m.showEmailDetail}
          onClose={() => m.setShowEmailDetail(false)}
          selectedEmail={m.selectedEmail}
          getStatusBadge={m.getStatusBadge}
          getPriorityBadge={m.getPriorityBadge}
        />

        <CreateTemplateDialog
          open={m.showTemplateModal}
          onClose={() => m.setShowTemplateModal(false)}
          templateForm={m.templateForm}
          setTemplateForm={m.setTemplateForm}
          handleCreateTemplate={m.handleCreateTemplate}
          resetTemplateForm={m.resetTemplateForm}
        />

        <EditTemplateDialog
          open={m.showEditTemplateModal}
          onClose={() => m.setShowEditTemplateModal(false)}
          selectedTemplate={m.selectedTemplate}
          templateForm={m.templateForm}
          setTemplateForm={m.setTemplateForm}
          handleUpdateTemplate={m.handleUpdateTemplate}
          resetTemplateForm={m.resetTemplateForm}
          setSelectedTemplate={m.setSelectedTemplate}
        />

        <TemplatePreviewDialog
          open={m.showEyeModal}
          onClose={() => m.setShowEyeModal(false)}
          previewContent={m.previewContent}
        />

        <ConfirmDialogs
          deleteEmailDialogOpen={m.deleteEmailDialogOpen}
          setDeleteEmailDialogOpen={m.setDeleteEmailDialogOpen}
          setDeletingEmailId={m.setDeletingEmailId}
          handleDeleteEmail={m.handleDeleteEmail}
          resendEmailDialogOpen={m.resendEmailDialogOpen}
          setResendEmailDialogOpen={m.setResendEmailDialogOpen}
          setResendingEmailId={m.setResendingEmailId}
          handleResendEmail={m.handleResendEmail}
          batchDeleteDialogOpen={m.batchDeleteDialogOpen}
          setBatchDeleteDialogOpen={m.setBatchDeleteDialogOpen}
          handleBatchDeleteEmails={m.handleBatchDeleteEmails}
          batchResendDialogOpen={m.batchResendDialogOpen}
          setBatchResendDialogOpen={m.setBatchResendDialogOpen}
          handleBatchResendEmails={m.handleBatchResendEmails}
          deleteTemplateDialogOpen={m.deleteTemplateDialogOpen}
          setDeleteTemplateDialogOpen={m.setDeleteTemplateDialogOpen}
          setDeletingTemplateId={m.setDeletingTemplateId}
          handleDeleteTemplate={m.handleDeleteTemplate}
          selectedEmails={m.selectedEmails}
        />
      </Box>
    </MasterDetailPageTemplate>
  );
};

export default MailPage;
