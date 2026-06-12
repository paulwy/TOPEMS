import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database,
  ChevronLeft,
  Search,
  Table,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Eye,
} from "lucide-react";
import {
  dbStructureApi,
  type TableInfo,
  type TableDetail,
  type ColumnInfo,
  type DbChange,
  type DbColumnDefinition,
  type SqlPreview,
} from "../api/system";

const DatabaseStructurePage: React.FC = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableDetail | null>(null);
  const [dbChanges, setDbChanges] = useState<DbChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"structure" | "changes">(
    "structure",
  );
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [sqlPreview, setSqlPreview] = useState<SqlPreview | null>(null);
  const [pendingColumn, setPendingColumn] = useState<DbColumnDefinition | null>(
    null,
  );

  const [newColumn, setNewColumn] = useState<DbColumnDefinition>({
    column_name: "",
    data_type: "VARCHAR",
    is_nullable: true,
    default_value: "",
    max_length: 255,
  });

  useEffect(() => {
    loadTables();
    loadDbChanges();
  }, []);

  useEffect(() => {
    if (selectedTable && activeTab === "structure") {
      loadTableDetail(selectedTable.table_name);
    }
  }, [selectedTable?.table_name, activeTab]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await dbStructureApi.listTables({ schema: "public" });
      if (res.success && res.data) {
        setTables(res.data);
      }
    } catch (err: any) {
      showNotification("error", err.message || "加载表列表失败");
    } finally {
      setLoading(false);
    }
  };

  const loadTableDetail = async (tableName: string) => {
    setDetailLoading(true);
    try {
      const res = await dbStructureApi.getTableDetail(tableName);
      if (res.success && res.data) {
        setSelectedTable(res.data);
      }
    } catch (err: any) {
      showNotification("error", err.message || "加载表结构失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const loadDbChanges = async () => {
    try {
      const res = await dbStructureApi.listChanges({ page_size: 50 });
      if (res.success && res.data) {
        setDbChanges(res.data.items || []);
      }
    } catch (err: any) {
      console.error("加载变更历史失败:", err);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePreviewAddColumn = async () => {
    if (!selectedTable || !newColumn.column_name) {
      showNotification("error", "请填写字段名");
      return;
    }

    try {
      const res = await dbStructureApi.previewAddColumn({
        table_name: selectedTable.table_name,
        column: newColumn,
      });
      if (res.success && res.data) {
        setSqlPreview(res.data);
        setPendingColumn(newColumn);
        setShowPreviewModal(true);
      }
    } catch (err: any) {
      showNotification("error", err.message || "生成SQL预览失败");
    }
  };

  const handleExecuteAddColumn = async () => {
    if (!selectedTable || !pendingColumn) return;

    try {
      const res = await dbStructureApi.addColumn({
        table_name: selectedTable.table_name,
        column: pendingColumn,
      });
      if (res.success) {
        showNotification("success", "字段添加成功");
        setShowPreviewModal(false);
        setShowAddColumnModal(false);
        setNewColumn({
          column_name: "",
          data_type: "VARCHAR",
          is_nullable: true,
          default_value: "",
          max_length: 255,
        });
        loadTableDetail(selectedTable.table_name);
        loadDbChanges();
      } else {
        showNotification("error", res.message || "添加字段失败");
      }
    } catch (err: any) {
      showNotification("error", err.message || "添加字段失败");
    }
  };

  const handleDropColumn = async (columnName: string) => {
    if (!selectedTable) return;
    if (!confirm(`确定要删除字段 "${columnName}" 吗？此操作不可恢复！`)) return;

    try {
      const res = await dbStructureApi.dropColumn(
        selectedTable.table_name,
        columnName,
      );
      if (res.success) {
        showNotification("success", "字段删除成功");
        loadTableDetail(selectedTable.table_name);
        loadDbChanges();
      } else {
        showNotification("error", res.message || "删除字段失败");
      }
    } catch (err: any) {
      showNotification("error", err.message || "删除字段失败");
    }
  };

  const filteredTables = tables.filter((table) =>
    table.table_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getDataTypeDisplay = (col: ColumnInfo) => {
    let type = col.data_type.toUpperCase();
    if (col.character_maximum_length) {
      type = `VARCHAR(${col.character_maximum_length})`;
    } else if (col.numeric_precision && col.numeric_scale) {
      type = `NUMERIC(${col.numeric_precision}, ${col.numeric_scale})`;
    } else if (col.numeric_precision) {
      type = `NUMERIC(${col.numeric_precision})`;
    }
    return type;
  };

  const changeTypeLabels: Record<string, string> = {
    add_column: "添加字段",
    modify_column: "修改字段",
    drop_column: "删除字段",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Database className="w-7 h-7 mr-3 text-blue-600" />
                数据库结构管理
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                查看和管理数据库表结构，支持添加、修改、删除字段
              </p>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索表名..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {filteredTables.map((table) => (
                    <div
                      key={table.table_name}
                      onClick={() => {
                        setActiveTab("structure");
                        setSelectedTable({
                          table_name: table.table_name,
                          schema_name: "public",
                          columns: [],
                        });
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedTable?.table_name === table.table_name
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Table className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {table.table_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            {selectedTable ? (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-4 px-6">
                    <button
                      onClick={() => setActiveTab("structure")}
                      className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "structure"
                          ? "text-blue-600 border-blue-600"
                          : "text-gray-500 border-transparent hover:text-gray-700"
                      }`}
                    >
                      表结构
                    </button>
                    <button
                      onClick={() => setActiveTab("changes")}
                      className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "changes"
                          ? "text-blue-600 border-blue-600"
                          : "text-gray-500 border-transparent hover:text-gray-700"
                      }`}
                    >
                      变更历史
                    </button>
                  </nav>
                </div>

                {activeTab === "structure" ? (
                  <div>
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {selectedTable.table_name}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {selectedTable.columns.length} 个字段 |{" "}
                          {selectedTable.row_count?.toLocaleString() || "-"}{" "}
                          行数据
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAddColumnModal(true)}
                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        添加字段
                      </button>
                    </div>

                    <div className="p-4">
                      {detailLoading ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                        </div>
                      ) : (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                                #
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                                字段名
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                                类型
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                                可空
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                                默认值
                              </th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                                操作
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTable.columns.map((col) => (
                              <tr
                                key={col.column_name}
                                className="border-b border-gray-100 hover:bg-gray-50"
                              >
                                <td className="py-3 px-3 text-sm text-gray-400">
                                  {col.ordinal_position}
                                </td>
                                <td className="py-3 px-3 text-sm font-mono text-gray-900">
                                  {col.column_name}
                                </td>
                                <td className="py-3 px-3 text-sm text-gray-600">
                                  {getDataTypeDisplay(col)}
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`px-2 py-1 rounded text-xs ${
                                      col.is_nullable === "YES"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    {col.is_nullable === "YES"
                                      ? "NULL"
                                      : "NOT NULL"}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-sm text-gray-600 font-mono">
                                  {col.column_default || "-"}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() =>
                                      handleDropColumn(col.column_name)
                                    }
                                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                    title="删除字段"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    {dbChanges.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">暂无变更历史</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                              时间
                            </th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                              类型
                            </th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                              表名
                            </th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                              字段
                            </th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                              SQL
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbChanges.map((change) => (
                            <tr
                              key={change.id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-3 px-3 text-sm text-gray-600">
                                {new Date(change.executed_at).toLocaleString()}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    change.change_type === "add_column"
                                      ? "bg-green-100 text-green-700"
                                      : change.change_type === "drop_column"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {changeTypeLabels[change.change_type] ||
                                    change.change_type}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-sm font-mono text-gray-900">
                                {change.table_name}
                              </td>
                              <td className="py-3 px-3 text-sm text-gray-600">
                                {change.column_name || "-"}
                              </td>
                              <td className="py-3 px-3 text-sm text-gray-600 font-mono max-w-xs truncate">
                                {change.sql_statement}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  请选择数据表
                </h3>
                <p className="text-gray-500">
                  从左侧列表选择一个表查看和管理结构
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddColumnModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                添加新字段
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    字段名 *
                  </label>
                  <input
                    type="text"
                    value={newColumn.column_name}
                    onChange={(e) =>
                      setNewColumn({
                        ...newColumn,
                        column_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="如: new_field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数据类型
                  </label>
                  <select
                    value={newColumn.data_type}
                    onChange={(e) =>
                      setNewColumn({ ...newColumn, data_type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="VARCHAR">VARCHAR</option>
                    <option value="TEXT">TEXT</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="BIGINT">BIGINT</option>
                    <option value="NUMERIC">NUMERIC</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                    <option value="DATE">DATE</option>
                    <option value="TIMESTAMP">TIMESTAMP</option>
                    <option value="TIMESTAMPTZ">TIMESTAMPTZ</option>
                    <option value="UUID">UUID</option>
                    <option value="JSONB">JSONB</option>
                  </select>
                </div>
                {newColumn.data_type === "VARCHAR" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最大长度
                    </label>
                    <input
                      type="number"
                      value={newColumn.max_length || 255}
                      onChange={(e) =>
                        setNewColumn({
                          ...newColumn,
                          max_length: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="nullable"
                    checked={newColumn.is_nullable}
                    onChange={(e) =>
                      setNewColumn({
                        ...newColumn,
                        is_nullable: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="nullable" className="text-sm text-gray-700">
                    允许为空 (NULL)
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    默认值
                  </label>
                  <input
                    type="text"
                    value={newColumn.default_value || ""}
                    onChange={(e) =>
                      setNewColumn({
                        ...newColumn,
                        default_value: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="如: 'active' 或 NOW()"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddColumnModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handlePreviewAddColumn}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  预览 SQL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && sqlPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                SQL 预览
              </h3>

              {sqlPreview.warning && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-yellow-800">
                    {sqlPreview.warning}
                  </span>
                </div>
              )}

              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                  {sqlPreview.sql}
                </pre>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  此操作将修改表结构并记录到变更历史。确定要执行吗？
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleExecuteAddColumn}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  确认执行
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseStructurePage;
