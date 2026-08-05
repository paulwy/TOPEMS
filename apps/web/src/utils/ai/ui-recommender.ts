/**
 * V47.0 前端 AI 增强 — UI 组件推荐器
 *
 * 支持基于需求描述推荐组件：
 * - 自然语言描述 → 组件推荐
 * - 设计稿分析 → 组件方案
 * - 现有组件分析 → 优化建议
 *
 * 预置 MUI / Ant Design / Chakra UI 组件知识库，
 * 支持组件组合推荐（多组件协作方案）。
 */

// ============ 枚举与类型定义 ============

export enum ComponentCategory {
  LAYOUT = 'layout',
  NAVIGATION = 'navigation',
  INPUT = 'input',
  FEEDBACK = 'feedback',
  DATADISPLAY = 'data_display',
  DATAENTRY = 'data_entry',
  OVERLAY = 'overlay',
  UTILITY = 'utility',
}

export enum UILibrary {
  MUI = 'mui',
  ANTDESIGN = 'ant_design',
  CHAKRAUI = 'chakra_ui',
}

export enum ResponsiveStrategy {
  MOBILEFIRST = 'mobile_first',
  DESKTOPFIRST = 'desktop_first',
  ADAPTIVE = 'adaptive',
  FIXEDWIDTH = 'fixed_width',
}

// ============ 接口定义 ============

export interface ComponentRecommendation {
  component_name: string;
  library: UILibrary;
  reason: string;
  similarity_score: number;
  usage_example: string;
  props_suggestion: Record<string, unknown>;
  alternatives: AlternativeComponent[];
  category: ComponentCategory;
  accessibility_notes?: string[];
}

export interface AlternativeComponent {
  component_name: string;
  library: UILibrary;
  reason: string;
  trade_offs: string;
}

export interface DesignAnalysis {
  layout_type: string;
  color_scheme: string[];
  typography: {
    font_family?: string;
    sizes: string[];
    weights: number[];
  };
  spacing: string;
  components_detected: string[];
  responsive_strategy: ResponsiveStrategy;
  accessibility_issues?: string[];
}

export interface RecommendationContext {
  description: string;
  current_components?: string[];
  design_constraints?: Record<string, unknown>;
  framework?: string;
  accessibility_requirements?: string[];
  target_library?: UILibrary;
  existing_libraries?: UILibrary[];
}

export interface ComponentKnowledge {
  name: string;
  library: UILibrary;
  category: ComponentCategory;
  description: string;
  keywords: string[];
  props: string[];
  import_path: string;
  usage_example: string;
  accessibility_features?: string[];
  responsive_support?: boolean;
  composition_hints?: string[];
}

export interface ComponentComposition {
  primary_component: ComponentKnowledge;
  supporting_components: ComponentKnowledge[];
  reason: string;
  usage_example: string;
  data_flow?: string;
}

export interface AccessibilitySuggestion {
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  recommendation: string;
  component?: string;
  wcag_criterion?: string;
}

// ============ 组件知识库 ============

