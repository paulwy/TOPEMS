import React from "react";
import {
  Button,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";
import { Settings, Database, Code, Server } from "lucide-react";
import config from "../config/runtime";

const ConfigDebugPage: React.FC = () => {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", padding: 24 }}>
      <div style={{ maxWidth: 896, margin: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ padding: 8, backgroundColor: "#dbeafe", borderRadius: 8 }}>
            <Settings sx={{ width: 24, height: 24, color: "#2563eb" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>
              配置诊断
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280" }}>
              系统配置信息和环境变量
            </p>
          </div>
        </div>

        <div style={{ gap: 24 }}>
          <Card>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Server sx={{ width: 20, height: 20, color: "#4f46e5" }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  服务配置
                </Typography>
              </div>
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                各微服务的连接配置信息
              </Typography>
            </CardHeader>
            <CardContent>
              <pre style={{ backgroundColor: "#111827", color: "#d1d5db", padding: 16, borderRadius: 8, overflow: "auto", fontSize: 14 }}>
                {JSON.stringify(config.services, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Database sx={{ width: 20, height: 20, color: "#16a34a" }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  API 配置
                </Typography>
              </div>
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                API 端点和请求配置
              </Typography>
            </CardHeader>
            <CardContent>
              <pre style={{ backgroundColor: "#111827", color: "#d1d5db", padding: 16, borderRadius: 8, overflow: "auto", fontSize: 14 }}>
                {JSON.stringify(config.api, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Code sx={{ width: 20, height: 20, color: "#ea580c" }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  环境变量
                </Typography>
              </div>
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                前端运行时环境变量
              </Typography>
            </CardHeader>
            <CardContent>
              <pre style={{ backgroundColor: "#111827", color: "#d1d5db", padding: 16, borderRadius: 8, overflow: "auto", fontSize: 14, fontFamily: "monospace" }}>
                {Object.entries(import.meta.env)
                  .filter(([key]) => key.startsWith("VITE_"))
                  .map(([key, value]) => `${key}=${value}`)
                  .join("\n")}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConfigDebugPage;
