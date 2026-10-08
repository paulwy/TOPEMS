// 移动端 UI 文案字典（2026-10-08 硬编码收敛；本文件路径含 /i18n/，受 hardcoded-precise 扫描器豁免）
// 语义：key 为稳定标识，值为展示文案（与原硬编码逐字节一致）；mobile 暂无 i18n 框架，此字典为文案单一信源。
// 带插值/复合的文案以导出函数实现；整体挪移的对象映射以导出对象实现（参照 desktop categoryColors 先例）。

export const zh: Record<string, string> = {
  // ── 通用共享 ──
  'common.alertHint': '提示',
  'common.success': '成功',
  'common.error': '错误',
  'common.cancel': '取消',
  'common.confirm': '确定',
  'common.confirmDelete': '确认删除',
  'common.deleteFailed': '删除失败',
  'common.edit': '编辑',
  'common.delete': '删除',
  'common.negativeQty': '库存数量不能为负数',
  'common.updateInventoryFailed': '更新库存失败',
  'common.editInDevelopment': '编辑功能开发中',
  'common.emptyDescription': '暂无描述',
  'common.applicant': '申请人',
  'common.approvalCommentOptional': '审批意见（可选）',
  'common.approvalCommentPlaceholder': '请输入审批意见...',
  'common.reject': '拒绝',
  'common.approve': '通过',
  'common.approvalApplication': '审批申请',
  'common.all': '全部',
  'common.createdAt': '创建时间',
  'common.updatedAt': '更新时间',
  'common.email': '邮箱',
  'common.statusNormal': '正常',
  'common.loading': '加载中...',
  'common.completed': '已完成',
  'common.cancelled': '已取消',
  'common.pending': '待处理',
  'common.inProgress': '进行中',
  'common.priorityUrgent': '紧急',
  'common.priorityHigh': '高',
  'common.priorityMedium': '中',
  'common.priorityLow': '低',
  'common.prioritySuffix': '优先级',
  'common.lowStock': '库存不足',
  'common.syncNow': '立即同步',
  'common.mine': '我的',
  'common.settings': '设置',
  'common.helpCenter': '帮助中心',
  'common.aboutUs': '关于我们',
  'common.logout': '退出登录',
  'common.notifications': '消息通知',
  'common.emptyTasks': '暂无任务',

  // ── SettingsPage ──
  'settings.offlineCannotSync': '当前处于离线状态，请连接网络后再尝试同步',
  'settings.syncSuccess': '同步成功',
  'settings.syncResult': '同步结果',
  'settings.syncComplete': '同步完成',
  'settings.syncFailed': '同步失败',
  'settings.syncError': '同步过程中出现错误',
  'settings.confirmClearOffline': '确认清除',
  'settings.clearOfflineConfirmMsg': '确定要清除所有离线数据吗？未同步的数据将丢失。',
  'settings.offlineDataCleared': '离线数据已清除',
  'settings.profileUpdated': '个人信息已更新',
  'settings.updateFailedRetry': '更新失败，请重试',
  'settings.changePassword': '修改密码',
  'settings.enterOldPassword': '请输入旧密码',
  'settings.enterNewPassword': '请输入新密码',
  'settings.passwordChanged': '密码修改成功，请重新登录',
  'settings.passwordChangeFailed': '密码修改失败',
  'settings.personalInfo': '个人信息',
  'settings.name': '姓名',
  'settings.phone': '手机号',
  'settings.role': '角色',
  'settings.notificationSettings': '通知设置',
  'settings.pushNotification': '推送通知',
  'settings.notificationSound': '通知声音',
  'settings.vibrationFeedback': '震动反馈',
  'settings.appSettings': '应用设置',
  'settings.language': '语言',
  'settings.languageChinese': '中文',
  'settings.theme': '主题',
  'settings.themeLight': '浅色',
  'settings.offlineDataManagement': '离线数据管理',
  'settings.offlineMode': '当前处于离线模式',
  'settings.onlineMode': '当前处于在线模式',
  'settings.offlineHint': '操作将保存到本地，网络恢复后自动同步',
  'settings.onlineHint': '数据实时同步到云端',
  'settings.pendingSync': '待同步',
  'settings.cachedData': '缓存数据',
  'settings.syncing': '同步中...',
  'settings.noPendingData': '暂无待同步数据',
  'settings.clearOfflineData': '清除离线数据',

  // ── AttendancePage ──
  'attendance.checkInScanSuccess': '扫码签到成功',
  'attendance.checkOutScanSuccess': '扫码签退成功',
  'attendance.scanSuccess': '扫码成功',
  'attendance.scanFailed': '扫码失败',
  'attendance.scanServiceError': '扫码服务异常',
  'attendance.serverUnreachable': '无法连接到服务器',
  'attendance.late': '迟到',
  'attendance.earlyLeave': '早退',
  'attendance.absent': '缺勤',
  'attendance.todayAttendance': '今日考勤',
  'attendance.locationLocated': '当前位置：已定位',
  'attendance.checkInTimePrefix': '签到 ',
  'attendance.checkIn': '上班签到',
  'attendance.checkInButton': '上班打卡',
  'attendance.checkOutTimePrefix': '签退 ',
  'attendance.checkOut': '下班签退',
  'attendance.checkOutButton': '下班打卡',
  'attendance.scanCheckIn': '扫码签到',
  'attendance.lateWarning': '今日迟到，请合理安排时间',
  'attendance.earlyLeaveWarning': '今日早退，请确认工作完成',
  'attendance.monthlyStats': '本月统计',
  'attendance.attendanceDays': '出勤天数',
  'attendance.recentRecords': '近期记录',
  'attendance.recordCheckInPrefix': '上班 ',
  'attendance.recordCheckOutPrefix': '| 下班 ',
  'attendance.noCheckIn': '未打卡',

  // ── ApprovalPage / ApprovalDetailPage ──
  'approval.approvedMsg': '审批已通过',
  'approval.rejectedMsg': '审批已拒绝',
  'approval.operateFailed': '审批操作失败',
  'approval.statusPending': '待审批',
  'approval.statusApproved': '已通过',
  'approval.statusRejected': '已拒绝',
  'approval.detailTitle': '审批详情',
  'approval.notFound': '审批记录不存在',
  'approval.basicInfo': '基本信息',
  'approval.approver': '审批人',
  'approval.dueDate': '截止日期',
  'approval.actions': '审批操作',
  'approval.flowEnded': '审批流程已结束',
  'approval.empty': '暂无审批',
  'approval.type': '审批类型',
  'approval.description': '审批说明',

  // ── CustomerDetailPage ──
  'customer.deleteConfirmMsg': '确定要删除此客户吗？',
  'customer.statusDisabled': '停用',
  'customer.detailTitle': '客户详情',
  'customer.notFound': '客户不存在',
  'customer.noCode': '未设置编码',
  'customer.contactInfo': '联系信息',
  'customer.contactName': '联系人',
  'customer.contactPhone': '联系电话',
  'customer.addressInfo': '地址信息',
  'customer.province': '省份',
  'customer.city': '城市',
  'customer.address': '详细地址',
  'customer.postalCode': '邮编',
  'customer.otherInfo': '其他信息',
  'customer.industry': '所属行业',

  // ── ScanModal / scanService ──
  'scan.cameraPermissionRequired': '需要相机权限才能使用扫码功能',
  'scan.openSettingsFailed': '无法打开设置，请手动前往系统设置开启相机权限',
  'scan.recognizing': '正在识别...',
  'scan.unknownRecognition': '未识别到相关信息',
  'scan.recognizedPrefix': '识别为',
  'scan.title': '扫码',
  'scan.retryPermission': '重新获取权限',
  'scan.goSettings': '前往设置',
  'scan.requestingPermission': '正在请求相机权限...',
  'scan.continue': '继续扫描',
  'scan.confirm': '确认',
  'scan.alignHint': '将条码对准扫描框',
  'scan.onlyQr': '仅识别二维码',
  'scan.onlyBarcode': '仅识别条形码',
  'scan.modeContinuous': '连续扫描模式',
  'scan.modeInventory': '库存扫码入库模式',
  'scan.modeAsset': '资产识别模式',
  'scan.modeOrder': '订单识别模式',
  'scan.modeAuto': '自动识别模式',
  'scan.hideHistory': '隐藏',
  'scan.showHistory': '显示',
  'scan.historyLabel': '扫描历史',
  'scan.recentHistory': '最近扫描记录',
  'scan.qrTypeName': '二维码',
  'scan.interleaved25Name': '交叉25码',
  'scan.unknownTypeName': '未知',

  // ── ProductionTrackingPage ──
  'production.inProgress': '生产中',
  'production.pending': '待生产',
  'production.confirmStart': '确认开始',
  'production.startFailed': '启动生产失败',
  'production.confirmComplete': '确认完成',
  'production.completeFailed': '完成生产失败',
  'production.plannedQty': '计划产量:',
  'production.start': '开始',
  'production.complete': '完成',
  'production.searchPlaceholder': '搜索产品名称...',
  'production.empty': '暂无生产订单',

  // ── InventoryPage / InventoryDetailPage ──
  'inventory.deleteConfirmMsg': '确定要删除此库存记录吗？',
  'inventory.detailTitle': '库存详情',
  'inventory.notFound': '库存记录不存在',
  'inventory.lowStockWarning': '当前库存低于安全阈值，请及时补货',
  'inventory.quantity': '库存数量',
  'inventory.detailInfo': '详细信息',
  'inventory.location': '存放位置',
  'inventory.category': '分类',
  'inventory.managementTitle': '库存管理',
  'inventory.searchPlaceholder': '搜索物料编码或名称',
  'inventory.empty': '暂无库存数据',
  'inventory.createInDevelopment': '新建库存功能开发中',

  // ── DashboardPage ──
  'dashboard.greeting': '您好',
  'dashboard.logout': '退出',
  'dashboard.pendingTasks': '待处理任务',
  'dashboard.completedTasks': '已完成任务',
  'dashboard.todayScans': '今日扫码',
  'dashboard.todayPatrols': '今日巡检',
  'dashboard.recentTasks': '近期任务',
  'dashboard.recentEvents': '近期活动',
  'dashboard.emptyEvents': '暂无活动',

  // ── TaskPage ──
  'task.noDueDate': '无截止日期',
  'task.searchPlaceholder': '搜索任务...',

  // ── ProfilePage ──
  'profile.fallbackName': '用户',
  'profile.fallbackRole': '员工',
  'profile.quickStats': '快捷统计',
  'profile.inProgressTasks': '进行中任务',
  'profile.unreadMessages': '未读消息',

  // ── AppNavigator ──
  'nav.home': '首页',
  'nav.task': '任务',
  'nav.approval': '审批',
  'nav.attendance': '考勤',
  'nav.notification': '通知',
  'nav.document': '文档',
  'nav.inventory': '库存',

  // ── DocumentPage ──
  'doc.statusPublished': '已发布',
  'doc.statusDraft': '草稿',
  'doc.statusArchived': '已归档',
  'doc.download': '下载',
  'doc.preview': '预览',
  'doc.title': '文档中心',
  'doc.searchPlaceholder': '搜索文档',
  'doc.empty': '暂无文档',

  // ── NotificationPage ──
  'notification.justNow': '刚刚',
  'notification.hoursAgo': '小时前',
  'notification.daysAgo': '天前',
  'notification.markAllRead': '全部已读',
  'notification.empty': '暂无通知',

  // ── LoginPage ──
  'login.enterCredentials': '请输入用户名和密码',
  'login.welcome': '欢迎登录',
  'login.username': '用户名',
  'login.password': '密码',
  'login.loading': '登录中...',
  'login.submit': '登录',

  // ── OfflineIndicator ──
  'offline.syncingData': '正在同步数据...',

  // ── authStore ──
  'auth.noTokenError': '登录失败：未获取到令牌',
  'auth.loginFailed': '登录失败',
  'auth.networkError': '登录失败，请检查网络连接',

  // ── NetworkStatusBar ──
  'netstatus.offlineMode': '离线模式',
  'netstatus.cellular': '蜂窝网络',
  'netstatus.autoSync': '数据将自动同步',
};