const MUI_COMPONENTS: ComponentKnowledge[] = [
  {
    name: 'Box',
    library: UILibrary.MUI,
    category: ComponentCategory.LAYOUT,
    description: '通用布局容器，支持 sx 属性和灵活样式',
    keywords: ['container', 'layout', 'wrapper', 'div', 'box', '布局', '容器'],
    props: ['sx', 'component', 'display', 'flexDirection', 'gap', 'padding', 'margin'],
    import_path: '@mui/material/Box',
    usage_example: '<Box sx={{ display: "flex", gap: 2, p: 2 }}>内容</Box>',
    responsive_support: true,
    composition_hints: ['Stack', 'Grid', 'Paper'],
  },
  {
    name: 'Grid',
    library: UILibrary.MUI,
    category: ComponentCategory.LAYOUT,
    description: '响应式网格布局系统',
    keywords: ['grid', 'layout', 'responsive', 'columns', '网格', '响应式', '布局'],
    props: ['container', 'item', 'xs', 'sm', 'md', 'lg', 'xl', 'spacing', 'columns'],
    import_path: '@mui/material/Grid',
    usage_example: '<Grid container spacing={2}><Grid item xs={12} md={6}>内容</Grid></Grid>',
    responsive_support: true,
    composition_hints: ['Box', 'Card', 'Paper'],
  },
  {
    name: 'Stack',
    library: UILibrary.MUI,
    category: ComponentCategory.LAYOUT,
    description: '一维弹性布局容器',
    keywords: ['stack', 'flex', 'column', 'row', '布局', '弹性', '堆叠'],
    props: ['direction', 'spacing', 'divider', 'alignItems', 'justifyContent'],
    import_path: '@mui/material/Stack',
    usage_example: '<Stack direction="column" spacing={2}>内容</Stack>',
    responsive_support: true,
    composition_hints: ['Box', 'Typography'],
  },
  {
    name: 'AppBar',
    library: UILibrary.MUI,
    category: ComponentCategory.NAVIGATION,
    description: '应用栏导航组件',
    keywords: ['appbar', 'header', 'navigation', 'top', '导航', '顶栏'],
    props: ['position', 'color', 'elevation', 'variant'],
    import_path: '@mui/material/AppBar',
    usage_example: '<AppBar position="static"><Toolbar>导航</Toolbar></AppBar>',
    accessibility_features: ['ARIA navigation role'],
    responsive_support: true,
    composition_hints: ['Toolbar', 'Typography', 'IconButton'],
  },
  {
    name: 'Drawer',
    library: UILibrary.MUI,
    category: ComponentCategory.NAVIGATION,
    description: '侧边栏抽屉导航',
    keywords: ['drawer', 'sidebar', 'navigation', 'side', '侧边栏', '抽屉'],
    props: ['open', 'anchor', 'variant', 'onClose', 'ModalProps'],
    import_path: '@mui/material/Drawer',
    usage_example: '<Drawer open={open} onClose={onClose}>侧边内容</Drawer>',
    accessibility_features: ['焦点管理', '键盘导航', 'ARIA role'],
    responsive_support: true,
    composition_hints: ['List', 'ListItem'],
  },
  {
    name: 'TextField',
    library: UILibrary.MUI,
    category: ComponentCategory.INPUT,
    description: '文本输入框，支持多种变体',
    keywords: ['input', 'text', 'field', 'form', '输入', '表单'],
    props: ['label', 'value', 'onChange', 'variant', 'error', 'helperText', 'disabled', 'required'],
    import_path: '@mui/material/TextField',
    usage_example: '<TextField label="用户名" value={value} onChange={handleChange} />',
    accessibility_features: ['ARIA label', '错误提示', '必填标记'],
    responsive_support: true,
    composition_hints: ['FormControl', 'InputLabel', 'FormHelperText'],
  },
  {
    name: 'Select',
    library: UILibrary.MUI,
    category: ComponentCategory.INPUT,
    description: '下拉选择器',
    keywords: ['select', 'dropdown', 'choice', 'option', '下拉', '选择'],
    props: ['value', 'onChange', 'label', 'options', 'multiple', 'disabled'],
    import_path: '@mui/material/Select',
    usage_example:
      '<Select value={value} onChange={handleChange}><MenuItem value={1}>选项</MenuItem></Select>',
    accessibility_features: ['键盘导航', 'ARIA listbox'],
    responsive_support: true,
    composition_hints: ['MenuItem', 'FormControl'],
  },
  {
    name: 'Button',
    library: UILibrary.MUI,
    category: ComponentCategory.INPUT,
    description: '按钮组件，支持多种变体',
    keywords: ['button', 'action', 'click', 'submit', '按钮', '操作'],
    props: ['variant', 'color', 'size', 'onClick', 'disabled', 'startIcon', 'endIcon'],
    import_path: '@mui/material/Button',
    usage_example:
      '<Button variant="contained" color="primary" onClick={handleClick}>提交</Button>',
    accessibility_features: ['ARIA button role', '键盘支持'],
    responsive_support: true,
    composition_hints: ['IconButton', 'ButtonGroup'],
  },
  {
    name: 'Dialog',
    library: UILibrary.MUI,
    category: ComponentCategory.OVERLAY,
    description: '模态对话框',
    keywords: ['dialog', 'modal', 'popup', 'overlay', '对话框', '弹窗', '模态'],
    props: ['open', 'onClose', 'maxWidth', 'fullScreen', 'scroll'],
    import_path: '@mui/material/Dialog',
    usage_example: '<Dialog open={open} onClose={onClose}><DialogTitle>标题</DialogTitle></Dialog>',
    accessibility_features: ['焦点陷阱', 'ESC 关闭', 'ARIA dialog role'],
    responsive_support: true,
    composition_hints: ['DialogTitle', 'DialogContent', 'DialogActions'],
  },
  {
    name: 'Snackbar',
    library: UILibrary.MUI,
    category: ComponentCategory.FEEDBACK,
    description: '消息提示条',
    keywords: ['snackbar', 'toast', 'notification', 'message', '提示', '通知'],
    props: ['open', 'message', 'autoHideDuration', 'severity', 'onClose'],
    import_path: '@mui/material/Snackbar',
    usage_example: '<Snackbar open={open} message="操作成功" autoHideDuration={3000} />',
    accessibility_features: ['ARIA alert role', '自动关闭'],
    responsive_support: true,
    composition_hints: ['Alert'],
  },
  {
    name: 'Alert',
    library: UILibrary.MUI,
    category: ComponentCategory.FEEDBACK,
    description: '警告提示组件',
    keywords: ['alert', 'warning', 'error', 'info', 'success', '警告', '提示'],
    props: ['severity', 'variant', 'onClose', 'action', 'icon'],
    import_path: '@mui/material/Alert',
    usage_example: '<Alert severity="success">操作成功</Alert>',
    accessibility_features: ['ARIA alert role', '语义化图标'],
    responsive_support: true,
    composition_hints: ['AlertTitle'],
  },
  {
    name: 'Table',
    library: UILibrary.MUI,
    category: ComponentCategory.DATADISPLAY,
    description: '数据表格组件',
    keywords: ['table', 'data', 'grid', 'row', 'column', '表格', '数据'],
    props: ['rows', 'columns', 'page', 'pageSize', 'sorting', 'filtering'],
    import_path: '@mui/material/Table',
    usage_example:
      '<Table><TableHead><TableRow><TableCell>标题</TableCell></TableRow></TableHead></Table>',
    accessibility_features: ['ARIA table role', '排序标识'],
    responsive_support: false,
    composition_hints: ['TableHead', 'TableBody', 'TableRow', 'TableCell'],
  },
  {
    name: 'DataGrid',
    library: UILibrary.MUI,
    category: ComponentCategory.DATADISPLAY,
    description: '高级数据网格，支持排序、筛选、分页',
    keywords: ['datagrid', 'table', 'grid', 'data', 'sort', 'filter', 'paginate', '数据网格'],
    props: [
      'rows',
      'columns',
      'pageSize',
      'rowsPerPageOptions',
      'checkboxSelection',
      'disableSelectionOnClick',
    ],
    import_path: '@mui/x-data-grid/DataGrid',
    usage_example: '<DataGrid rows={rows} columns={columns} pageSize={10} />',
    accessibility_features: ['键盘导航', '屏幕阅读器支持', 'ARIA grid role'],
    responsive_support: true,
    composition_hints: ['GridToolbar', 'GridPagination'],
  },
  {
    name: 'Card',
    library: UILibrary.MUI,
    category: ComponentCategory.DATADISPLAY,
    description: '卡片容器，用于内容分组',
    keywords: ['card', 'container', 'content', '卡片', '内容'],
    props: ['variant', 'raised', 'sx'],
    import_path: '@mui/material/Card',
    usage_example: '<Card><CardContent>卡片内容</CardContent></Card>',
    responsive_support: true,
    composition_hints: ['CardHeader', 'CardContent', 'CardActions', 'CardMedia'],
  },
  {
    name: 'Tabs',
    library: UILibrary.MUI,
    category: ComponentCategory.NAVIGATION,
    description: '标签页导航组件',
    keywords: ['tabs', 'tab', 'navigation', 'switch', '标签页', '切换'],
    props: ['value', 'onChange', 'orientation', 'variant', 'scrollButtons'],
    import_path: '@mui/material/Tabs',
    usage_example: '<Tabs value={value} onChange={handleChange}><Tab label="首页" /></Tabs>',
    accessibility_features: ['ARIA tablist role', '键盘导航'],
    responsive_support: true,
    composition_hints: ['Tab', 'TabPanel'],
  },
  {
    name: 'Accordion',
    library: UILibrary.MUI,
    category: ComponentCategory.UTILITY,
    description: '可折叠面板',
    keywords: ['accordion', 'collapse', 'expand', 'fold', '折叠', '展开'],
    props: ['expanded', 'onChange', 'disabled', 'square'],
    import_path: '@mui/material/Accordion',
    usage_example:
      '<Accordion><AccordionSummary>标题</AccordionSummary><AccordionDetails>内容</AccordionDetails></Accordion>',
    accessibility_features: ['键盘展开', 'ARIA button role'],
    responsive_support: true,
    composition_hints: ['AccordionSummary', 'AccordionDetails'],
  },
];

