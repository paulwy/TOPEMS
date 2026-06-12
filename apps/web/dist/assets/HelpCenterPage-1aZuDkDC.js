import{r as l,j as e}from"./vendor-react-DsMzHEA8.js";import{a0 as M,af as P}from"./page-hrm-NT7dcBUU.js";import{u as T}from"./vendor-router-BYDrsrNN.js";import{aP as R,x as g,aO as j,bE as c,aM as L,F as q,q as O,a as b,E as D,bF as N,a8 as F,p as Q,$}from"./vendor-icons-DpNyUdHB.js";import"./api-hrm-BD7qme3B.js";import"./api-client-CTJ_iBjy.js";import"./vendor-axios-BjtuyMK1.js";import"./api-ai-DU_BWz_y.js";import"./vendor-shared-Bp1A8Wxg.js";import"./vendor-form-BurqohCx.js";import"./vendor-validation-CQYhBSsS.js";import"./vendor-utils-rugSeaVE.js";import"./vendor-babel-DhkZe1bb.js";import"./vendor-radix-O5oF6plG.js";const ae=()=>{var u;T();const{success:f,notifications:v,hideNotification:y}=M(),[i,w]=l.useState(""),[r,n]=l.useState("articles"),[d,C]=l.useState(null),[a,x]=l.useState(null),[S,o]=l.useState(!1),[I,H]=l.useState(!1),[k]=l.useState([{id:"1",name:"快速入门",icon:"🚀",description:"新用户必读，快速上手 TOPEMS 系统",article_count:8},{id:"2",name:"系统管理",icon:"⚙️",description:"用户、角色、权限等系统配置",article_count:12},{id:"3",name:"ERP 模块",icon:"📦",description:"企业资源计划相关功能",article_count:15},{id:"4",name:"HRM 模块",icon:"👥",description:"人力资源管理相关功能",article_count:10},{id:"5",name:"CRM 模块",icon:"🤝",description:"客户关系管理相关功能",article_count:8},{id:"6",name:"报表管理",icon:"📊",description:"报表设计和生成",article_count:6}]),[m]=l.useState([{id:"1",title:"如何创建第一个项目",category:"快速入门",module:"RS",content:`
# 如何创建第一个项目

本教程将指导您如何在 TOPEMS 系统中创建您的第一个项目。

## 步骤 1：进入项目模块

1. 登录系统后，在左侧菜单中找到"研发管理"模块
2. 点击"项目管理"进入项目列表页面

## 步骤 2：创建新项目

1. 点击页面右上角的"新建项目"按钮
2. 填写项目基本信息：
   - 项目名称（必填）
   - 项目编码（必填，唯一）
   - 项目描述（可选）
   - 开始/结束日期
3. 配置项目成员和权限
4. 点击"保存"完成创建

## 步骤 3：添加项目任务

项目创建成功后，您可以：

1. 在项目详情页点击"添加任务"
2. 填写任务信息（名称、负责人、截止日期等）
3. 设置任务优先级和状态

## 常见问题

**Q: 项目编码有什么要求？**
A: 项目编码必须唯一，建议使用有意义的缩写，如 "PRJ-2024-001"

**Q: 如何设置项目成员权限？**
A: 在项目详情页的"成员管理"中，可以为每个成员设置不同的角色权限。
      `,views:1250,likes:89,created_at:"2024-01-15",updated_at:"2024-03-20",tags:["项目","入门","教程"]},{id:"2",title:"系统权限配置指南",category:"系统管理",module:"IAM",content:`
# 系统权限配置指南

本文档详细介绍如何在 TOPEMS 系统中配置用户权限。

## 权限结构

系统采用 RBAC（基于角色的访问控制）模型：

- **用户**：系统的实际使用者
- **角色**：权限的集合
- **权限**：对特定资源的访问控制

## 配置步骤

### 1. 创建角色

1. 进入"系统管理" > "角色管理"
2. 点击"新建角色"
3. 填写角色名称、编码和描述
4. 保存角色

### 2. 分配权限

1. 在角色详情页点击"权限配置"
2. 选择需要的权限模块
3. 勾选具体的权限项
4. 保存配置

### 3. 分配角色给用户

1. 进入"用户管理"
2. 选择目标用户
3. 在"角色配置"中添加相应角色
4. 保存配置

## 最佳实践

- 遵循最小权限原则
- 定期审查权限配置
- 使用角色组管理大量用户
      `,views:890,likes:67,created_at:"2024-01-20",updated_at:"2024-04-10",tags:["权限","系统管理","安全"]},{id:"3",title:"报表设计器使用教程",category:"报表管理",module:"Report",content:`
# 报表设计器使用教程

本教程介绍如何使用 TOPEMS 的报表设计器创建自定义报表。

## 功能特点

- 拖拽式报表设计
- 支持多种数据源
- 丰富的图表类型
- 灵活的导出格式

## 创建报表步骤

### 1. 选择报表模板

系统提供多种预设模板，您也可以从头开始设计。

### 2. 配置数据源

1. 选择数据源类型（系统数据、自定义查询）
2. 配置连接参数
3. 测试连接

### 3. 设计报表布局

使用拖拽工具添加：

- 表格
- 图表
- 文本
- 图片

### 4. 设置筛选条件

添加动态筛选器，让用户可以自定义查询条件。

### 5. 预览和导出

完成设计后，预览报表效果，支持导出为 Excel、PDF 等格式。
      `,views:567,likes:45,created_at:"2024-02-05",updated_at:"2024-04-15",tags:["报表","设计器","教程"]}]),[E]=l.useState([{id:"1",title:"TOPEMS 系统概览",description:"了解 TOPEMS 系统的整体架构和功能模块",thumbnail:"https://via.placeholder.com/320x180",duration:"10:25",module:"系统",url:"#"},{id:"2",title:"项目管理实战",description:"学习如何在系统中管理项目全生命周期",thumbnail:"https://via.placeholder.com/320x180",duration:"25:30",module:"RS",url:"#"},{id:"3",title:"权限配置详解",description:"深入了解系统的权限管理机制",thumbnail:"https://via.placeholder.com/320x180",duration:"15:45",module:"IAM",url:"#"}]),h=m.filter(s=>{var t;return s.title.toLowerCase().includes(i.toLowerCase())||s.content.toLowerCase().includes(i.toLowerCase())||((t=s.tags)==null?void 0:t.some(A=>A.toLowerCase().includes(i.toLowerCase())))}),p=s=>{x(s),o(!0)},_=s=>{f("感谢您的反馈！")};return e.jsxs("div",{className:"min-h-screen bg-gray-50",children:[e.jsx(P,{notifications:v,onClose:y}),e.jsx("div",{className:"bg-gradient-to-r from-blue-600 to-purple-600 text-white",children:e.jsx("div",{className:"max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16",children:e.jsxs("div",{className:"text-center",children:[e.jsx(R,{className:"w-16 h-16 mx-auto mb-4 opacity-90"}),e.jsx("h1",{className:"text-4xl font-bold mb-4",children:"帮助中心"}),e.jsx("p",{className:"text-xl text-blue-100 mb-8",children:"找到您需要的答案，了解如何使用 TOPEMS 系统"}),e.jsx("div",{className:"max-w-2xl mx-auto",children:e.jsxs("div",{className:"relative",children:[e.jsx(g,{className:"absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"}),e.jsx("input",{type:"text",value:i,onChange:s=>w(s.target.value),placeholder:"搜索帮助文章、视频教程...",className:"w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-300 shadow-lg"})]})})]})})}),e.jsx("div",{className:"max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8",children:e.jsxs("div",{className:"grid grid-cols-3 gap-4 mb-8",children:[e.jsxs("button",{className:"bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow flex items-center space-x-3",children:[e.jsx("div",{className:"w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center",children:e.jsx(j,{className:"w-6 h-6 text-blue-600"})}),e.jsxs("div",{className:"text-left",children:[e.jsx("div",{className:"font-semibold text-gray-900",children:"使用文档"}),e.jsx("div",{className:"text-sm text-gray-500",children:"详细的功能说明"})]})]}),e.jsxs("button",{className:"bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow flex items-center space-x-3",children:[e.jsx("div",{className:"w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center",children:e.jsx(c,{className:"w-6 h-6 text-green-600"})}),e.jsxs("div",{className:"text-left",children:[e.jsx("div",{className:"font-semibold text-gray-900",children:"视频教程"}),e.jsx("div",{className:"text-sm text-gray-500",children:"直观的学习方式"})]})]}),e.jsxs("button",{className:"bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow flex items-center space-x-3",children:[e.jsx("div",{className:"w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center",children:e.jsx(L,{className:"w-6 h-6 text-purple-600"})}),e.jsxs("div",{className:"text-left",children:[e.jsx("div",{className:"font-semibold text-gray-900",children:"在线客服"}),e.jsx("div",{className:"text-sm text-gray-500",children:"7x24 小时支持"})]})]})]})}),e.jsxs("div",{className:"max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8",children:[e.jsxs("div",{className:"flex space-x-4 mb-8 border-b border-gray-200",children:[e.jsxs("button",{onClick:()=>n("articles"),className:`pb-4 px-2 font-medium transition-colors ${r==="articles"?"text-blue-600 border-b-2 border-blue-600":"text-gray-500 hover:text-gray-700"}`,children:[e.jsx(j,{className:"w-5 h-5 inline mr-2"}),"帮助文章"]}),e.jsxs("button",{onClick:()=>n("videos"),className:`pb-4 px-2 font-medium transition-colors ${r==="videos"?"text-blue-600 border-b-2 border-blue-600":"text-gray-500 hover:text-gray-700"}`,children:[e.jsx(c,{className:"w-5 h-5 inline mr-2"}),"视频教程"]}),e.jsxs("button",{onClick:()=>n("faq"),className:`pb-4 px-2 font-medium transition-colors ${r==="faq"?"text-blue-600 border-b-2 border-blue-600":"text-gray-500 hover:text-gray-700"}`,children:[e.jsx(q,{className:"w-5 h-5 inline mr-2"}),"常见问题"]})]}),r==="articles"&&e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsxs("div",{className:"lg:col-span-1",children:[e.jsx("h3",{className:"text-lg font-semibold text-gray-900 mb-4",children:"分类浏览"}),e.jsx("div",{className:"space-y-2",children:k.map(s=>e.jsxs("div",{children:[e.jsxs("button",{onClick:()=>C(d===s.id?null:s.id),className:"w-full flex items-center justify-between p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors",children:[e.jsxs("div",{className:"flex items-center space-x-3",children:[e.jsx("span",{className:"text-2xl",children:s.icon}),e.jsxs("div",{className:"text-left",children:[e.jsx("div",{className:"font-medium text-gray-900",children:s.name}),e.jsxs("div",{className:"text-sm text-gray-500",children:[s.article_count," 篇文章"]})]})]}),d===s.id?e.jsx(O,{className:"w-5 h-5 text-gray-400"}):e.jsx(b,{className:"w-5 h-5 text-gray-400"})]}),d===s.id&&e.jsx("div",{className:"ml-6 mt-2 space-y-2",children:m.filter(t=>t.category===s.name).map(t=>e.jsx("button",{onClick:()=>p(t),className:"w-full text-left p-3 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors",children:t.title},t.id))})]},s.id))})]}),e.jsxs("div",{className:"lg:col-span-2",children:[e.jsx("h3",{className:"text-lg font-semibold text-gray-900 mb-4",children:i?`搜索结果: "${i}"`:"热门文章"}),e.jsxs("div",{className:"space-y-4",children:[h.map(s=>e.jsx("div",{onClick:()=>p(s),className:"bg-white rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer",children:e.jsxs("div",{className:"flex items-start justify-between",children:[e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center space-x-2 mb-2",children:[e.jsx("span",{className:"px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full",children:s.category}),e.jsx("span",{className:"px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full",children:s.module})]}),e.jsx("h4",{className:"text-lg font-semibold text-gray-900 mb-2",children:s.title}),e.jsxs("div",{className:"flex items-center space-x-4 text-sm text-gray-500",children:[e.jsxs("span",{className:"flex items-center",children:[e.jsx(D,{className:"w-4 h-4 mr-1"}),s.views," 次浏览"]}),e.jsxs("span",{className:"flex items-center",children:[e.jsx(N,{className:"w-4 h-4 mr-1"}),s.likes," 次点赞"]}),e.jsxs("span",{className:"flex items-center",children:[e.jsx(F,{className:"w-4 h-4 mr-1"}),s.updated_at]})]})]}),e.jsx(b,{className:"w-5 h-5 text-gray-400"})]})},s.id)),h.length===0&&e.jsxs("div",{className:"text-center py-12",children:[e.jsx(g,{className:"w-12 h-12 text-gray-400 mx-auto mb-4"}),e.jsx("p",{className:"text-gray-500",children:"未找到相关文章"})]})]})]})]}),r==="videos"&&e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",children:E.map(s=>e.jsxs("div",{className:"bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow",children:[e.jsxs("div",{className:"relative",children:[e.jsx("div",{className:"bg-gray-200 aspect-video flex items-center justify-center",children:e.jsx(c,{className:"w-12 h-12 text-gray-400"})}),e.jsx("div",{className:"absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm",children:s.duration})]}),e.jsxs("div",{className:"p-4",children:[e.jsx("div",{className:"flex items-center space-x-2 mb-2",children:e.jsx("span",{className:"px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full",children:s.module})}),e.jsx("h4",{className:"font-semibold text-gray-900 mb-2",children:s.title}),e.jsx("p",{className:"text-sm text-gray-500 mb-4",children:s.description}),e.jsxs("button",{className:"w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors",children:[e.jsx(c,{className:"w-4 h-4"}),e.jsx("span",{children:"观看视频"})]})]})]},s.id))}),r==="faq"&&e.jsx("div",{className:"max-w-3xl mx-auto",children:e.jsx("div",{className:"space-y-4",children:[{q:"如何重置密码？",a:'在登录页面点击"忘记密码"，输入注册邮箱，系统会发送重置链接到您的邮箱。'},{q:"如何申请新功能？",a:'您可以通过"反馈建议"功能提交功能需求，我们会定期评估并纳入后续版本规划。'},{q:"数据导出有限制吗？",a:"付费版本支持批量导出，无数据量限制。免费版本每次最多导出 1000 条记录。"},{q:"系统支持哪些浏览器？",a:"推荐使用 Chrome、Firefox、Edge、Safari 的最新版本。IE 浏览器不再支持。"}].map((s,t)=>e.jsxs("div",{className:"bg-white rounded-lg p-6 hover:shadow-md transition-shadow",children:[e.jsxs("h4",{className:"font-semibold text-gray-900 mb-2 flex items-center",children:[e.jsx("span",{className:"w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm mr-3",children:"Q"}),s.q]}),e.jsx("p",{className:"text-gray-600 ml-9",children:s.a})]},t))})})]}),S&&a&&e.jsx("div",{className:"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",children:e.jsxs("div",{className:"bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col",children:[e.jsxs("div",{className:"p-6 border-b border-gray-200 flex justify-between items-center",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-2xl font-bold text-gray-900",children:a.title}),e.jsxs("div",{className:"flex items-center space-x-4 mt-2 text-sm text-gray-500",children:[e.jsx("span",{children:a.category}),e.jsx("span",{children:"·"}),e.jsx("span",{children:a.updated_at}),e.jsx("span",{children:"·"}),e.jsxs("span",{children:[a.views," 次浏览"]})]})]}),e.jsx("button",{onClick:()=>{o(!1),x(null)},className:"p-2 hover:bg-gray-100 rounded-lg",children:e.jsx(Q,{className:"w-6 h-6"})})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto p-6",children:[e.jsx("div",{className:"prose max-w-none",children:e.jsx("pre",{className:"whitespace-pre-wrap text-sm text-gray-700",children:a.content})}),e.jsx("div",{className:"mt-8 pt-6 border-t border-gray-200",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("div",{className:"flex items-center space-x-2",children:(u=a.tags)==null?void 0:u.map((s,t)=>e.jsxs("span",{className:"px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full",children:["#",s]},t))}),e.jsxs("button",{onClick:()=>_(a.id),className:"flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors",children:[e.jsx(N,{className:"w-4 h-4"}),e.jsxs("span",{children:["有帮助 (",a.likes,")"]})]})]})})]}),e.jsxs("div",{className:"p-6 border-t border-gray-200 flex justify-between",children:[e.jsxs("button",{className:"flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors",children:[e.jsx($,{className:"w-4 h-4"}),e.jsx("span",{children:"下载 PDF"})]}),e.jsx("div",{className:"flex space-x-3",children:e.jsx("button",{onClick:()=>{o(!1),x(null)},className:"px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200",children:"关闭"})})]})]})})]})};export{ae as default};
