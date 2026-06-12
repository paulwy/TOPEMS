import React from "react";
import {
  Activity,
  Shield,
  Database,
  FolderKanban,
  Bell,
  Link,
  Building,
  GitBranch,
  Users,
  Factory,
  ClipboardList,
  AlertTriangle,
  Truck,
  ShoppingCart,
  Warehouse,
  Map,
  MessageCircle,
  BarChart2,
  BarChart3,
  Mail,
  Smartphone,
  FlaskConical,
  FileText,
} from "lucide-react";
import { ServiceStatusCard } from "./ServiceStatusCard";

interface ServiceStatusMonitorProps {
  serviceStatuses: Record<string, boolean>;
  onRefresh: () => void;
}

export const ServiceStatusMonitor: React.FC<ServiceStatusMonitorProps> = ({
  serviceStatuses,
  onRefresh,
}) => {
  const Brain = Activity;

  const serviceGroups = [
    {
      title: "核心服务",
      services: [
        {
          name: "身份认证",
          service: "IAM",
          port: 8000,
          key: "iam",
          icon: Shield,
        },
        {
          name: "文档管理",
          service: "DOC",
          port: 8001,
          key: "doc",
          icon: Database,
        },
        {
          name: "项目管理",
          service: "PM",
          port: 8002,
          key: "pm",
          icon: FolderKanban,
        },
        {
          name: "通知服务",
          service: "NOTIFICATION",
          port: 8003,
          key: "notification",
          icon: Bell,
        },
        {
          name: "系统集成",
          service: "INTEGRATION",
          port: 8004,
          key: "integration",
          icon: Link,
        },
        {
          name: "统一门户",
          service: "PORTAL",
          port: 8005,
          key: "portal",
          icon: Building,
        },
        {
          name: "流程引擎",
          service: "FLOW",
          port: 8006,
          key: "flow",
          icon: GitBranch,
        },
      ],
    },
    {
      title: "业务运营",
      services: [
        {
          name: "企业资源",
          service: "ERP",
          port: 8010,
          key: "erp",
          icon: Building,
        },
        {
          name: "人力资源",
          service: "HRM",
          port: 8011,
          key: "hrm",
          icon: Users,
        },
        {
          name: "客户关系",
          service: "CRM",
          port: 8012,
          key: "crm",
          icon: Users,
        },
      ],
    },
    {
      title: "研发管理",
      services: [
        { name: "AI 服务", service: "AI", port: 8013, key: "ai", icon: Brain },
        {
          name: "研发管理",
          service: "RS",
          port: 8020,
          key: "rs",
          icon: FlaskConical,
        },
        {
          name: "实验室管理",
          service: "LIMS",
          port: 8022,
          key: "lims",
          icon: ClipboardList,
        },
        {
          name: "产品数据管理",
          service: "PDM",
          port: 8023,
          key: "pdm",
          icon: FileText,
        },
      ],
    },
    {
      title: "生产管理",
      services: [
        {
          name: "制造执行",
          service: "MES",
          port: 8030,
          key: "mes",
          icon: Factory,
        },
        {
          name: "质量管理",
          service: "QMS",
          port: 8031,
          key: "qms",
          icon: ClipboardList,
        },
        {
          name: "环境安全",
          service: "EHS",
          port: 8032,
          key: "ehs",
          icon: AlertTriangle,
        },
      ],
    },
    {
      title: "供应链",
      services: [
        {
          name: "供应链管理",
          service: "SCM",
          port: 8040,
          key: "scm",
          icon: Truck,
        },
        {
          name: "供应商管理",
          service: "SRM",
          port: 8041,
          key: "srm",
          icon: ShoppingCart,
        },
        {
          name: "仓库管理",
          service: "WMS",
          port: 8042,
          key: "wms",
          icon: Warehouse,
        },
      ],
    },
    {
      title: "专业服务",
      services: [
        { name: "地理信息", service: "GIS", port: 8050, key: "gis", icon: Map },
        {
          name: "即时通讯",
          service: "IM",
          port: 8051,
          key: "im",
          icon: MessageCircle,
        },
        {
          name: "数据分析",
          service: "BI",
          port: 8052,
          key: "bi",
          icon: BarChart2,
        },
        {
          name: "报表服务",
          service: "REPORT",
          port: 8053,
          key: "report",
          icon: BarChart3,
        },
        {
          name: "邮件服务",
          service: "MAIL",
          port: 8054,
          key: "mail",
          icon: Mail,
        },
        {
          name: "移动服务",
          service: "MOBILE",
          port: 8055,
          key: "mobile",
          icon: Smartphone,
        },
      ],
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-green-500" />
          服务端口监控
        </h3>
        <button
          onClick={onRefresh}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          <Activity className="w-4 h-4 mr-1" />
          刷新状态
        </button>
      </div>

      {serviceGroups.map((group) => (
        <div key={group.title} className="mb-6">
          <h4 className="text-sm font-medium text-slate-500 mb-3">
            {group.title}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {group.services.map((service) => (
              <ServiceStatusCard
                key={service.key}
                name={service.name}
                service={service.service}
                port={service.port}
                status={serviceStatuses[service.key]}
                icon={service.icon}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