const ANT_DESIGN_COMPONENTS: ComponentKnowledge[] = [
  {
    name: 'Layout',
    library: UILibrary.ANTDESIGN,
    category: ComponentCategory.LAYOUT,
    description: '布局容器，包含 Header/Sider/Content/Footer',
    keywords: ['layout', 'header', 'sider', 'content', '布局', '结构'],
    props: ['className', 'style', 'hasSider'],
    import_path: 'antd/Layout',
    usage_example:
      '<Layout><Layout.Header>头部</Layout.Header><Layout.Content>内容</Layout.Content></Layout>',
    responsive_support: true,
    composition_hints: ['Header', 'Sider', 'Content', 'Footer'],
  },
  {
    name: 'Form',
    library: UILibrary.ANTDESIGN,
    category: ComponentCategory.DATAENTRY,
    description: '高级表单组件，支持校验和布局',
    keywords: ['form', 'input', 'validation', 'submit', '表单', '校验'],
    props: ['form', 'layout', 'onFinish', 'onFinishFailed', 'initialValues'],
    import_path: 'antd/Form',
    usage_example:
      '<Form form={form} onFinish={onFinish}><Form.Item name="name" rules={[{ required: true }]}><Input /></Form.Item></Form>',
    accessibility_features: ['表单校验提示', '必填标记'],
    responsive_support: true,
    composition_hints: ['Form.Item', 'Input', 'Select', 'DatePicker'],
  },
  {
    name: 'Table',
    library: UILibrary.ANTDESIGN,
    category: ComponentCategory.DATADISPLAY,
    description: '功能丰富的数据表格',
    keywords: ['table', 'data', 'grid', 'row', 'column', '表格', '数据'],
    props: ['dataSource', 'columns', 'pagination', 'rowSelection', 'scroll', 'onChange'],
    import_path: 'antd/Table',
    usage_example: '<Table dataSource={data} columns={columns} pagination={{ pageSize: 10 }} />',
    accessibility_features: ['键盘导航', '排序标识'],
    responsive_support: true,
    composition_hints: ['Table.Column', 'Table.ColumnGroup'],
  },
  {
    name: 'Modal',
    library: UILibrary.ANTDESIGN,
    category: ComponentCategory.OVERLAY,
    description: '模态对话框',
    keywords: ['modal', 'dialog', 'popup', '对话框', '弹窗'],
    props: ['open', 'onCancel', 'onOk', 'title', 'width', 'footer', 'centered'],
    import_path: 'antd/Modal',
    usage_example: '<Modal open={open} onCancel={onClose} title="标题">内容</Modal>',
    accessibility_features: ['焦点管理', 'ESC 关闭'],
    responsive_support: true,
    composition_hints: ['Button'],
  },
  {
    name: 'Menu',
    library: UILibrary.ANTDESIGN,
    category: ComponentCategory.NAVIGATION,
    description: '导航菜单',
    keywords: ['menu', 'navigation', 'dropdown', '菜单', '导航'],
    props: ['mode', 'items', 'selectedKeys', 'onClick', 'theme'],
    import_path: 'antd/Menu',
    usage_example: '<Menu mode="horizontal" items={items} onClick={handleClick} />',
    accessibility_features: ['键盘导航', 'ARIA menu role'],
    responsive_support: true,
    composition_hints: ['Menu.Item', 'Menu.SubMenu'],
  },
  {
    name: 'message',
    library: UILibrary.ANTDESIGN,
    category: ComponentCategory.FEEDBACK,
    description: '全局消息提示',
    keywords: ['message', 'toast', 'notification', '提示', '消息'],
    props: ['content', 'duration', 'type', 'onClose'],
    import_path: 'antd/message',
    usage_example: "message.success('操作成功')",
    accessibility_features: ['ARIA alert role'],
    responsive_support: true,
    composition_hints: [],
  },
  {
    name: 'DatePicker',
    library: UILibrary.ANTDESIGN,
    category: ComponentCategory.INPUT,
    description: '日期选择器',
    keywords: ['date', 'picker', 'calendar', '日期', '选择器'],
    props: ['value', 'onChange', 'format', 'showTime', 'disabledDate', 'picker'],
    import_path: 'antd/DatePicker',
    usage_example: '<DatePicker value={value} onChange={handleChange} format="YYYY-MM-DD" />',
    accessibility_features: ['键盘导航', 'ARIA grid role'],
    responsive_support: true,
    composition_hints: ['RangePicker'],
  },
];