// 扫码识别类型中文名映射（scanResult.type → 展示文案；原 ScanModal 内联 typeNames 整体挪移）
export const scanTypeNames: Record<string, string> = {
  inventory: '库存',
  asset: '资产',
  order: '订单',
};

// ── 插值文案函数 ──
// SettingsPage: `成功同步 ${count} 条记录`
export const syncSuccessMessage = (count: unknown): string => `成功同步 ${count} 条记录`;

// AttendancePage: `识别内容: ${data}`
export const scanRecognizedContent = (data: string): string => `识别内容: ${data}`;

// AttendancePage: `识别内容: ${data}\n今日考勤已完成`（\n 为原模板串内的换行）
export const scanAllDoneMessage = (data: string): string => `识别内容: ${data}\n今日考勤已完成`;

// ProductionTrackingPage: `确定要开始生产订单 ${code} 吗？` / `确定要完成生产订单 ${code} 吗？`
export const startOrderConfirmMessage = (code: string): string => `确定要开始生产订单 ${code} 吗？`;
export const completeOrderConfirmMessage = (code: string): string =>
  `确定要完成生产订单 ${code} 吗？`;

// OfflineIndicator: `离线模式，${count} 条数据待同步` / `${count} 条数据待同步`
export const offlinePendingSyncMessage = (count: number): string =>
  `离线模式，${count} 条数据待同步`;
export const pendingSyncMessage = (count: number): string => `${count} 条数据待同步`;
