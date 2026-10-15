(function () {
  'use strict';

  /**
   * Searchable navigation index for the TOPEMS navigation demo.
   * Covers L1-L4 navigation items across all 5 pages.
   */
  const NAVIGATION_INDEX = [];

  function addItem(item) {
    NAVIGATION_INDEX.push(item);
  }

  // ===================== L1 业务域 =====================
  const L1_DOMAINS = [
    { id: 'l1-enterprise', title: '企业平台', url: 'platform-services-mapping.html', icon: 'building-2', keywords: ['enterprise', 'admin', '办公'] },
    { id: 'l1-manufacturing', title: '制造域', url: 'index.html', icon: 'factory', keywords: ['mes', 'wms', 'qms', 'aps', '生产'] },
    { id: 'l1-quality', title: '质量域', url: 'remaining-domains-mapping.html', icon: 'shield-check', keywords: ['iqc', 'ipqc', 'oqc', 'spc', '质检'] },
    { id: 'l1-supply-chain', title: '供应链域', url: 'remaining-domains-mapping.html', icon: 'truck', keywords: ['采购', '库存', '物流', 'srm', '供应商'] },
    { id: 'l1-finance', title: '财务域', url: 'finance-hr-crm-mapping.html', icon: 'landmark', keywords: ['财务', '总账', '应收', '应付', '报表'] },
    { id: 'l1-hr', title: '人力域', url: 'finance-hr-crm-mapping.html', icon: 'users', keywords: ['人事', '薪酬', '考勤', '招聘', '绩效'] },
    { id: 'l1-crm', title: '客户域', url: 'finance-hr-crm-mapping.html', icon: 'handshake', keywords: ['客户', '商机', '合同', 'crm', '销售'] },
    { id: 'l1-project', title: '项目域', url: 'remaining-domains-mapping.html', icon: 'folder-kanban', keywords: ['项目', '任务', '看板', '甘特图', '里程碑'] },
    { id: 'l1-collaboration', title: '协同域', url: 'platform-services-mapping.html', icon: 'messages-square', keywords: ['协同', '通讯', '审批', '待办', 'im'] },
    { id: 'l1-platform', title: '平台能力', url: 'platform-services-mapping.html', icon: 'layers', keywords: ['平台能力', '文件', '知识库', '通知', 'gis'] }
  ];

  L1_DOMAINS.forEach(d => addItem({ id: d.id, title: d.title, level: 'L1', domain: d.title, icon: d.icon, url: d.url, keywords: d.keywords }));

  // ===================== L2 模块 =====================
  const L2_MODULES = {
    '企业平台': [
      { id: 'l2-enterprise-admin', title: '行政', icon: 'briefcase', url: 'platform-services-mapping.html', keywords: ['行政', '用车', '会议室', '资产'] },
      { id: 'l2-enterprise-attendance', title: '考勤', icon: 'clock', url: 'platform-services-mapping.html', keywords: ['考勤', '打卡', '出勤'] }
    ],
    '协同域': [
      { id: 'l2-collab-im', title: '通讯', icon: 'message-circle', url: 'platform-services-mapping.html', keywords: ['im', '消息', '通讯录', '群组'] },
      { id: 'l2-collab-approval', title: '审批', icon: 'check-square', url: 'platform-services-mapping.html', keywords: ['审批', '流程', '待我审批'] },
      { id: 'l2-collab-todo', title: '待办', icon: 'list-checks', url: 'platform-services-mapping.html', keywords: ['待办', '已办', '事项'] }
    ],
    '平台能力': [
      { id: 'l2-platform-file', title: '文件管理', icon: 'folder', url: 'platform-services-mapping.html', keywords: ['文件', '网盘', '共享文件'] },
      { id: 'l2-platform-kb', title: '知识库', icon: 'book-open', url: 'platform-services-mapping.html', keywords: ['知识', '文档', 'wiki'] },
      { id: 'l2-platform-notify', title: '通知中心', icon: 'bell', url: 'platform-services-mapping.html', keywords: ['通知', '消息', '提醒'] },
      { id: 'l2-platform-gis', title: 'GIS', icon: 'map', url: 'platform-services-mapping.html', keywords: ['地图', 'gis', '图层'] }
    ],
    '财务域': [
      { id: 'l2-finance-gl', title: '总账', icon: 'library', url: 'finance-hr-crm-mapping.html', keywords: ['总账', '科目', '凭证', '日记账'] },
      { id: 'l2-finance-ar', title: '应收', icon: 'receipt', url: 'finance-hr-crm-mapping.html', keywords: ['应收', '发票', '收款'] },
      { id: 'l2-finance-ap', title: '应付', icon: 'credit-card', url: 'finance-hr-crm-mapping.html', keywords: ['应付', '付款', '采购发票'] },
      { id: 'l2-finance-fa', title: '固定资产', icon: 'archive', url: 'finance-hr-crm-mapping.html', keywords: ['固定资产', '资产卡片', '折旧'] },
      { id: 'l2-finance-cost', title: '成本管理', icon: 'calculator', url: 'finance-hr-crm-mapping.html', keywords: ['成本', '成本中心', '分摊'] },
      { id: 'l2-finance-report', title: '财务报表', icon: 'bar-chart-2', url: 'finance-hr-crm-mapping.html', keywords: ['报表', '资产负债表', '利润表', '现金流量表'] }
    ],
    '人力域': [
      { id: 'l2-hr-org', title: '组织人事', icon: 'users', url: 'finance-hr-crm-mapping.html', keywords: ['人事', '员工档案', '部门'] },
      { id: 'l2-hr-payroll', title: '薪酬', icon: 'banknote', url: 'finance-hr-crm-mapping.html', keywords: ['薪酬', '工资单', '社保', '公积金'] },
      { id: 'l2-hr-attendance', title: '考勤', icon: 'clock', url: 'finance-hr-crm-mapping.html', keywords: ['考勤', '请假', '排班'] },
      { id: 'l2-hr-recruit', title: '招聘', icon: 'user-plus', url: 'finance-hr-crm-mapping.html', keywords: ['招聘', '候选人', '面试'] },
      { id: 'l2-hr-performance', title: '绩效', icon: 'trending-up', url: 'finance-hr-crm-mapping.html', keywords: ['绩效', '考核', 'kpi'] }
    ],
    '客户域': [
      { id: 'l2-crm-customer', title: '客户管理', icon: 'contact', url: 'finance-hr-crm-mapping.html', keywords: ['客户档案', '联系人', '分级'] },
      { id: 'l2-crm-opportunity', title: '商机', icon: 'lightbulb', url: 'finance-hr-crm-mapping.html', keywords: ['商机', '漏斗', '跟进'] },
      { id: 'l2-crm-contract', title: '合同', icon: 'file-text', url: 'finance-hr-crm-mapping.html', keywords: ['合同', '回款', '开票'] },
      { id: 'l2-crm-marketing', title: '市场活动', icon: 'megaphone', url: 'finance-hr-crm-mapping.html', keywords: ['市场', '活动', '线索'] },
      { id: 'l2-crm-service', title: '售后服务', icon: 'headphones', url: 'finance-hr-crm-mapping.html', keywords: ['售后', '工单', '服务请求'] }
    ],
    '制造域': [
      { id: 'l2-mfg-mes', title: 'MES 制造执行', icon: 'factory', url: 'remaining-domains-mapping.html', keywords: ['mes', '制造执行', '生产工单'] },
      { id: 'l2-mfg-wms', title: 'WMS 仓储管理', icon: 'warehouse', url: 'remaining-domains-mapping.html', keywords: ['wms', '仓库', '库位'] },
      { id: 'l2-mfg-qms', title: 'QMS 质量管理', icon: 'shield-check', url: 'remaining-domains-mapping.html', keywords: ['qms', '质量', '检验标准'] },
      { id: 'l2-mfg-aps', title: 'APS 排程管理', icon: 'calendar-clock', url: 'remaining-domains-mapping.html', keywords: ['aps', '排程', '产能'] },
      { id: 'l2-mfg-energy', title: '能源管理', icon: 'zap', url: 'remaining-domains-mapping.html', keywords: ['能源', '能耗', '节能'] },
      { id: 'l2-mfg-equipment', title: '设备管理', icon: 'settings', url: 'remaining-domains-mapping.html', keywords: ['设备', '台账', '保养'] }
    ],
    '质量域': [
      { id: 'l2-quality-iqc', title: '来料检验 (IQC)', icon: 'clipboard-check', url: 'remaining-domains-mapping.html', keywords: ['iqc', '来料检验', '进货检验'] },
      { id: 'l2-quality-ipqc', title: '过程检验 (IPQC)', icon: 'scan-eye', url: 'remaining-domains-mapping.html', keywords: ['ipqc', '巡检', '过程检验'] },
      { id: 'l2-quality-oqc', title: '出货检验 (OQC)', icon: 'package-check', url: 'remaining-domains-mapping.html', keywords: ['oqc', '出货检验', '放行'] },
      { id: 'l2-quality-ncr', title: '不合格品', icon: 'x-octagon', url: 'remaining-domains-mapping.html', keywords: ['不合格品', 'ncr', '评审'] },
      { id: 'l2-quality-trace', title: '质量追溯', icon: 'git-merge', url: 'remaining-domains-mapping.html', keywords: ['追溯', '批次', '质量履历'] },
      { id: 'l2-quality-spc', title: 'SPC', icon: 'bar-chart-3', url: 'remaining-domains-mapping.html', keywords: ['spc', '控制图', '过程能力'] }
    ],
    '供应链域': [
      { id: 'l2-sc-purchase', title: '采购管理', icon: 'shopping-cart', url: 'remaining-domains-mapping.html', keywords: ['采购', '采购订单', '收货'] },
      { id: 'l2-sc-inventory', title: '库存管理', icon: 'package', url: 'remaining-domains-mapping.html', keywords: ['库存', '批次', '出入库', '盘点'] },
      { id: 'l2-sc-logistics', title: '物流管理', icon: 'truck', url: 'remaining-domains-mapping.html', keywords: ['物流', '运输', '配送'] },
      { id: 'l2-sc-srm', title: 'SRM 供应商关系', icon: 'handshake', url: 'remaining-domains-mapping.html', keywords: ['srm', '供应商协同', '评估'] },
      { id: 'l2-sc-supplier', title: '供应商管理', icon: 'user-check', url: 'remaining-domains-mapping.html', keywords: ['供应商', '准入', '分级'] }
    ],
    '项目域': [
      { id: 'l2-project-mgmt', title: '项目管理', icon: 'folder-kanban', url: 'remaining-domains-mapping.html', keywords: ['项目', '立项', '范围'] },
      { id: 'l2-project-task', title: '任务管理', icon: 'list-checks', url: 'remaining-domains-mapping.html', keywords: ['任务', '子任务', '工时'] },
      { id: 'l2-project-board', title: '项目看板', icon: 'layout-kanban', url: 'remaining-domains-mapping.html', keywords: ['看板', '迭代', '进度'] },
      { id: 'l2-project-gantt', title: '甘特图', icon: 'calendar-range', url: 'remaining-domains-mapping.html', keywords: ['甘特图', '进度计划', '关键路径'] },
      { id: 'l2-project-milestone', title: '里程碑', icon: 'flag', url: 'remaining-domains-mapping.html', keywords: ['里程碑', '交付物', '风险'] }
    ]
  };

  Object.keys(L2_MODULES).forEach(domain => {
    L2_MODULES[domain].forEach(m => addItem({ id: m.id, title: m.title, level: 'L2', domain: domain, icon: m.icon, url: m.url, keywords: m.keywords }));
  });

  // ===================== L3 子组 =====================
  const L3_CATEGORIES = [
    { key: 'overview', title: '概览', icon: 'layout-dashboard' },
    { key: 'master-data', title: '主数据', icon: 'database' },
    { key: 'process', title: '业务流程', icon: 'workflow' },
    { key: 'documents', title: '业务单据', icon: 'file-stack' },
    { key: 'analytics', title: '统计分析', icon: 'bar-chart-3' },
    { key: 'report', title: '报表', icon: 'flag' },
    { key: 'settings', title: '设置', icon: 'file-cog' }
  ];

  const DOMAIN_PAGES = {
    '企业平台': 'platform-services-mapping.html',
    '协同域': 'platform-services-mapping.html',
    '平台能力': 'platform-services-mapping.html',
    '财务域': 'finance-hr-crm-mapping.html',
    '人力域': 'finance-hr-crm-mapping.html',
    '客户域': 'finance-hr-crm-mapping.html',
    '制造域': 'remaining-domains-mapping.html',
    '质量域': 'remaining-domains-mapping.html',
    '供应链域': 'remaining-domains-mapping.html',
    '项目域': 'remaining-domains-mapping.html'
  };

  L1_DOMAINS.forEach(d => {
    L3_CATEGORIES.forEach(cat => {
      addItem({
        id: 'l3-' + d.id.replace('l1-', '') + '-' + cat.key,
        title: cat.title,
        level: 'L3',
        domain: d.title,
        icon: cat.icon,
        url: d.url,
        keywords: [cat.title]
      });
    });
  });

  // ===================== L4 页面 =====================
  const L4_PAGES = {
    '制造域': [
      { id: 'l4-mfg-work-order', title: '工单管理', icon: 'clipboard-list', keywords: ['工单', '生产工单'] },
      { id: 'l4-mfg-prod-order', title: '生产订单', icon: 'file-text', keywords: ['生产订单', '生产'] },
      { id: 'l4-mfg-material', title: '物料主数据', icon: 'package', keywords: ['物料', '物料编码'] },
      { id: 'l4-mfg-bom', title: 'BOM 管理', icon: 'git-branch', keywords: ['bom', '物料清单'] },
      { id: 'l4-mfg-routing', title: '工艺路线', icon: 'route', keywords: ['工艺路线', '工序'] }
    ],
    '质量域': [
      { id: 'l4-quality-qc-order', title: '质检单', icon: 'clipboard-check', keywords: ['质检单', '检验单'] },
      { id: 'l4-quality-ncr-doc', title: '不合格品处理单', icon: 'x-octagon', keywords: ['不合格品', 'ncr'] },
      { id: 'l4-quality-spc-chart', title: '控制图', icon: 'bar-chart-3', keywords: ['控制图', 'spc'] }
    ],
    '供应链域': [
      { id: 'l4-sc-purchase-order', title: '采购订单', icon: 'shopping-cart', keywords: ['采购订单', 'po'] },
      { id: 'l4-sc-sales-order', title: '销售订单', icon: 'file-text', keywords: ['销售订单', 'so'] },
      { id: 'l4-sc-inbound', title: '入库单', icon: 'arrow-down-left', keywords: ['入库单', '收货'] },
      { id: 'l4-sc-outbound', title: '出库单', icon: 'arrow-up-right', keywords: ['出库单', '发货'] },
      { id: 'l4-sc-transfer', title: '调拨单', icon: 'shuffle', keywords: ['调拨', '库存转移'] }
    ],
    '财务域': [
      { id: 'l4-finance-voucher', title: '记账凭证', icon: 'receipt', keywords: ['凭证', '记账'] },
      { id: 'l4-finance-reimburse', title: '报销单', icon: 'banknote', keywords: ['报销', '费用报销'] },
      { id: 'l4-finance-invoice', title: '发票管理', icon: 'file-text', keywords: ['发票', '进项', '销项'] }
    ],
    '人力域': [
      { id: 'l4-hr-leave', title: '请假申请', icon: 'calendar-off', keywords: ['请假', '休假'] },
      { id: 'l4-hr-pay-slip', title: '工资单', icon: 'banknote', keywords: ['工资单', '薪资'] },
      { id: 'l4-hr-resume', title: '候选人简历', icon: 'user', keywords: ['简历', '候选人'] }
    ],
    '客户域': [
      { id: 'l4-crm-customer-file', title: '客户档案', icon: 'contact', keywords: ['客户档案', '客户资料'] },
      { id: 'l4-crm-opportunity-sheet', title: '商机跟进表', icon: 'lightbulb', keywords: ['商机', '跟进'] },
      { id: 'l4-crm-contract-doc', title: '合同台账', icon: 'file-text', keywords: ['合同台账', '合同'] }
    ],
    '企业平台': [
      { id: 'l4-enterprise-car', title: '用车申请', icon: 'car', keywords: ['用车', '车辆'] },
      { id: 'l4-enterprise-room', title: '会议室预定', icon: 'door-open', keywords: ['会议室', '预定'] }
    ],
    '协同域': [
      { id: 'l4-collab-approval-todo', title: '待我审批', icon: 'check-square', keywords: ['待我审批', '审批任务'] },
      { id: 'l4-collab-my-todo', title: '我的待办', icon: 'list-checks', keywords: ['我的待办', '待办事项'] }
    ],
    '平台能力': [
      { id: 'l4-platform-my-file', title: '个人文件', icon: 'folder', keywords: ['个人文件', '网盘'] },
      { id: 'l4-platform-kb-space', title: '知识空间', icon: 'book-open', keywords: ['知识空间', 'wiki'] }
    ],
    '项目域': [
      { id: 'l4-project-gantt-chart', title: '项目甘特图', icon: 'calendar-range', keywords: ['甘特图', '进度'] },
      { id: 'l4-project-task-list', title: '任务清单', icon: 'list-checks', keywords: ['任务清单', '任务'] }
    ]
  };

  Object.keys(L4_PAGES).forEach(domain => {
    L4_PAGES[domain].forEach(p => addItem({
      id: p.id,
      title: p.title,
      level: 'L4',
      domain: domain,
      icon: p.icon,
      url: DOMAIN_PAGES[domain],
      keywords: p.keywords
    }));
  });

  // ===================== Command palette logic =====================
  const LEVEL_ORDER = ['L1', 'L2', 'L3', 'L4'];
  const LEVEL_LABELS = {
    L1: 'L1 业务域',
    L2: 'L2 模块',
    L3: 'L3 子组',
    L4: 'L4 页面'
  };

  let modal;
  let input;
  let resultsContainer;
  let emptyState;
  let initialState;
  let triggerButton = null;
  let lastFocusedElement = null;
  let selectedIndex = -1;
  let isOpen = false;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalize(text) {
    return String(text).toLowerCase().trim();
  }

  function init() {
    const existing = document.getElementById('search-modal');
    if (existing) {
      modal = existing;
      input = document.getElementById('search-input');
      resultsContainer = document.getElementById('search-results');
      emptyState = document.getElementById('search-empty');
      initialState = document.getElementById('search-initial');
      modal.querySelector('.search-backdrop').addEventListener('click', close);
      input.addEventListener('input', onInput);
      modal.addEventListener('keydown', onModalKeyDown);
    } else {
      createModalMarkup();
    }
    bindTriggers();
    bindKeyboardShortcut();
  }

  function createModalMarkup() {
    const markup = `
<div id="search-modal" class="fixed inset-0 z-[700] hidden" role="dialog" aria-modal="true">
  <div class="search-backdrop absolute inset-0 backdrop-blur-sm transition-opacity" style="background-color: var(--brand-overlay);"></div>
  <div class="relative flex items-start justify-center pt-[15vh] px-4">
    <div class="w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[70vh]" style="border-color: var(--brand-border); background-color: var(--brand-card);">
      <div class="flex items-center gap-3 px-4 py-3 border-b" style="border-color: var(--brand-border);">
        <i data-lucide="search" class="w-5 h-5 text-muted-foreground flex-shrink-0"></i>
        <input type="text" id="search-input" placeholder="搜索导航、模块、页面..." class="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground" autocomplete="off" aria-autocomplete="list" aria-controls="search-results">
        <kbd class="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono text-muted-foreground flex-shrink-0" style="border-color: var(--brand-border);">
          <span>Esc</span>
        </kbd>
      </div>
      <div id="search-results" class="flex-1 overflow-y-auto p-2">
        <div id="search-empty" class="hidden py-8 text-center">
          <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-muted-foreground"></i>
          <p class="text-sm text-muted-foreground">未找到匹配的导航项</p>
        </div>
        <div id="search-initial" class="py-6 px-2 text-center">
          <p class="text-xs text-muted-foreground">输入关键词搜索 L1-L4 导航，或按 ↑ ↓ 选择、Enter 打开</p>
        </div>
      </div>
      <div class="flex-none px-4 py-2 border-t text-[10px] text-muted-foreground flex items-center justify-between" style="border-color: var(--brand-border); background-color: color-mix(in srgb, var(--brand-muted) 30%, transparent);">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1"><kbd class="px-1 rounded border" style="border-color: var(--brand-border);">↑</kbd> <kbd class="px-1 rounded border" style="border-color: var(--brand-border);">↓</kbd> 选择</span>
          <span class="flex items-center gap-1"><kbd class="px-1 rounded border" style="border-color: var(--brand-border);">↵</kbd> 打开</span>
        </div>
        <span class="flex items-center gap-1"><kbd class="px-1 rounded border" style="border-color: var(--brand-border);">Esc</kbd> 关闭</span>
      </div>
    </div>
  </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', markup);
    modal = document.getElementById('search-modal');
    input = document.getElementById('search-input');
    resultsContainer = document.getElementById('search-results');
    emptyState = document.getElementById('search-empty');
    initialState = document.getElementById('search-initial');

    modal.querySelector('.search-backdrop').addEventListener('click', close);
    input.addEventListener('input', onInput);
    modal.addEventListener('keydown', onModalKeyDown);
  }

  function bindTriggers() {
    const triggers = document.querySelectorAll('[data-search-trigger]');
    triggers.forEach(function (btn) {
      if (!triggerButton) triggerButton = btn;
      btn.setAttribute('aria-label', '搜索导航');
      btn.addEventListener('click', open);
    });
  }

  function bindKeyboardShortcut() {
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const active = document.activeElement;
        if (active) {
          const tag = active.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) return;
        }
        e.preventDefault();
        open();
      }
    });
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    lastFocusedElement = document.activeElement;
    modal.classList.remove('hidden');
    input.value = '';
    selectedIndex = -1;
    renderInitial();
    input.focus();
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function onInput() {
    filter(input.value);
  }

  function filter(query) {
    const q = normalize(query);
    if (!q) {
      renderInitial();
      return;
    }
    const items = NAVIGATION_INDEX.filter(function (item) {
      const terms = [item.title, item.domain].concat(item.keywords || []);
      return terms.some(function (t) { return normalize(t).includes(q); });
    });
    items.sort(function (a, b) {
      const levelDiff = LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
      if (levelDiff !== 0) return levelDiff;
      return a.title.localeCompare(b.title, 'zh-CN');
    });
    renderResults(items, q);
  }

  function renderInitial() {
    selectedIndex = -1;
    resultsContainer.innerHTML = '';
    initialState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    resultsContainer.appendChild(initialState);
    resultsContainer.appendChild(emptyState);
  }

  function renderResults(items, query) {
    resultsContainer.innerHTML = '';
    if (!items.length) {
      emptyState.classList.remove('hidden');
      resultsContainer.appendChild(emptyState);
      selectedIndex = -1;
      refreshIcons();
      return;
    }

    const groups = {};
    items.forEach(function (item) {
      groups[item.level] = groups[item.level] || [];
      groups[item.level].push(item);
    });

    LEVEL_ORDER.forEach(function (level) {
      if (!groups[level]) return;
      const header = document.createElement('div');
      header.className = 'px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider';
      header.textContent = LEVEL_LABELS[level];
      resultsContainer.appendChild(header);

      groups[level].forEach(function (item) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'search-result-item group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
        btn.setAttribute('data-url', item.url);
        btn.setAttribute('data-id', item.id);
        btn.setAttribute('data-level', item.level);
        btn.innerHTML =
          '<i data-lucide="' + item.icon + '" class="w-4 h-4 text-muted-foreground flex-shrink-0"></i>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="text-sm font-medium text-foreground truncate">' + highlight(item.title, query) + '</div>' +
            '<div class="text-xs text-muted-foreground truncate">' +
              '<span class="inline-flex items-center px-1.5 py-0 rounded bg-muted text-[10px] mr-1">' + escapeHtml(item.domain) + '</span>' +
              escapeHtml(LEVEL_LABELS[item.level]) +
            '</div>' +
          '</div>' +
          '<i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"></i>';
        btn.addEventListener('mouseenter', function () { selectByElement(btn); });
        btn.addEventListener('click', function () { navigate(item.url); });
        resultsContainer.appendChild(btn);
      });
    });

    selectedIndex = 0;
    updateSelection();
    refreshIcons();
  }

  function highlight(text, query) {
    if (!query) return escapeHtml(text);
    const terms = query.split(/\s+/).filter(Boolean).map(escapeRegex);
    if (!terms.length) return escapeHtml(text);
    const regex = new RegExp('(' + terms.join('|') + ')', 'gi');
    return escapeHtml(text).replace(regex, '<mark class="bg-primary/20 text-primary rounded px-0.5">$1</mark>');
  }

  function selectByElement(el) {
    const items = getResultItems();
    const idx = items.indexOf(el);
    if (idx >= 0) setSelectedIndex(idx);
  }

  function setSelectedIndex(idx) {
    const items = getResultItems();
    if (!items.length) {
      selectedIndex = -1;
      return;
    }
    selectedIndex = Math.max(0, Math.min(idx, items.length - 1));
    updateSelection();
  }

  function updateSelection() {
    const items = getResultItems();
    items.forEach(function (item, i) {
      if (i === selectedIndex) {
        item.classList.add('bg-primary/10', 'text-primary');
        item.querySelectorAll('.text-foreground').forEach(function (el) {
          el.classList.replace('text-foreground', 'text-primary');
        });
        item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } else {
        item.classList.remove('bg-primary/10', 'text-primary');
        item.querySelectorAll('.text-primary').forEach(function (el) {
          el.classList.replace('text-primary', 'text-foreground');
        });
      }
    });
  }

  function getResultItems() {
    return Array.prototype.slice.call(resultsContainer.querySelectorAll('.search-result-item'));
  }

  function navigate(url) {
    if (!url) return;
    close();
    window.location.href = url;
  }

  function onModalKeyDown(e) {
    const items = getResultItems();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!items.length) return;
      setSelectedIndex((selectedIndex + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      setSelectedIndex((selectedIndex - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        navigate(items[selectedIndex].getAttribute('data-url'));
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      trapFocus(e);
    }
  }

  function trapFocus(e) {
    const focusable = Array.prototype.slice.call(modal.querySelectorAll(
      'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])'
    ));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function refreshIcons() {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.NAVIGATION_INDEX = NAVIGATION_INDEX;
})();