const CHAKRA_COMPONENTS: ComponentKnowledge[] = [
  {
    name: 'Box',
    library: UILibrary.CHAKRAUI,
    category: ComponentCategory.LAYOUT,
    description: '基础布局盒子',
    keywords: ['box', 'container', 'div', 'layout', '盒子', '布局'],
    props: ['as', 'bg', 'color', 'p', 'm', 'w', 'h', 'display', 'flexDirection'],
    import_path: '@chakra-ui/react',
    usage_example: '<Box p={4} bg="gray.100">内容</Box>',
    responsive_support: true,
    composition_hints: ['Stack', 'Flex'],
  },
  {
    name: 'Stack',
    library: UILibrary.CHAKRAUI,
    category: ComponentCategory.LAYOUT,
    description: '弹性堆叠布局',
    keywords: ['stack', 'flex', 'layout', '堆叠', '弹性'],
    props: ['direction', 'spacing', 'align', 'justify'],
    import_path: '@chakra-ui/react',
    usage_example: '<Stack direction="column" spacing={4}>内容</Stack>',
    responsive_support: true,
    composition_hints: ['Box', 'Text'],
  },
  {
    name: 'Input',
    library: UILibrary.CHAKRAUI,
    category: ComponentCategory.INPUT,
    description: '文本输入框',
    keywords: ['input', 'text', 'form', '输入', '表单'],
    props: ['value', 'onChange', 'placeholder', 'size', 'variant', 'isInvalid', 'isDisabled'],
    import_path: '@chakra-ui/react',
    usage_example: '<Input value={value} onChange={handleChange} placeholder="请输入" />',
    accessibility_features: ['ARIA label', '错误状态'],
    responsive_support: true,
    composition_hints: ['FormControl', 'FormLabel'],
  },
  {
    name: 'Button',
    library: UILibrary.CHAKRAUI,
    category: ComponentCategory.INPUT,
    description: '按钮组件',
    keywords: ['button', 'action', 'click', '按钮'],
    props: ['variant', 'colorScheme', 'size', 'onClick', 'isLoading', 'isDisabled', 'leftIcon'],
    import_path: '@chakra-ui/react',
    usage_example: '<Button colorScheme="blue" onClick={handleClick}>提交</Button>',
    accessibility_features: ['ARIA button role', '加载状态'],
    responsive_support: true,
    composition_hints: ['ButtonGroup'],
  },
  {
    name: 'Modal',
    library: UILibrary.CHAKRAUI,
    category: ComponentCategory.OVERLAY,
    description: '模态对话框',
    keywords: ['modal', 'dialog', 'popup', '对话框', '弹窗'],
    props: ['isOpen', 'onClose', 'size', 'isCentered', 'scrollBehavior'],
    import_path: '@chakra-ui/react',
    usage_example:
      '<Modal isOpen={isOpen} onClose={onClose}><ModalOverlay /><ModalContent>内容</ModalContent></Modal>',
    accessibility_features: ['焦点陷阱', 'ESC 关闭', 'ARIA dialog role'],
    responsive_support: true,
    composition_hints: ['ModalOverlay', 'ModalContent', 'ModalHeader', 'ModalBody', 'ModalFooter'],
  },
  {
    name: 'Table',
    library: UILibrary.CHAKRAUI,
    category: ComponentCategory.DATADISPLAY,
    description: '表格组件',
    keywords: ['table', 'data', '表格', '数据'],
    props: ['variant', 'colorScheme', 'size'],
    import_path: '@chakra-ui/react',
    usage_example:
      '<Table><Thead><Tr><Th>标题</Th></Tr></Thead><Tbody><Tr><Td>数据</Td></Tr></Tbody></Table>',
    accessibility_features: ['ARIA table role'],
    responsive_support: false,
    composition_hints: ['Thead', 'Tbody', 'Tr', 'Th', 'Td'],
  },
  {
    name: 'Toast',
    library: UILibrary.CHAKRAUI,
    category: ComponentCategory.FEEDBACK,
    description: '消息提示',
    keywords: ['toast', 'notification', 'message', '提示', '通知'],
    props: ['title', 'description', 'status', 'duration', 'position', 'isClosable'],
    import_path: '@chakra-ui/react',
    usage_example: "useToast({ title: '成功', status: 'success', duration: 3000 })",
    accessibility_features: ['ARIA alert role'],
    responsive_support: true,
    composition_hints: [],
  },
];

const ALL_COMPONENTS: ComponentKnowledge[] = [
  ...MUI_COMPONENTS,
  ...ANT_DESIGN_COMPONENTS,
  ...CHAKRA_COMPONENTS,
];

// ============ UI 组件推荐器 ============

export class UIRecommender {
  private componentLibrary: ComponentKnowledge[];

  constructor(components: ComponentKnowledge[] = ALL_COMPONENTS) {
    this.componentLibrary = components;
  }

