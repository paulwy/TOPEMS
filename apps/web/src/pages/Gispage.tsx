import React, { useState, useMemo, useCallback } from "react";
import {
  MapPin,
  Plus,
  Search,
  ChevronRight,
  ArrowRight,
  Warehouse,
  Camera,
  Loader2,
  X,
  Edit,
  Trash2,
  Map,
  Building2,
  PieChart,
  BarChart3,
  Layers,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Upload,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGis, GisProvider } from "../context/GisContext";
import MapView from "../components/gis/MapView";
import MetricCard from "../components/MetricCard";
import StatsChart from "../components/StatsChart";
import { DataTable } from "../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  DevicePoint,
  Pipeline,
  StorageLocation,
  EvidenceRecord,
  FactoryMap,
  BusinessLocation,
  GisStatistics,
} from "../api/gis";

type TabType =
  | "map"
  | "devicePoints"
  | "pipelines"
  | "storageLocations"
  | "evidenceRecords"
  | "factoryMaps"
  | "businessLocations";

type ModalType = "create" | "edit" | null;

interface FormErrors {
  [key: string]: string;
}

const GisContent: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    loadAllData,
    createDevicePoint,
    updateDevicePoint,
    deleteDevicePoint,
    createPipeline,
    updatePipeline,
    deletePipeline,
    createStorageLocation,
    updateStorageLocation,
    deleteStorageLocation,
    createEvidenceRecord,
    deleteEvidenceRecord,
    createFactoryMap,
    updateFactoryMap,
    deleteFactoryMap,
    createBusinessLocation,
    updateBusinessLocation,
    deleteBusinessLocation,
  } = useGis();

  const [activeTab, setActiveTab] = useState<TabType>("map");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<
    DevicePoint | StorageLocation | null
  >(null);

  const {
    devicePoints,
    pipelines,
    storageLocations,
    evidenceRecords,
    factoryMaps,
    businessLocations,
    statistics,
    loading,
    error,
  } = state;

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};
    const requiredFields: { [tab: string]: string[] } = {
      devicePoints: ["name", "device_type", "latitude", "longitude"],
      pipelines: [
        "name",
        "pipeline_type",
        "start_lat",
        "start_lng",
        "end_lat",
        "end_lng",
      ],
      storageLocations: ["name", "location_type", "latitude", "longitude"],
      evidenceRecords: [
        "title",
        "evidence_type",
        "latitude",
        "longitude",
        "recorded_by",
      ],
      factoryMaps: ["name", "code", "map_type"],
      businessLocations: ["business_name", "business_type", "lat", "lng"],
    };

    const fields = requiredFields[activeTab];
    if (!fields) return true;

    fields.forEach((field) => {
      const value = formData[field];
      if (value === undefined || value === null || value === "") {
        errors[field] = "此字段为必填项";
      }
    });

    if (activeTab === "devicePoints" || activeTab === "storageLocations") {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.latitude = "纬度必须在 -90 到 90 之间";
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.longitude = "经度必须在 -180 到 180 之间";
      }
    }

    if (activeTab === "businessLocations") {
      const lat = parseFloat(formData.lat);
      const lng = parseFloat(formData.lng);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.lat = "纬度必须在 -90 到 90 之间";
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.lng = "经度必须在 -180 到 180 之间";
      }
    }

    if (activeTab === "pipelines") {
      const startLat = parseFloat(formData.start_lat);
      const startLng = parseFloat(formData.start_lng);
      const endLat = parseFloat(formData.end_lat);
      const endLng = parseFloat(formData.end_lng);
      if (isNaN(startLat) || startLat < -90 || startLat > 90) {
        errors.start_lat = "起点纬度无效";
      }
      if (isNaN(startLng) || startLng < -180 || startLng > 180) {
        errors.start_lng = "起点经度无效";
      }
      if (isNaN(endLat) || endLat < -90 || endLat > 90) {
        errors.end_lat = "终点纬度无效";
      }
      if (isNaN(endLng) || endLng < -180 || endLng > 180) {
        errors.end_lng = "终点经度无效";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [activeTab, formData]);

  const resetModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
    setFormData({});
    setFormErrors({});
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      switch (activeTab) {
        case "devicePoints":
          await createDevicePoint({
            name: formData.name,
            description: formData.description,
            device_type: formData.device_type,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            status: formData.status || "active",
          });
          break;
        case "pipelines":
          await createPipeline({
            name: formData.name,
            description: formData.description,
            pipeline_type: formData.pipeline_type,
            start_point: [
              parseFloat(formData.start_lat),
              parseFloat(formData.start_lng),
            ],
            end_point: [
              parseFloat(formData.end_lat),
              parseFloat(formData.end_lng),
            ],
            status: formData.status || "active",
          });
          break;
        case "storageLocations":
          await createStorageLocation({
            name: formData.name,
            description: formData.description,
            location_type: formData.location_type,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            capacity: formData.capacity
              ? parseFloat(formData.capacity)
              : undefined,
            current_usage: formData.current_usage
              ? parseFloat(formData.current_usage)
              : undefined,
          });
          break;
        case "evidenceRecords":
          await createEvidenceRecord({
            title: formData.title,
            description: formData.description,
            evidence_type: formData.evidence_type,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            file_url: formData.file_url,
            recorded_by: formData.recorded_by,
          });
          break;
        case "factoryMaps":
          await createFactoryMap({
            name: formData.name,
            code: formData.code,
            map_type: formData.map_type,
            file_url: formData.file_url || "",
            description: formData.description,
          });
          break;
        case "businessLocations":
          await createBusinessLocation({
            business_type: formData.business_type,
            business_name: formData.business_name,
            business_code: formData.business_code,
            category: formData.category,
            position: {
              lat: parseFloat(formData.lat),
              lng: parseFloat(formData.lng),
            },
            address: formData.address,
            contact_person: formData.contact_person,
            contact_phone: formData.contact_phone,
            capacity: formData.capacity
              ? parseFloat(formData.capacity)
              : undefined,
            current_usage: formData.current_usage
              ? parseFloat(formData.current_usage)
              : undefined,
            status: formData.status || "active",
            properties: formData.properties
              ? JSON.parse(formData.properties)
              : undefined,
            description: formData.description,
            external_id: formData.external_id,
            external_type: formData.external_type,
          });
          break;
      }
      showNotification("success", "创建成功");
      resetModal();
    } catch (err) {
      showNotification("error", "创建失败");
      console.error("创建失败:", err);
    }
  };

  const handleEdit = async () => {
    if (!validateForm()) return;
    try {
      if (!editingItem) return;

      switch (activeTab) {
        case "devicePoints":
          await updateDevicePoint(editingItem.id, {
            name: formData.name || editingItem.name,
            description: formData.description || editingItem.description,
            device_type: formData.device_type || editingItem.device_type,
            latitude: parseFloat(
              formData.latitude || editingItem.latitude?.toString() || "0",
            ),
            longitude: parseFloat(
              formData.longitude || editingItem.longitude?.toString() || "0",
            ),
            status: formData.status || editingItem.status,
          });
          break;
        case "pipelines":
          await updatePipeline(editingItem.id, {
            name: formData.name || editingItem.name,
            description: formData.description || editingItem.description,
            pipeline_type: formData.pipeline_type || editingItem.pipeline_type,
            start_point:
              formData.start_lat && formData.start_lng
                ? [
                    parseFloat(formData.start_lat),
                    parseFloat(formData.start_lng),
                  ]
                : editingItem.start_point,
            end_point:
              formData.end_lat && formData.end_lng
                ? [parseFloat(formData.end_lat), parseFloat(formData.end_lng)]
                : editingItem.end_point,
            status: formData.status || editingItem.status,
          });
          break;
        case "storageLocations":
          await updateStorageLocation(editingItem.id, {
            name: formData.name || editingItem.name,
            description: formData.description || editingItem.description,
            location_type: formData.location_type || editingItem.location_type,
            latitude: parseFloat(
              formData.latitude || editingItem.latitude?.toString() || "0",
            ),
            longitude: parseFloat(
              formData.longitude || editingItem.longitude?.toString() || "0",
            ),
            capacity: formData.capacity
              ? parseFloat(formData.capacity)
              : editingItem.capacity,
            current_usage: formData.current_usage
              ? parseFloat(formData.current_usage)
              : editingItem.current_usage,
          });
          break;
        case "factoryMaps":
          await updateFactoryMap(editingItem.id, {
            name: formData.name || editingItem.name,
            code: formData.code || editingItem.code,
            map_type: formData.map_type || editingItem.map_type,
            file_url: formData.file_url || editingItem.file_url,
            description: formData.description || editingItem.description,
          });
          break;
        case "businessLocations":
          await updateBusinessLocation(editingItem.id, {
            business_type: formData.business_type || editingItem.business_type,
            business_name: formData.business_name || editingItem.business_name,
            business_code: formData.business_code || editingItem.business_code,
            category: formData.category || editingItem.category,
            position:
              formData.lat && formData.lng
                ? {
                    lat: parseFloat(formData.lat),
                    lng: parseFloat(formData.lng),
                  }
                : editingItem.position,
            address: formData.address || editingItem.address,
            contact_person:
              formData.contact_person || editingItem.contact_person,
            contact_phone: formData.contact_phone || editingItem.contact_phone,
            capacity: formData.capacity
              ? parseFloat(formData.capacity)
              : editingItem.capacity,
            current_usage: formData.current_usage
              ? parseFloat(formData.current_usage)
              : editingItem.current_usage,
            status: formData.status || editingItem.status,
            properties: formData.properties
              ? JSON.parse(formData.properties)
              : editingItem.properties,
            description: formData.description || editingItem.description,
            external_id: formData.external_id || editingItem.external_id,
            external_type: formData.external_type || editingItem.external_type,
          });
          break;
      }
      showNotification("success", "更新成功");
      resetModal();
    } catch (err) {
      showNotification("error", "更新失败");
      console.error("更新失败:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      switch (activeTab) {
        case "devicePoints":
          await deleteDevicePoint(id);
          break;
        case "pipelines":
          await deletePipeline(id);
          break;
        case "storageLocations":
          await deleteStorageLocation(id);
          break;
        case "evidenceRecords":
          await deleteEvidenceRecord(id);
          break;
        case "factoryMaps":
          await deleteFactoryMap(id);
          break;
        case "businessLocations":
          await deleteBusinessLocation(id);
          break;
      }
      showNotification("success", "删除成功");
    } catch (err) {
      showNotification("error", "删除失败");
      console.error("删除失败:", err);
    }
  };

  const openCreateModal = () => {
    setModalType("create");
    setFormData({});
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setModalType("edit");
    setEditingItem(item);
    const initialFormData: any = { ...item };
    if (item.position?.lat !== undefined) {
      initialFormData.lat = item.position.lat;
      initialFormData.lng = item.position.lng;
    }
    if (item.start_point) {
      initialFormData.start_lat = item.start_point[0];
      initialFormData.start_lng = item.start_point[1];
    }
    if (item.end_point) {
      initialFormData.end_lat = item.end_point[0];
      initialFormData.end_lng = item.end_point[1];
    }
    if (item.properties) {
      initialFormData.properties = JSON.stringify(item.properties);
    }
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(true);
  };

  const tabs = [
    { id: "map", label: "地图视图", icon: Layers },
    { id: "devicePoints", label: "设备点位", icon: MapPin },
    { id: "pipelines", label: "管线管理", icon: ArrowRight },
    { id: "storageLocations", label: "仓储位置", icon: Warehouse },
    { id: "evidenceRecords", label: "现场取证", icon: Camera },
    { id: "factoryMaps", label: "厂区地图", icon: Map },
    { id: "businessLocations", label: "业务位置", icon: Building2 },
  ];

  const getStatusColor = (status: string) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const s = status.toLowerCase();
    if (s.includes("active") || s.includes("启用"))
      return "bg-green-100 text-green-800";
    if (s.includes("pending") || s.includes("待处理"))
      return "bg-yellow-100 text-yellow-800";
    if (s.includes("inactive") || s.includes("禁用"))
      return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const devicePointColumns: ColumnDef<DevicePoint>[] = [
    { accessorKey: "name", header: "设备名称" },
    { accessorKey: "device_type", header: "类型" },
    { accessorKey: "latitude", header: "纬度" },
    { accessorKey: "longitude", header: "经度" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("确定要删除此项吗？")) {
                handleDelete(row.original.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const pipelineColumns: ColumnDef<Pipeline>[] = [
    { accessorKey: "name", header: "管线名称" },
    { accessorKey: "pipeline_type", header: "类型" },
    {
      accessorKey: "start_point",
      header: "起点",
      cell: ({ row }) => {
        const point = row.original.start_point;
        return Array.isArray(point)
          ? `${point[0].toFixed(4)}, ${point[1].toFixed(4)}`
          : "";
      },
    },
    {
      accessorKey: "end_point",
      header: "终点",
      cell: ({ row }) => {
        const point = row.original.end_point;
        return Array.isArray(point)
          ? `${point[0].toFixed(4)}, ${point[1].toFixed(4)}`
          : "";
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("确定要删除此项吗？")) {
                handleDelete(row.original.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const storageLocationColumns: ColumnDef<StorageLocation>[] = [
    { accessorKey: "name", header: "库位名称" },
    { accessorKey: "location_type", header: "类型" },
    { accessorKey: "capacity", header: "容量" },
    { accessorKey: "current_usage", header: "当前用量" },
    {
      accessorKey: "latitude",
      header: "坐标",
      cell: ({ row }) => {
        return `${row.original.latitude?.toFixed(4)}, ${row.original.longitude?.toFixed(4)}`;
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("确定要删除此项吗？")) {
                handleDelete(row.original.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const evidenceRecordColumns: ColumnDef<EvidenceRecord>[] = [
    { accessorKey: "title", header: "标题" },
    { accessorKey: "evidence_type", header: "类型" },
    { accessorKey: "recorded_by", header: "记录人" },
    {
      accessorKey: "recorded_at",
      header: "记录时间",
      cell: ({ row }) => (
        <span>
          {row.original.recorded_at
            ? new Date(row.original.recorded_at).toLocaleString()
            : ""}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("确定要删除此项吗？")) {
                handleDelete(row.original.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const factoryMapColumns: ColumnDef<FactoryMap>[] = [
    { accessorKey: "name", header: "地图名称" },
    { accessorKey: "code", header: "编号" },
    { accessorKey: "map_type", header: "地图类型" },
    {
      accessorKey: "created_at",
      header: "创建时间",
      cell: ({ row }) => (
        <span>
          {row.original.created_at
            ? new Date(row.original.created_at).toLocaleDateString()
            : ""}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("确定要删除此项吗？")) {
                handleDelete(row.original.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const businessLocationColumns: ColumnDef<BusinessLocation>[] = [
    { accessorKey: "business_name", header: "业务名称" },
    { accessorKey: "business_type", header: "业务类型" },
    { accessorKey: "address", header: "地址" },
    { accessorKey: "contact_person", header: "联系人" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("确定要删除此项吗？")) {
                handleDelete(row.original.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const downloadTemplate = () => {
    let headers: string[];
    let sampleRow: string[];

    switch (activeTab) {
      case "devicePoints":
        headers = [
          "name",
          "device_type",
          "latitude",
          "longitude",
          "status",
          "description",
        ];
        sampleRow = [
          "设备A",
          "传感器",
          "31.2304",
          "121.4737",
          "active",
          "设备描述",
        ];
        break;
      case "pipelines":
        headers = [
          "name",
          "pipeline_type",
          "start_lat",
          "start_lng",
          "end_lat",
          "end_lng",
          "status",
        ];
        sampleRow = [
          "管线A",
          "水管",
          "31.2304",
          "121.4737",
          "31.2305",
          "121.4738",
          "active",
        ];
        break;
      case "storageLocations":
        headers = [
          "name",
          "location_type",
          "latitude",
          "longitude",
          "capacity",
          "current_usage",
        ];
        sampleRow = ["仓库A", "原材料仓", "31.2304", "121.4737", "1000", "500"];
        break;
      case "evidenceRecords":
        headers = [
          "title",
          "evidence_type",
          "latitude",
          "longitude",
          "recorded_by",
          "file_url",
          "description",
        ];
        sampleRow = [
          "现场照片1",
          "照片",
          "31.2304",
          "121.4737",
          "张三",
          "",
          "证据描述",
        ];
        break;
      case "factoryMaps":
        headers = ["name", "code", "map_type", "file_url", "description"];
        sampleRow = ["厂区平面图", "F001", "平面图", "", "地图描述"];
        break;
      case "businessLocations":
        headers = [
          "business_name",
          "business_type",
          "lat",
          "lng",
          "address",
          "contact_person",
          "contact_phone",
          "capacity",
          "current_usage",
          "status",
          "description",
        ];
        sampleRow = [
          "门店A",
          "零售",
          "31.2304",
          "121.4737",
          "地址",
          "张三",
          "13800138000",
          "100",
          "50",
          "active",
          "描述",
        ];
        break;
      default:
        headers = ["name"];
        sampleRow = ["示例数据"];
    }

    const content = [headers, sampleRow].map((row) => row.join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}_template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".csv")) {
        showNotification("error", "请选择CSV文件");
        return;
      }
      setImportFile(file);
      setImportPreview(null);
      setImportConfirm(false);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split("\n").filter((line) => line.trim());
          const preview = lines.slice(0, 10).map((line) => line.split(","));
          setImportPreview(preview);
        } catch (err) {
          showNotification("error", "文件解析失败");
        }
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const handleImport = async () => {
    if (!importFile || !importConfirm) return;
    try {
      showNotification("success", "导入成功");
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
      setImportConfirm(false);
      await loadAllData(true);
    } catch (err) {
      showNotification("error", "导入失败");
      console.error("导入失败:", err);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) {
      switch (activeTab) {
        case "devicePoints":
          return devicePoints;
        case "pipelines":
          return pipelines;
        case "storageLocations":
          return storageLocations;
        case "evidenceRecords":
          return evidenceRecords;
        case "factoryMaps":
          return factoryMaps;
        case "businessLocations":
          return businessLocations;
        default:
          return [];
      }
    }
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case "devicePoints":
        return devicePoints.filter(
          (d) =>
            d.name.toLowerCase().includes(term) ||
            d.device_type.toLowerCase().includes(term),
        );
      case "pipelines":
        return pipelines.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.pipeline_type.toLowerCase().includes(term),
        );
      case "storageLocations":
        return storageLocations.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.location_type.toLowerCase().includes(term),
        );
      case "evidenceRecords":
        return evidenceRecords.filter(
          (e) =>
            e.title.toLowerCase().includes(term) ||
            e.evidence_type.toLowerCase().includes(term),
        );
      case "factoryMaps":
        return factoryMaps.filter(
          (m) =>
            m.name.toLowerCase().includes(term) ||
            m.code.toLowerCase().includes(term),
        );
      case "businessLocations":
        return businessLocations.filter(
          (b) =>
            b.business_name.toLowerCase().includes(term) ||
            b.business_type.toLowerCase().includes(term),
        );
      default:
        return [];
    }
  }, [
    activeTab,
    searchTerm,
    devicePoints,
    pipelines,
    storageLocations,
    evidenceRecords,
    factoryMaps,
    businessLocations,
  ]);

  const InputField: React.FC<{
    label: string;
    name: string;
    type?: string;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    placeholder?: string;
    step?: string;
    required?: boolean;
  }> = ({
    label,
    name,
    type = "text",
    value,
    onChange,
    error,
    placeholder,
    step,
    required,
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 ${error ? "border-red-500" : "border-gray-300"}`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );

  const TextAreaField: React.FC<{
    label: string;
    name: string;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    rows?: number;
  }> = ({ label, name, value, onChange, error, rows = 3 }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 ${error ? "border-red-500" : "border-gray-300"}`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                厂区空间数字化
              </h1>
              <p className="text-gray-500">
                管理设备点位、管线、仓储位置、现场取证、厂区地图和业务位置
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              导入
            </button>
            {activeTab !== "map" && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                新建
              </button>
            )}
            <button
              onClick={() => loadAllData(true)}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${notification.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {notification.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <MetricCard
            title="设备点位"
            value={statistics?.device_points || 0}
            icon={<MapPin className="w-6 h-6" />}
            gradient={["#00C897", "#00A878"]}
            subtitle={`启用: ${statistics?.active_devices || 0}`}
          />
          <MetricCard
            title="管线管理"
            value={statistics?.pipelines || 0}
            icon={<ArrowRight className="w-6 h-6" />}
            gradient={["#6366F1", "#4F46E5"]}
            subtitle={`启用: ${statistics?.active_pipelines || 0}`}
          />
          <MetricCard
            title="仓储位置"
            value={statistics?.storage_locations || 0}
            icon={<Warehouse className="w-6 h-6" />}
            gradient={["#F59E0B", "#D97706"]}
          />
          <MetricCard
            title="现场取证"
            value={statistics?.evidence_records || 0}
            icon={<Camera className="w-6 h-6" />}
            gradient={["#EC4899", "#DB2777"]}
          />
          <MetricCard
            title="厂区地图"
            value={statistics?.factory_maps || 0}
            icon={<Map className="w-6 h-6" />}
            gradient={["#8B5CF6", "#7C3AED"]}
          />
          <MetricCard
            title="业务位置"
            value={statistics?.business_locations || 0}
            icon={<Building2 className="w-6 h-6" />}
            gradient={["#14B8A6", "#0D9488"]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <StatsChart
            title="业务类型分布"
            type="pie"
            data={[
              {
                name: "设备点位",
                value: statistics?.device_points || 0,
                color: "#00C897",
              },
              {
                name: "管线",
                value: statistics?.pipelines || 0,
                color: "#6366F1",
              },
              {
                name: "仓储位置",
                value: statistics?.storage_locations || 0,
                color: "#F59E0B",
              },
              {
                name: "厂区地图",
                value: statistics?.factory_maps || 0,
                color: "#8B5CF6",
              },
              {
                name: "业务位置",
                value: statistics?.business_locations || 0,
                color: "#14B8A6",
              },
            ].filter((d) => d.value > 0)}
            dataKey="value"
            nameKey="name"
          />
          <StatsChart
            title="启用状态对比"
            type="bar"
            data={[
              {
                name: "设备点位",
                启用: statistics?.active_devices || 0,
                总数: statistics?.device_points || 0,
              },
              {
                name: "管线",
                启用: statistics?.active_pipelines || 0,
                总数: statistics?.pipelines || 0,
              },
            ]}
            dataKey="name"
            yKeys={["启用", "总数"]}
            colors={["#00C897", "#6366F1"]}
          />
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-cyan-600 text-cyan-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "map" ? (
          <div
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            style={{ height: "500px" }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
              </div>
            ) : (
              <MapView
                devicePoints={devicePoints}
                pipelines={pipelines}
                storageLocations={storageLocations}
                onMarkerClick={(item) => setSelectedItem(item)}
              />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={downloadTemplate}
                  className="ml-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  下载模板
                </button>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">暂无数据</p>
                </div>
              ) : (
                <>
                  {activeTab === "devicePoints" && (
                    <DataTable
                      columns={devicePointColumns}
                      data={filteredData as DevicePoint[]}
                      searchKey="name"
                      searchPlaceholder="搜索设备名称..."
                      exportFileName="gis-device-points"
                    />
                  )}
                  {activeTab === "pipelines" && (
                    <DataTable
                      columns={pipelineColumns}
                      data={filteredData as Pipeline[]}
                      searchKey="name"
                      searchPlaceholder="搜索管线名称..."
                      exportFileName="gis-pipelines"
                    />
                  )}
                  {activeTab === "storageLocations" && (
                    <DataTable
                      columns={storageLocationColumns}
                      data={filteredData as StorageLocation[]}
                      searchKey="name"
                      searchPlaceholder="搜索库位名称..."
                      exportFileName="gis-storage-locations"
                    />
                  )}
                  {activeTab === "evidenceRecords" && (
                    <DataTable
                      columns={evidenceRecordColumns}
                      data={filteredData as EvidenceRecord[]}
                      searchKey="title"
                      searchPlaceholder="搜索记录标题..."
                      exportFileName="gis-evidence-records"
                    />
                  )}
                  {activeTab === "factoryMaps" && (
                    <DataTable
                      columns={factoryMapColumns}
                      data={filteredData as FactoryMap[]}
                      searchKey="name"
                      searchPlaceholder="搜索地图名称..."
                      exportFileName="gis-factory-maps"
                    />
                  )}
                  {activeTab === "businessLocations" && (
                    <DataTable
                      columns={businessLocationColumns}
                      data={filteredData as BusinessLocation[]}
                      searchKey="business_name"
                      searchPlaceholder="搜索业务名称..."
                      exportFileName="gis-business-locations"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalType === "create" ? "新建" : "编辑"}
                </h3>
                <button
                  onClick={resetModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {activeTab === "devicePoints" && (
                  <>
                    <InputField
                      label="名称"
                      name="name"
                      value={formData.name}
                      onChange={(v) => setFormData({ ...formData, name: v })}
                      error={formErrors.name}
                      required
                    />
                    <InputField
                      label="设备类型"
                      name="device_type"
                      value={formData.device_type}
                      onChange={(v) =>
                        setFormData({ ...formData, device_type: v })
                      }
                      error={formErrors.device_type}
                      required
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="纬度"
                        name="latitude"
                        type="number"
                        value={formData.latitude}
                        onChange={(v) =>
                          setFormData({ ...formData, latitude: v })
                        }
                        error={formErrors.latitude}
                        step="0.000001"
                        required
                      />
                      <InputField
                        label="经度"
                        name="longitude"
                        type="number"
                        value={formData.longitude}
                        onChange={(v) =>
                          setFormData({ ...formData, longitude: v })
                        }
                        error={formErrors.longitude}
                        step="0.000001"
                        required
                      />
                    </div>
                    <TextAreaField
                      label="描述"
                      name="description"
                      value={formData.description}
                      onChange={(v) =>
                        setFormData({ ...formData, description: v })
                      }
                    />
                  </>
                )}
                {activeTab === "pipelines" && (
                  <>
                    <InputField
                      label="名称"
                      name="name"
                      value={formData.name}
                      onChange={(v) => setFormData({ ...formData, name: v })}
                      error={formErrors.name}
                      required
                    />
                    <InputField
                      label="管线类型"
                      name="pipeline_type"
                      value={formData.pipeline_type}
                      onChange={(v) =>
                        setFormData({ ...formData, pipeline_type: v })
                      }
                      error={formErrors.pipeline_type}
                      required
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="起点纬度"
                        name="start_lat"
                        type="number"
                        value={formData.start_lat}
                        onChange={(v) =>
                          setFormData({ ...formData, start_lat: v })
                        }
                        error={formErrors.start_lat}
                        step="0.000001"
                        required
                      />
                      <InputField
                        label="起点经度"
                        name="start_lng"
                        type="number"
                        value={formData.start_lng}
                        onChange={(v) =>
                          setFormData({ ...formData, start_lng: v })
                        }
                        error={formErrors.start_lng}
                        step="0.000001"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="终点纬度"
                        name="end_lat"
                        type="number"
                        value={formData.end_lat}
                        onChange={(v) =>
                          setFormData({ ...formData, end_lat: v })
                        }
                        error={formErrors.end_lat}
                        step="0.000001"
                        required
                      />
                      <InputField
                        label="终点经度"
                        name="end_lng"
                        type="number"
                        value={formData.end_lng}
                        onChange={(v) =>
                          setFormData({ ...formData, end_lng: v })
                        }
                        error={formErrors.end_lng}
                        step="0.000001"
                        required
                      />
                    </div>
                  </>
                )}
                {activeTab === "storageLocations" && (
                  <>
                    <InputField
                      label="名称"
                      name="name"
                      value={formData.name}
                      onChange={(v) => setFormData({ ...formData, name: v })}
                      error={formErrors.name}
                      required
                    />
                    <InputField
                      label="类型"
                      name="location_type"
                      value={formData.location_type}
                      onChange={(v) =>
                        setFormData({ ...formData, location_type: v })
                      }
                      error={formErrors.location_type}
                      required
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="纬度"
                        name="latitude"
                        type="number"
                        value={formData.latitude}
                        onChange={(v) =>
                          setFormData({ ...formData, latitude: v })
                        }
                        error={formErrors.latitude}
                        step="0.000001"
                        required
                      />
                      <InputField
                        label="经度"
                        name="longitude"
                        type="number"
                        value={formData.longitude}
                        onChange={(v) =>
                          setFormData({ ...formData, longitude: v })
                        }
                        error={formErrors.longitude}
                        step="0.000001"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="容量"
                        name="capacity"
                        type="number"
                        value={formData.capacity}
                        onChange={(v) =>
                          setFormData({ ...formData, capacity: v })
                        }
                      />
                      <InputField
                        label="当前用量"
                        name="current_usage"
                        type="number"
                        value={formData.current_usage}
                        onChange={(v) =>
                          setFormData({ ...formData, current_usage: v })
                        }
                      />
                    </div>
                  </>
                )}
                {activeTab === "evidenceRecords" && (
                  <>
                    <InputField
                      label="标题"
                      name="title"
                      value={formData.title}
                      onChange={(v) => setFormData({ ...formData, title: v })}
                      error={formErrors.title}
                      required
                    />
                    <InputField
                      label="类型"
                      name="evidence_type"
                      value={formData.evidence_type}
                      onChange={(v) =>
                        setFormData({ ...formData, evidence_type: v })
                      }
                      error={formErrors.evidence_type}
                      required
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="纬度"
                        name="latitude"
                        type="number"
                        value={formData.latitude}
                        onChange={(v) =>
                          setFormData({ ...formData, latitude: v })
                        }
                        error={formErrors.latitude}
                        step="0.000001"
                        required
                      />
                      <InputField
                        label="经度"
                        name="longitude"
                        type="number"
                        value={formData.longitude}
                        onChange={(v) =>
                          setFormData({ ...formData, longitude: v })
                        }
                        error={formErrors.longitude}
                        step="0.000001"
                        required
                      />
                    </div>
                    <InputField
                      label="记录人"
                      name="recorded_by"
                      value={formData.recorded_by}
                      onChange={(v) =>
                        setFormData({ ...formData, recorded_by: v })
                      }
                      error={formErrors.recorded_by}
                      required
                    />
                  </>
                )}
                {activeTab === "factoryMaps" && (
                  <>
                    <InputField
                      label="名称"
                      name="name"
                      value={formData.name}
                      onChange={(v) => setFormData({ ...formData, name: v })}
                      error={formErrors.name}
                      required
                    />
                    <InputField
                      label="编号"
                      name="code"
                      value={formData.code}
                      onChange={(v) => setFormData({ ...formData, code: v })}
                      error={formErrors.code}
                      required
                    />
                    <InputField
                      label="地图类型"
                      name="map_type"
                      value={formData.map_type}
                      onChange={(v) =>
                        setFormData({ ...formData, map_type: v })
                      }
                      error={formErrors.map_type}
                      required
                    />
                    <InputField
                      label="文件URL"
                      name="file_url"
                      value={formData.file_url}
                      onChange={(v) =>
                        setFormData({ ...formData, file_url: v })
                      }
                    />
                  </>
                )}
                {activeTab === "businessLocations" && (
                  <>
                    <InputField
                      label="业务名称"
                      name="business_name"
                      value={formData.business_name}
                      onChange={(v) =>
                        setFormData({ ...formData, business_name: v })
                      }
                      error={formErrors.business_name}
                      required
                    />
                    <InputField
                      label="业务类型"
                      name="business_type"
                      value={formData.business_type}
                      onChange={(v) =>
                        setFormData({ ...formData, business_type: v })
                      }
                      error={formErrors.business_type}
                      required
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="纬度"
                        name="lat"
                        type="number"
                        value={formData.lat}
                        onChange={(v) => setFormData({ ...formData, lat: v })}
                        error={formErrors.lat}
                        step="0.000001"
                        required
                      />
                      <InputField
                        label="经度"
                        name="lng"
                        type="number"
                        value={formData.lng}
                        onChange={(v) => setFormData({ ...formData, lng: v })}
                        error={formErrors.lng}
                        step="0.000001"
                        required
                      />
                    </div>
                    <InputField
                      label="地址"
                      name="address"
                      value={formData.address}
                      onChange={(v) => setFormData({ ...formData, address: v })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="联系人"
                        name="contact_person"
                        value={formData.contact_person}
                        onChange={(v) =>
                          setFormData({ ...formData, contact_person: v })
                        }
                      />
                      <InputField
                        label="联系电话"
                        name="contact_phone"
                        value={formData.contact_phone}
                        onChange={(v) =>
                          setFormData({ ...formData, contact_phone: v })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={resetModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={modalType === "create" ? handleCreate : handleEdit}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  {modalType === "create" ? "创建" : "保存"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  导入数据
                </h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview(null);
                    setImportConfirm(false);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择CSV文件
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-400 transition-colors">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">点击或拖拽文件到此处</p>
                      <p className="text-sm text-gray-400 mt-1">
                        支持CSV格式文件
                      </p>
                    </label>
                  </div>
                </div>
                {importFile && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {importFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(importFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setImportFile(null);
                          setImportPreview(null);
                          setImportConfirm(false);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
                {importPreview && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      文件预览（前10行）
                    </label>
                    <div className="max-h-48 overflow-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            {importPreview[0]?.map((header, index) => (
                              <th
                                key={index}
                                className="px-3 py-2 text-left font-medium text-gray-600"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.slice(1).map((row, rowIndex) => (
                            <tr
                              key={rowIndex}
                              className="border-t border-gray-100"
                            >
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="px-3 py-2 text-gray-700"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex items-center">
                      <input
                        type="checkbox"
                        id="import-confirm"
                        checked={importConfirm}
                        onChange={(e) => setImportConfirm(e.target.checked)}
                      />
                      <label
                        htmlFor="import-confirm"
                        className="ml-2 text-sm text-gray-600"
                      >
                        我确认要导入以上数据
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview(null);
                    setImportConfirm(false);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || !importConfirm}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认导入
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Gispage: React.FC = () => {
  return (
    <GisProvider>
      <GisContent />
    </GisProvider>
  );
};

export default Gispage;
