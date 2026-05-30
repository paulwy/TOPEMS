import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, Search, Book, MessageCircle, FileText, 
  Video, ChevronRight, ChevronDown, ChevronLeft,
  ExternalLink, Download, Star, Clock, Eye, ThumbsUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  module: string;
  content: string;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

interface HelpCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  article_count: number;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  module: string;
  url: string;
}

const HelpCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'articles' | 'videos' | 'faq'>('articles');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [showArticleDetail, setShowArticleDetail] = useState(false);
  const [loading, setLoading] = useState(false);

  const [categories] = useState<HelpCategory[]>([
    {
      id: '1',
      name: '快速入门',
      icon: '🚀',
      description: '新用户必读，快速上手 TOPEMS 系统',
      article_count: 8
    },
    {
      id: '2',
      name: '系统管理',
      icon: '⚙️',
      description: '用户、角色、权限等系统配置',
      article_count: 12
    },
    {
      id: '3',
      name: 'ERP 模块',
      icon: '📦',
      description: '企业资源计划相关功能',
      article_count: 15
    },
    {
      id: '4',
      name: 'HRM 模块',
      icon: '👥',
      description: '人力资源管理相关功能',
      article_count: 10
    },
    {
      id: '5',
      name: 'CRM 模块',
      icon: '🤝',
      description: '客户关系管理相关功能',
      article_count: 8
    },
    {
      id: '6',
      name: '报表管理',
      icon: '📊',
      description: '报表设计和生成',
      article_count: 6
    },
  ]);

  const [articles] = useState<HelpArticle[]>([
    {
      id: '1',
      title: '如何创建第一个项目',
      category: '快速入门',
      module: 'RS',
      content: `
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
      `,
      views: 1250,
      likes: 89,
      created_at: '2024-01-15',
      updated_at: '2024-03-20',
      tags: ['项目', '入门', '教程']
    },
    {
      id: '2',
      title: '系统权限配置指南',
      category: '系统管理',
      module: 'IAM',
      content: `
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
      `,
      views: 890,
      likes: 67,
      created_at: '2024-01-20',
      updated_at: '2024-04-10',
      tags: ['权限', '系统管理', '安全']
    },
    {
      id: '3',
      title: '报表设计器使用教程',
      category: '报表管理',
      module: 'Report',
      content: `
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
      `,
      views: 567,
      likes: 45,
      created_at: '2024-02-05',
      updated_at: '2024-04-15',
      tags: ['报表', '设计器', '教程']
    },
  ]);

  const [videos] = useState<VideoTutorial[]>([
    {
      id: '1',
      title: 'TOPEMS 系统概览',
      description: '了解 TOPEMS 系统的整体架构和功能模块',
      thumbnail: 'https://via.placeholder.com/320x180',
      duration: '10:25',
      module: '系统',
      url: '#'
    },
    {
      id: '2',
      title: '项目管理实战',
      description: '学习如何在系统中管理项目全生命周期',
      thumbnail: 'https://via.placeholder.com/320x180',
      duration: '25:30',
      module: 'RS',
      url: '#'
    },
    {
      id: '3',
      title: '权限配置详解',
      description: '深入了解系统的权限管理机制',
      thumbnail: 'https://via.placeholder.com/320x180',
      duration: '15:45',
      module: 'IAM',
      url: '#'
    },
  ]);

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleArticleClick = (article: HelpArticle) => {
    setSelectedArticle(article);
    setShowArticleDetail(true);
  };

  const handleLikeArticle = (articleId: string) => {
    success('感谢您的反馈！');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationContainer notifications={notifications} onClose={hideNotification} />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-4">帮助中心</h1>
            <p className="text-xl text-blue-100 mb-8">
              找到您需要的答案，了解如何使用 TOPEMS 系统
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索帮助文章、视频教程..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-300 shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Book className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900">使用文档</div>
              <div className="text-sm text-gray-500">详细的功能说明</div>
            </div>
          </button>
          
          <button className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Video className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900">视频教程</div>
              <div className="text-sm text-gray-500">直观的学习方式</div>
            </div>
          </button>
          
          <button className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900">在线客服</div>
              <div className="text-sm text-gray-500">7x24 小时支持</div>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('articles')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'articles' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Book className="w-5 h-5 inline mr-2" />
            帮助文章
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'videos' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Video className="w-5 h-5 inline mr-2" />
            视频教程
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'faq' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            常见问题
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'articles' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Categories */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">分类浏览</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id}>
                    <button
                      onClick={() => setExpandedCategory(
                        expandedCategory === category.id ? null : category.id
                      )}
                      className="w-full flex items-center justify-between p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">{category.name}</div>
                          <div className="text-sm text-gray-500">{category.article_count} 篇文章</div>
                        </div>
                      </div>
                      {expandedCategory === category.id ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    {expandedCategory === category.id && (
                      <div className="ml-6 mt-2 space-y-2">
                        {articles
                          .filter(a => a.category === category.name)
                          .map(article => (
                            <button
                              key={article.id}
                              onClick={() => handleArticleClick(article)}
                              className="w-full text-left p-3 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              {article.title}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Articles List */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {searchQuery ? `搜索结果: "${searchQuery}"` : '热门文章'}
              </h3>
              <div className="space-y-4">
                {filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => handleArticleClick(article)}
                    className="bg-white rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {article.category}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {article.module}
                          </span>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {article.title}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Eye className="w-4 h-4 mr-1" />
                            {article.views} 次浏览
                          </span>
                          <span className="flex items-center">
                            <ThumbsUp className="w-4 h-4 mr-1" />
                            {article.likes} 次点赞
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {article.updated_at}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
                
                {filteredArticles.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">未找到相关文章</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div key={video.id} className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <div className="bg-gray-200 aspect-video flex items-center justify-center">
                    <Video className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                    {video.duration}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      {video.module}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{video.title}</h4>
                  <p className="text-sm text-gray-500 mb-4">{video.description}</p>
                  <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Video className="w-4 h-4" />
                    <span>观看视频</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {[
                {
                  q: '如何重置密码？',
                  a: '在登录页面点击"忘记密码"，输入注册邮箱，系统会发送重置链接到您的邮箱。'
                },
                {
                  q: '如何申请新功能？',
                  a: '您可以通过"反馈建议"功能提交功能需求，我们会定期评估并纳入后续版本规划。'
                },
                {
                  q: '数据导出有限制吗？',
                  a: '付费版本支持批量导出，无数据量限制。免费版本每次最多导出 1000 条记录。'
                },
                {
                  q: '系统支持哪些浏览器？',
                  a: '推荐使用 Chrome、Firefox、Edge、Safari 的最新版本。IE 浏览器不再支持。'
                },
              ].map((faq, idx) => (
                <div key={idx} className="bg-white rounded-lg p-6 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm mr-3">
                      Q
                    </span>
                    {faq.q}
                  </h4>
                  <p className="text-gray-600 ml-9">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Article Detail Modal */}
      {showArticleDetail && selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedArticle.title}</h2>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>{selectedArticle.category}</span>
                  <span>·</span>
                  <span>{selectedArticle.updated_at}</span>
                  <span>·</span>
                  <span>{selectedArticle.views} 次浏览</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowArticleDetail(false);
                  setSelectedArticle(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {selectedArticle.content}
                </pre>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {selectedArticle.tags?.map((tag, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleLikeArticle(selectedArticle.id)}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>有帮助 ({selectedArticle.likes})</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                <span>下载 PDF</span>
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowArticleDetail(false);
                    setSelectedArticle(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpCenterPage;