  /**
   * 推荐组件
   */
  async recommendComponents(context: RecommendationContext): Promise<ComponentRecommendation[]> {
    const targetLibrary = context.target_library;
    const description = context.description.toLowerCase();

    // 筛选目标库
    const pool = targetLibrary
      ? this.componentLibrary.filter((c) => c.library === targetLibrary)
      : this.componentLibrary;

    // 计算相似度并排序
    const scored = pool
      .map((component) => ({
        component,
        score: this.calculateSimilarity(description, component),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    // 取前 N 个推荐
    const topN = scored.slice(0, 5);

    return topN.map(({ component, score }) => {
      const alternatives = this.findAlternatives(component, targetLibrary);

      return {
        component_name: component.name,
        library: component.library,
        reason: this.generateRecommendationReason(description, component),
        similarity_score: Math.round(score * 100) / 100,
        usage_example: component.usage_example,
        props_suggestion: this.suggestProps(component, context),
        alternatives,
        category: component.category,
        accessibility_notes: component.accessibility_features,
      };
    });
  }

  /**
   * 分析设计稿
   */
  async analyzeDesign(designInfo: Record<string, unknown>): Promise<DesignAnalysis> {
    const layoutType = this.inferLayoutType(designInfo);
    const colorScheme = this.extractColorScheme(designInfo);
    const componentsDetected = this.detectComponents(designInfo);
    const typography = this.extractTypography(designInfo);

    return {
      layout_type: layoutType,
      color_scheme: colorScheme,
      typography,
      spacing: this.extractSpacing(designInfo),
      components_detected: componentsDetected,
      responsive_strategy: this.inferResponsiveStrategy(designInfo),
      accessibility_issues: this.detectAccessibilityIssues(designInfo),
    };
  }

  /**
   * 建议替代组件
   */
  suggestAlternatives(componentName: string, currentLibrary?: UILibrary): AlternativeComponent[] {
    const component = this.componentLibrary.find((c) => c.name === componentName);
    if (!component) return [];

    return this.findAlternatives(component, currentLibrary);
  }

  /**
   * 生成组件代码
   */
  generateComponentCode(
    componentName: string,
    library: UILibrary,
    props: Record<string, unknown> = {}
  ): string {
    const component = this.componentLibrary.find(
      (c) => c.name === componentName && c.library === library
    );

    if (!component) {
      return `// 组件 ${componentName} (${library}) 未找到`;
    }

    const propsString = this.formatProps(props, component);
    const importStatement = this.generateImportStatement(component);

    const code = `${importStatement}\n\n`;
    const isSelfClosing =
      !component.usage_example.includes('>') || !component.usage_example.match(/>\s*\S/);

    if (component.name === 'message' || component.name === 'Toast') {
      return `${importStatement}\n\n// 使用示例\n${component.usage_example};`;
    }

    if (isSelfClosing) {
      return `${code}<${component.name}${propsString} />`;
    }

    return `${code}<${component.name}${propsString}>\n  {/* 内容 */}\n</${component.name}>`;
  }

  /**
   * 获取无障碍建议
   */
  getAccessibilitySuggestions(
    componentName: string,
    library?: UILibrary
  ): AccessibilitySuggestion[] {
    const component = this.componentLibrary.find(
      (c) => c.name === componentName && (!library || c.library === library)
    );

    const suggestions: AccessibilitySuggestion[] = [];

    if (!component) {
      return suggestions;
    }

    // 基于组件类型的通用无障碍建议
    const categorySuggestions = this.getCategoryAccessibilitySuggestions(component.category);

    for (const s of categorySuggestions) {
      suggestions.push({
        ...s,
        component: component.name,
      });
    }

    // 组件特定无障碍特性
    if (component.accessibility_features && component.accessibility_features.length > 0) {
      suggestions.push({
        issue: '组件已内置无障碍特性',
        severity: 'info',
        recommendation: `该组件已支持: ${component.accessibility_features.join(', ')}`,
        component: component.name,
      });
    }

    // 交互组件需要焦点管理
    if (
      component.category === ComponentCategory.OVERLAY ||
      component.category === ComponentCategory.NAVIGATION
    ) {
      suggestions.push({
        issue: '交互组件需要焦点管理',
        severity: 'warning',
        recommendation: '确保组件打开时焦点正确移入，关闭时焦点返回触发元素',
        component: component.name,
        wcag_criterion: '2.4.3 Focus Order',
      });
    }

    // 数据展示组件需要屏幕阅读器支持
    if (
      component.category === ComponentCategory.DATADISPLAY ||
      component.name === 'Table' ||
      component.name === 'DataGrid'
    ) {
      suggestions.push({
        issue: '数据表格需要屏幕阅读器支持',
        severity: 'warning',
        recommendation: '为表格添加 aria-label 或 aria-labelledby，确保列标题可被屏幕阅读器识别',
        component: component.name,
        wcag_criterion: '1.3.1 Info and Relationships',
      });
    }

    return suggestions;
  }

  /**
   * 组件组合推荐
   */
  recommendComposition(context: RecommendationContext): ComponentComposition[] {
    const compositions: ComponentComposition[] = [];
    const description = context.description.toLowerCase();

    // 表单组合
    if (
      description.includes('form') ||
      description.includes('表单') ||
      description.includes('输入')
    ) {
      const formComponent = this.componentLibrary.find(
        (c) => c.name === 'Form' || c.name === 'TextField' || c.name === 'Input'
      );
      if (formComponent) {
        const supporting = this.componentLibrary.filter(
          (c) =>
            ['Button', 'Select', 'DatePicker', 'Checkbox', 'RadioGroup'].includes(c.name) &&
            c.library === formComponent.library
        );
        compositions.push({
          primary_component: formComponent,
          supporting_components: supporting,
          reason: '表单场景需要输入控件和提交按钮组合',
          usage_example: this.generateFormCompositionCode(formComponent, supporting),
          data_flow: '用户输入 → 校验 → 提交 → 反馈',
        });
      }
    }

    // 导航组合
    if (
      description.includes('nav') ||
      description.includes('导航') ||
      description.includes('menu') ||
      description.includes('菜单')
    ) {
      const navComponent = this.componentLibrary.find(
        (c) => c.name === 'AppBar' || c.name === 'Menu' || c.name === 'Tabs'
      );
      if (navComponent) {
        const supporting = this.componentLibrary.filter(
          (c) =>
            ['Drawer', 'Tabs', 'IconButton'].includes(c.name) && c.library === navComponent.library
        );
        compositions.push({
          primary_component: navComponent,
          supporting_components: supporting,
          reason: '导航场景需要主导航和辅助导航组件',
          usage_example: this.generateNavCompositionCode(navComponent, supporting),
          data_flow: '导航选择 → 路由切换 → 页面更新',
        });
      }
    }

    // 数据展示组合
    if (
      description.includes('table') ||
      description.includes('表格') ||
      description.includes('list') ||
      description.includes('列表')
    ) {
      const dataComponent = this.componentLibrary.find(
        (c) => c.name === 'Table' || c.name === 'DataGrid'
      );
      if (dataComponent) {
        const supporting = this.componentLibrary.filter(
          (c) =>
            ['Pagination', 'Alert', 'Snackbar', 'Dialog'].includes(c.name) &&
            c.library === dataComponent.library
        );
        compositions.push({
          primary_component: dataComponent,
          supporting_components: supporting,
          reason: '数据展示场景需要表格和操作反馈组件',
          usage_example: this.generateDataCompositionCode(dataComponent, supporting),
          data_flow: '数据请求 → 渲染表格 → 用户操作 → 反馈提示',
        });
      }
    }

    return compositions;
  }

  /**
   * 注册自定义组件到知识库
   */
  registerComponent(component: ComponentKnowledge): void {
    const existingIdx = this.componentLibrary.findIndex(
      (c) => c.name === component.name && c.library === component.library
    );
    if (existingIdx >= 0) {
      this.componentLibrary[existingIdx] = component;
    } else {
      this.componentLibrary.push(component);
    }
  }

  /**
   * 获取知识库统计
   */
  getLibraryStats(): Record<UILibrary, number> {
    return this.componentLibrary.reduce(
      (acc, component) => {
        acc[component.library] = (acc[component.library] ?? 0) + 1;
        return acc;
      },
      {} as Record<UILibrary, number>
    );
  }

  // ============ 私有方法 ============

  private calculateSimilarity(description: string, component: ComponentKnowledge): number {
    let score = 0;
    const keywords = component.keywords;

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (description.includes(lowerKeyword)) {
        score += lowerKeyword.length > 2 ? 0.3 : 0.2;
      }
    }

    // 组件名匹配
    if (description.includes(component.name.toLowerCase())) {
      score += 0.4;
    }

    // 描述匹配
    const descWords = component.description.toLowerCase().split(/\s+/);
    for (const word of descWords) {
      if (word.length > 3 && description.includes(word)) {
        score += 0.1;
      }
    }

    return Math.min(1, score);
  }

  private findAlternatives(
    component: ComponentKnowledge,
    preferredLibrary?: UILibrary
  ): AlternativeComponent[] {
    return this.componentLibrary
      .filter(
        (c) =>
          c.category === component.category &&
          c.name !== component.name &&
          (!preferredLibrary || c.library === preferredLibrary)
      )
      .slice(0, 3)
      .map((alt) => ({
        component_name: alt.name,
        library: alt.library,
        reason: alt.description,
        trade_offs: this.generateTradeOffs(component, alt),
      }));
  }

  private generateTradeOffs(original: ComponentKnowledge, alternative: ComponentKnowledge): string {
    const tradeOffs: string[] = [];

    if (original.library !== alternative.library) {
      tradeOffs.push(
        `不同 UI 库: ${this.getLibraryName(original.library)} → ${this.getLibraryName(alternative.library)}`
      );
    }

    if (original.responsive_support && !alternative.responsive_support) {
      tradeOffs.push('不支持响应式');
    }

    if (
      original.accessibility_features &&
      original.accessibility_features.length > 0 &&
      (!alternative.accessibility_features || alternative.accessibility_features.length === 0)
    ) {
      tradeOffs.push('无障碍特性较少');
    }

    return tradeOffs.length > 0 ? tradeOffs.join('；') : '功能类似，可互换使用';
  }

  private generateRecommendationReason(description: string, component: ComponentKnowledge): string {
    const matchedKeywords = component.keywords.filter((k) => description.includes(k.toLowerCase()));

    if (matchedKeywords.length > 0) {
      return `匹配关键词: ${matchedKeywords.join(', ')}。${component.description}`;
    }

    return component.description;
  }

  private suggestProps(
    _component: ComponentKnowledge,
    context: RecommendationContext
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    // 基于描述建议属性
    const desc = context.description.toLowerCase();

    if (desc.includes('disabled') || desc.includes('禁用')) {
      props.disabled = true;
    }
    if (desc.includes('required') || desc.includes('必填')) {
      props.required = true;
    }
    if (desc.includes('loading') || desc.includes('加载')) {
      props.loading = true;
    }
    if (desc.includes('error') || desc.includes('错误')) {
      props.error = true;
    }
    if (desc.includes('responsive') || desc.includes('响应式')) {
      props.responsive = true;
    }
    if (desc.includes('full') || desc.includes('全宽')) {
      props.fullWidth = true;
    }

    // 从无障碍需求推断
    if (context.accessibility_requirements) {
      for (const req of context.accessibility_requirements) {
        const lowerReq = req.toLowerCase();
        if (lowerReq.includes('aria') || lowerReq.includes('label')) {
          props['aria-label'] = '描述性标签';
        }
        if (lowerReq.includes('role')) {
          props.role = 'region';
        }
      }
    }

    return props;
  }

  private formatProps(props: Record<string, unknown>, _component: ComponentKnowledge): string {
    if (Object.keys(props).length === 0) return '';

    const propStrings = Object.entries(props)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key}="${value}"`;
        }
        if (typeof value === 'boolean') {
          return value ? key : `${key}={false}`;
        }
        return `${key}={${JSON.stringify(value)}}`;
      })
      .join(' ');

    return ` ${propStrings}`;
  }

  private generateImportStatement(component: ComponentKnowledge): string {
    switch (component.library) {
      case UILibrary.MUI:
        return `import ${component.name} from '${component.import_path}';`;
      case UILibrary.ANTDESIGN:
        return `import { ${component.name} } from '${component.import_path.split('/')[0]}';`;
      case UILibrary.CHAKRAUI:
        return `import { ${component.name} } from '${component.import_path}';`;
      default:
        return `import { ${component.name} } from 'unknown';`;
    }
  }

  private inferLayoutType(designInfo: Record<string, unknown>): string {
    if (typeof designInfo.layout === 'string') return designInfo.layout;
    if (typeof designInfo.type === 'string') return designInfo.type;

    // 根据检测到的组件推断
    const components = designInfo.components as string[] | undefined;
    if (components) {
      if (components.includes('sidebar') || components.includes('Drawer')) return 'sidebar';
      if (components.includes('tabs')) return 'tabbed';
      if (components.includes('grid')) return 'grid';
    }

    return 'flex';
  }

  private extractColorScheme(designInfo: Record<string, unknown>): string[] {
    const colors = designInfo.colors;
    if (Array.isArray(colors)) return colors.map(String);
    if (typeof designInfo.primary_color === 'string') return [designInfo.primary_color];
    if (typeof designInfo.theme === 'object' && designInfo.theme !== null) {
      const theme = designInfo.theme as Record<string, unknown>;
      if (Array.isArray(theme.colors)) return theme.colors.map(String);
    }
    return ['#1976d2', '#ffffff', '#f5f5f5'];
  }

  private extractTypography(designInfo: Record<string, unknown>): {
    font_family?: string;
    sizes: string[];
    weights: number[];
  } {
    const typography = designInfo.typography as Record<string, unknown> | undefined;
    return {
      font_family: typeof typography?.fontFamily === 'string' ? typography.fontFamily : undefined,
      sizes:
        typography && Array.isArray(typography.sizes)
          ? typography.sizes.map(String)
          : ['14px', '16px', '20px', '24px'],
      weights:
        typography && Array.isArray(typography.weights)
          ? typography.weights.map(Number)
          : [400, 500, 600, 700],
    };
  }

  private extractSpacing(designInfo: Record<string, unknown>): string {
    if (typeof designInfo.spacing === 'string') return designInfo.spacing;
    if (typeof designInfo.spacing === 'number') return `${designInfo.spacing}px`;
    return '8px';
  }

  private detectComponents(designInfo: Record<string, unknown>): string[] {
    const components = designInfo.components;
    if (Array.isArray(components)) return components.map(String);

    const detected: string[] = [];
    const layout = this.inferLayoutType(designInfo);
    if (layout === 'sidebar') detected.push('Drawer', 'AppBar');
    if (layout === 'tabbed') detected.push('Tabs', 'TabPanel');
    if (layout === 'grid') detected.push('Grid', 'Card');

    return detected;
  }

  private inferResponsiveStrategy(designInfo: Record<string, unknown>): ResponsiveStrategy {
    if (typeof designInfo.responsive === 'string') {
      const strategy = designInfo.responsive.toLowerCase();
      if (strategy.includes('mobile')) return ResponsiveStrategy.MOBILEFIRST;
      if (strategy.includes('desktop')) return ResponsiveStrategy.DESKTOPFIRST;
      if (strategy.includes('fixed')) return ResponsiveStrategy.FIXEDWIDTH;
    }
    return ResponsiveStrategy.ADAPTIVE;
  }

  private detectAccessibilityIssues(designInfo: Record<string, unknown>): string[] {
    const issues: string[] = [];

    if (designInfo.contrast_ratio !== undefined) {
      const ratio = Number(designInfo.contrast_ratio);
      if (!isNaN(ratio) && ratio < 4.5) {
        issues.push('颜色对比度不足 WCAG AA 标准 (4.5:1)');
      }
    }

    if (designInfo.has_alt_text === false) {
      issues.push('图片缺少 alt 文本');
    }

    if (designInfo.has_keyboard_nav === false) {
      issues.push('缺少键盘导航支持');
    }

    if (designInfo.has_aria_labels === false) {
      issues.push('缺少 ARIA 标签');
    }

    return issues;
  }

  private getCategoryAccessibilitySuggestions(
    category: ComponentCategory
  ): AccessibilitySuggestion[] {
    const suggestions: AccessibilitySuggestion[] = [];

    switch (category) {
      case ComponentCategory.INPUT:
        suggestions.push(
          {
            issue: '输入框缺少关联标签',
            severity: 'critical',
            recommendation: '使用 label 或 aria-label 为输入框提供描述',
            wcag_criterion: '1.3.1 Info and Relationships',
          },
          {
            issue: '错误提示不够明确',
            severity: 'warning',
            recommendation: '使用 aria-describedby 关联错误提示，aria-invalid 标记错误状态',
            wcag_criterion: '3.3.1 Error Identification',
          }
        );
        break;

      case ComponentCategory.NAVIGATION:
        suggestions.push(
          {
            issue: '导航缺少 landmark role',
            severity: 'warning',
            recommendation: '使用 nav 标签或 role="navigation" 标识导航区域',
            wcag_criterion: '1.3.1 Info and Relationships',
          },
          {
            issue: '当前页面缺少标识',
            severity: 'info',
            recommendation: '使用 aria-current="page" 标识当前所在页面',
            wcag_criterion: '2.4.8 Location',
          }
        );
        break;

      case ComponentCategory.FEEDBACK:
        suggestions.push({
          issue: '反馈消息可能被屏幕阅读器忽略',
          severity: 'warning',
          recommendation: '使用 role="alert" 或 aria-live="polite" 确保消息被播报',
          wcag_criterion: '4.1.3 Status Messages',
        });
        break;

      case ComponentCategory.OVERLAY:
        suggestions.push(
          {
            issue: '模态框缺少焦点陷阱',
            severity: 'critical',
            recommendation: '确保 Tab 键在模态框内循环，焦点不离开对话框',
            wcag_criterion: '2.4.3 Focus Order',
          },
          {
            issue: '模态框关闭后焦点未恢复',
            severity: 'warning',
            recommendation: '关闭模态框后将焦点返回到触发元素',
            wcag_criterion: '2.4.3 Focus Order',
          }
        );
        break;

      case ComponentCategory.DATADISPLAY:
        suggestions.push({
          issue: '数据表格缺少表头关联',
          severity: 'warning',
          recommendation: '使用 scope 或 headers 属性关联表头和数据单元格',
          wcag_criterion: '1.3.1 Info and Relationships',
        });
        break;

      default:
        break;
    }

    return suggestions;
  }

  private generateFormCompositionCode(
    primary: ComponentKnowledge,
    supporting: ComponentKnowledge[]
  ): string {
    const hasSelect = supporting.some((s) => s.name === 'Select');

    const lines: string[] = [];
    lines.push(`// 表单组合示例`);

    if (primary.library === UILibrary.ANTDESIGN) {
      lines.push(`import { Form, Input, Button${hasSelect ? ', Select' : ''} } from 'antd';`);
      lines.push('');
      lines.push('<Form form={form} layout="vertical" onFinish={onFinish}>');
      lines.push('  <Form.Item name="name" label="名称" rules={[{ required: true }]}>');
      lines.push('    <Input placeholder="请输入名称" />');
      lines.push('  </Form.Item>');
      if (hasSelect) {
        lines.push('  <Form.Item name="type" label="类型">');
        lines.push('    <Select options={options} />');
        lines.push('  </Form.Item>');
      }
      lines.push('  <Form.Item>');
      lines.push('    <Button type="primary" htmlType="submit">提交</Button>');
      lines.push('  </Form.Item>');
      lines.push('</Form>');
    } else {
      lines.push(`import { ${primary.name} } from '${primary.import_path}';`);
      lines.push('');
      lines.push(`<${primary.name}>`);
      lines.push('  {/* 表单字段 */}');
      lines.push(`</${primary.name}>`);
    }

    return lines.join('\n');
  }

  private generateNavCompositionCode(
    primary: ComponentKnowledge,
    _supporting: ComponentKnowledge[]
  ): string {
    const lines: string[] = [];
    lines.push('// 导航组合示例');

    if (primary.library === UILibrary.MUI) {
      lines.push("import AppBar from '@mui/material/AppBar';");
      lines.push("import Toolbar from '@mui/material/Toolbar';");
      lines.push("import Tabs from '@mui/material/Tabs';");
      lines.push("import Tab from '@mui/material/Tab';");
      lines.push('');
      lines.push('<AppBar position="static">');
      lines.push('  <Toolbar>');
      lines.push('    <Typography variant="h6">应用名称</Typography>');
      lines.push('    <Tabs value={value} onChange={handleChange}>');
      lines.push('      <Tab label="首页" />');
      lines.push('      <Tab label="设置" />');
      lines.push('    </Tabs>');
      lines.push('  </Toolbar>');
      lines.push('</AppBar>');
    } else {
      lines.push(`import { ${primary.name} } from '${primary.import_path}';`);
      lines.push('');
      lines.push(`<${primary.name} />`);
    }

    return lines.join('\n');
  }

  private generateDataCompositionCode(
    primary: ComponentKnowledge,
    _supporting: ComponentKnowledge[]
  ): string {
    const lines: string[] = [];
    lines.push('// 数据展示组合示例');

    if (primary.library === UILibrary.MUI) {
      lines.push("import { DataGrid } from '@mui/x-data-grid';");
      lines.push("import Snackbar from '@mui/material/Snackbar';");
      lines.push("import Alert from '@mui/material/Alert';");
      lines.push('');
      lines.push('<DataGrid rows={rows} columns={columns} pageSize={10} />');
      lines.push('<Snackbar open={open} autoHideDuration={3000}>');
      lines.push('  <Alert severity="success">操作成功</Alert>');
      lines.push('</Snackbar>');
    } else {
      lines.push(`import { ${primary.name} } from '${primary.import_path}';`);
      lines.push('');
      lines.push(`<${primary.name} />`);
    }

    return lines.join('\n');
  }

  private getLibraryName(library: UILibrary): string {
    const names: Record<UILibrary, string> = {
      [UILibrary.MUI]: 'MUI',
      [UILibrary.ANTDESIGN]: 'Ant Design',
      [UILibrary.CHAKRAUI]: 'Chakra UI',
    };
    return names[library] ?? 'Unknown';
  }
}

// ============ 单例实例 ============

export const uiRecommender = new UIRecommender();

export default uiRecommender;
