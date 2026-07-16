import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Search,
  Copy,
  Check,
  Eye,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Mail,
} from 'lucide-react';
import type { Email } from '@/api/mail';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/api/mail';

interface EmailListProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  setCurrentPage: (page: number) => void;
  emails: Email[];
  totalEmails: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  selectedEmails: string[];
  setSelectedEmails: React.Dispatch<React.SetStateAction<string[]>>;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  openEmailDetail: (email: Email) => void;
  openResendEmailDialog: (emailId: string) => void;
  openDeleteEmailDialog: (emailId: string) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  setBatchResendDialogOpen: (open: boolean) => void;
  setBatchDeleteDialogOpen: (open: boolean) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getPriorityBadge: (priority: string) => React.ReactNode;
}

const EmailList: React.FC<EmailListProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  setCurrentPage,
  emails,
  totalEmails,
  currentPage,
  pageSize,
  loading,
  selectedEmails,
  setSelectedEmails,
  copiedId,
  copyToClipboard,
  openEmailDetail,
  openResendEmailDialog,
  openDeleteEmailDialog,
  handlePrevPage,
  handleNextPage,
  setBatchResendDialogOpen,
  setBatchDeleteDialogOpen,
  getStatusBadge,
  getPriorityBadge,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ mt: 0 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1, position: 'relative' }}>
          <Box
            sx={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <Search
              size={20}
              color='text.disabled'
            />
          </Box>
          <TextField
            type='text'
            placeholder='搜索邮件主题、发件人...'
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            size='small'
            sx={{ pl: 5, width: '100%' }}
          />
        </Box>
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>状态</InputLabel>
          <Select
            value={statusFilter || 'all'}
            label='状态'
            onChange={(e) => {
              setStatusFilter(e.target.value === 'all' ? '' : e.target.value);
              setCurrentPage(1);
            }}
          >
            <MenuItem value='all'>全部</MenuItem>
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>优先级</InputLabel>
          <Select
            value={priorityFilter || 'all'}
            label='优先级'
            onChange={(e) => {
              setPriorityFilter(e.target.value === 'all' ? '' : e.target.value);
              setCurrentPage(1);
            }}
          >
            <MenuItem value='all'>全部</MenuItem>
            {PRIORITY_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {selectedEmails.length > 0 && (
            <Box
              sx={{
                px: 3,
                py: 1.5,
                bgcolor: 'blue.50',
                borderBottom: 1,
                borderColor: 'blue.200',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'blue.700' }}
              >
                已选择 {selectedEmails.length} 条记录
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant='contained'
                  size='small'
                  onClick={() => setBatchResendDialogOpen(true)}
                  sx={{ gap: 1 }}
                >
                  <RefreshCw size={16} />
                  批量重发
                </Button>
                <Button
                  variant='contained'
                  size='small'
                  onClick={() => setBatchDeleteDialogOpen(true)}
                  sx={{ gap: 1 }}
                >
                  <Trash2 size={16} />
                  批量删除
                </Button>
              </Box>
            </Box>
          )}
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Box
                sx={{
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite',
                  borderRadius: '50%',
                  height: 32,
                  width: 32,
                  border: 4,
                  borderColor: 'primary.main',
                  borderTopColor: 'transparent',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
              <Typography sx={{ mt: 1, color: 'grey.500' }}>加载中...</Typography>
            </Box>
          ) : emails.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Mail
                size={48}
                color='text.disabled'
                style={{ margin: '0 auto 12px' }}
              />
              <Typography sx={{ color: 'grey.500' }}>暂无邮件记录</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component='table'
                sx={{ width: '100%', borderCollapse: 'collapse' }}
              >
                <Box component='thead'>
                  <Box
                    component='tr'
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                  >
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 1.5,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                        width: 48,
                      }}
                    >
                      <input
                        type='checkbox'
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmails(emails.map((e) => e.id));
                          } else {
                            setSelectedEmails([]);
                          }
                        }}
                        checked={selectedEmails.length === emails.length}
                        style={{
                          borderRadius: 4,
                          borderColor: theme.palette.grey[300],
                          color: theme.palette.primary.dark,
                        }}
                      />
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      主题
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      收件人
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      发件人
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      状态
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      优先级
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      创建时间
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        textAlign: 'right',
                        px: 3,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      操作
                    </Box>
                  </Box>
                </Box>
                <Box component='tbody'>
                  {emails.map((email) => (
                    <Box
                      component='tr'
                      key={email.id}
                      sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'grey.50' },
                      }}
                    >
                      <Box
                        component='td'
                        sx={{ px: 1.5, py: 2 }}
                      >
                        <input
                          type='checkbox'
                          checked={selectedEmails.includes(email.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmails((prev) => [...prev, email.id]);
                            } else {
                              setSelectedEmails((prev) =>
                                prev.filter((id) => id !== email.id)
                              );
                            }
                          }}
                          style={{
                            borderRadius: 4,
                            borderColor: theme.palette.grey[300],
                            color: theme.palette.primary.dark,
                          }}
                        />
                      </Box>
                      <Box
                        component='td'
                        sx={{ px: 3, py: 2 }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 500,
                            color: 'text.primary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 240,
                          }}
                        >
                          {email.subject}
                        </Typography>
                      </Box>
                      <Box
                        component='td'
                        sx={{
                          px: 3,
                          py: 2,
                          fontSize: '0.875rem',
                          color: 'grey.600',
                        }}
                      >
                        {Array.isArray(email.to_addresses)
                          ? email.to_addresses.join(', ')
                          : email.to_addresses}
                      </Box>
                      <Box
                        component='td'
                        sx={{
                          px: 3,
                          py: 2,
                          fontSize: '0.875rem',
                          color: 'grey.600',
                        }}
                      >
                        {email.from_address}
                      </Box>
                      <Box
                        component='td'
                        sx={{ px: 3, py: 2 }}
                      >
                        {getStatusBadge(email.status)}
                      </Box>
                      <Box
                        component='td'
                        sx={{ px: 3, py: 2 }}
                      >
                        {getPriorityBadge(email.priority)}
                      </Box>
                      <Box
                        component='td'
                        sx={{
                          px: 3,
                          py: 2,
                          fontSize: '0.875rem',
                          color: 'grey.600',
                        }}
                      >
                        {new Date(email.created_at).toLocaleString('zh-CN')}
                      </Box>
                      <Box
                        component='td'
                        sx={{ px: 3, py: 2 }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 0.5,
                          }}
                        >
                          <Button
                            variant='text'
                            size='small'
                            onClick={() => copyToClipboard(email.id, `email-${email.id}`)}
                            title='复制ID'
                          >
                            {copiedId === `email-${email.id}` ? (
                              <Check
                                size={16}
                                color='success.dark'
                              />
                            ) : (
                              <Copy size={16} />
                            )}
                          </Button>
                          <Button
                            variant='text'
                            size='small'
                            onClick={() => openEmailDetail(email)}
                            title='查看详情'
                          >
                            <Eye size={16} />
                          </Button>
                          {email.status === 'failed' && (
                            <Button
                              variant='text'
                              size='small'
                              onClick={() => openResendEmailDialog(email.id)}
                              sx={{
                                color: 'success.main',
                                '&:hover': { color: 'success.dark' },
                              }}
                              title='重新发送'
                            >
                              <RefreshCw size={16} />
                            </Button>
                          )}
                          <Button
                            variant='text'
                            size='small'
                            sx={{
                              color: 'error.main',
                              '&:hover': { color: 'error.dark' },
                            }}
                            onClick={() => openDeleteEmailDialog(email.id)}
                            title='删除'
                          >
                            <Trash2 size={16} />
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
        {!loading && emails.length > 0 && (
          <CardContent
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              共 {totalEmails} 条记录
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant='text'
                size='small'
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </Button>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                {currentPage} / {Math.ceil(totalEmails / pageSize)}
              </Typography>
              <Button
                variant='text'
                size='small'
                onClick={handleNextPage}
                disabled={currentPage >= Math.ceil(totalEmails / pageSize)}
              >
                <ChevronRight size={16} />
              </Button>
            </Box>
          </CardContent>
        )}
      </Card>
    </Box>
  );
};

export default EmailList;
