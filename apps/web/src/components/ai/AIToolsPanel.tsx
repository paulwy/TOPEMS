import React, { useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tooltip,
  Tab,
  Tabs,
  Chip,
} from "@mui/material";
import {
  FileJson,
  Calendar,
  Calculator,
  Shield,
  Copy,
  Check,
  Trash2,
  ArrowRightLeft,
  RefreshCw,
} from "lucide-react";

// ============ JSON 格式化工具 ============
interface JsonFormatterProps {
  onClose?: () => void;
}

const JsonFormatter: React.FC<JsonFormatterProps> = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  }, [input]);

  const handleMinify = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  }, [input]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const handleClear = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
        JSON 数据格式化工具
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
        <Button size="small" variant="outlined" onClick={handleFormat}>
          格式化
        </Button>
        <Button size="small" variant="outlined" onClick={handleMinify}>
          压缩
        </Button>
        <Button size="small" variant="outlined" onClick={handleClear}>
          清空
        </Button>
      </Box>

      <TextField
        multiline
        rows={4}
        fullWidth
        placeholder="输入 JSON 数据..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        sx={{ mb: 1.5 }}
        size="small"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 1.5, fontSize: "0.75rem" }}>
          {error}
        </Alert>
      )}

      {output && (
        <Box sx={{ position: "relative" }}>
          <TextField
            multiline
            rows={6}
            fullWidth
            value={output}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={copied ? "已复制" : "复制"}>
                    <IconButton onClick={handleCopy} size="small">
                      {copied ? (
                        <Check style={{ width: 16, height: 16 }} />
                      ) : (
                        <Copy style={{ width: 16, height: 16 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}
    </Box>
  );
};

// ============ 日期计算器 ============
const DateCalculator: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [result, setResult] = useState<{
    days: number;
    workdays: number;
    weekends: number;
  } | null>(null);

  const calculate = useCallback(() => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let workdays = 0;
    let weekends = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekends++;
      } else {
        workdays++;
      }
    }

    setResult({ days: diffDays, workdays, weekends });
  }, [startDate, endDate]);

  const addDays = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const base = startDate || today;
    const days = prompt("输入要添加的天数:", "7");
    if (days) {
      const date = new Date(base);
      date.setDate(date.getDate() + parseInt(days));
      setStartDate(date.toISOString().split("T")[0]);
    }
  }, [startDate]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
        日期计算器
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
        <TextField
          type="date"
          size="small"
          label="开始日期"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          sx={{ flex: 1 }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          size="small"
          label="结束日期"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          sx={{ flex: 1 }}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
        <Button size="small" variant="outlined" onClick={calculate}>
          计算
        </Button>
        <Button size="small" variant="outlined" onClick={addDays}>
          +7天
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setResult(null);
          }}
        >
          清空
        </Button>
      </Box>

      {result && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            icon={<Calendar style={{ width: 14, height: 14 }} />}
            label={`总天数: ${result.days}`}
            size="small"
          />
          <Chip
            icon={<Calculator style={{ width: 14, height: 14 }} />}
            label={`工作日: ${result.workdays}`}
            size="small"
            color="primary"
          />
          <Chip
            label={`周末: ${result.weekends}`}
            size="small"
            variant="outlined"
          />
        </Box>
      )}
    </Box>
  );
};

// ============ 单位换算 ============
const unitCategories = {
  weight: {
    name: "重量",
    units: [
      { label: "千克 (kg)", factor: 1 },
      { label: "克 (g)", factor: 1000 },
      { label: "毫克 (mg)", factor: 1000000 },
      { label: "吨 (t)", factor: 0.001 },
      { label: "磅 (lb)", factor: 2.20462 },
      { label: "盎司 (oz)", factor: 35.274 },
    ],
  },
  volume: {
    name: "体积",
    units: [
      { label: "升 (L)", factor: 1 },
      { label: "毫升 (mL)", factor: 1000 },
      { label: "立方米 (m³)", factor: 0.001 },
      { label: "加仑 (gal)", factor: 0.264172 },
      { label: "夸脱 (qt)", factor: 1.05669 },
    ],
  },
  length: {
    name: "长度",
    units: [
      { label: "米 (m)", factor: 1 },
      { label: "厘米 (cm)", factor: 100 },
      { label: "毫米 (mm)", factor: 1000 },
      { label: "千米 (km)", factor: 0.001 },
      { label: "英寸 (in)", factor: 39.3701 },
      { label: "英尺 (ft)", factor: 3.28084 },
    ],
  },
};

const UnitConverter: React.FC = () => {
  const [category, setCategory] = useState<"weight" | "volume" | "length">(
    "weight",
  );
  const [fromValue, setFromValue] = useState("");
  const [fromUnit, setFromUnit] = useState(0);
  const [toUnit, setToUnit] = useState(1);

  const units = unitCategories[category].units;

  const calculate = useCallback(() => {
    if (!fromValue) return "";
    const value = parseFloat(fromValue);
    if (isNaN(value)) return "";

    const fromFactor = units[fromUnit].factor;
    const toFactor = units[toUnit].factor;

    const baseValue = value / fromFactor;
    return (baseValue * toFactor).toFixed(6).replace(/\.?0+$/, "");
  }, [fromValue, fromUnit, toUnit, units]);

  const handleSwap = useCallback(() => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
  }, [fromUnit, toUnit]);

  const result = calculate();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
        单位换算器
      </Typography>

      <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
        <InputLabel>类别</InputLabel>
        <Select
          value={category}
          label="类别"
          onChange={(e) => {
            setCategory(e.target.value as typeof category);
            setFromUnit(0);
            setToUnit(1);
          }}
        >
          <MenuItem value="weight">重量</MenuItem>
          <MenuItem value="volume">体积</MenuItem>
          <MenuItem value="length">长度</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <TextField
          type="number"
          size="small"
          placeholder="输入数值"
          value={fromValue}
          onChange={(e) => setFromValue(e.target.value)}
          sx={{ flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value as number)}
          >
            {units.map((u, i) => (
              <MenuItem key={i} value={i}>
                {u.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
        <IconButton size="small" onClick={handleSwap}>
          <ArrowRightLeft style={{ width: 18, height: 18 }} />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="结果"
          value={result}
          InputProps={{ readOnly: true }}
          sx={{ flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value as number)}
          >
            {units.map((u, i) => (
              <MenuItem key={i} value={i}>
                {u.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

// ============ 数据脱敏 ============
const maskTypes = [
  {
    id: "phone",
    label: "手机号",
    pattern: /(\d{3})\d{4}(\d{4})/,
    replacement: "$1****$2",
  },
  {
    id: "id",
    label: "身份证",
    pattern: /(\d{6})\d{8}(\d{4})/,
    replacement: "$1**********$2",
  },
  {
    id: "email",
    label: "邮箱",
    pattern: /(\w{1,3})\w+(@\w+\.\w+)/,
    replacement: "$1***$2",
  },
  {
    id: "bank",
    label: "银行卡",
    pattern: /(\d{4})\d+(\d{4})/,
    replacement: "$1****$2",
  },
];

const DataMasker: React.FC = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [selectedType, setSelectedType] = useState("phone");

  const handleMask = useCallback(() => {
    const mask = maskTypes.find((m) => m.id === selectedType);
    if (!mask) return;

    const lines = input.split("\n");
    const masked = lines.map((line) => {
      return line.replace(mask.pattern, mask.replacement);
    });

    setOutput(masked.join("\n"));
  }, [input, selectedType]);

  const handleClear = useCallback(() => {
    setInput("");
    setOutput("");
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
        数据脱敏工具
      </Typography>

      <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
        <InputLabel>脱敏类型</InputLabel>
        <Select
          value={selectedType}
          label="脱敏类型"
          onChange={(e) => setSelectedType(e.target.value)}
        >
          {maskTypes.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        multiline
        rows={3}
        fullWidth
        placeholder="输入需要脱敏的数据，每行一条..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        sx={{ mb: 1.5 }}
        size="small"
      />

      <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
        <Button size="small" variant="outlined" onClick={handleMask}>
          脱敏
        </Button>
        <Button size="small" variant="outlined" onClick={handleClear}>
          清空
        </Button>
      </Box>

      {output && (
        <TextField
          multiline
          rows={3}
          fullWidth
          value={output}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="复制">
                  <IconButton
                    onClick={() => {
                      navigator.clipboard.writeText(output);
                    }}
                    size="small"
                  >
                    <Copy style={{ width: 16, height: 16 }} />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      )}
    </Box>
  );
};

// ============ 主工具面板 ============
interface AIToolsPanelProps {
  defaultTool?: string;
  onClose?: () => void;
}

export const AIToolsPanel: React.FC<AIToolsPanelProps> = ({
  defaultTool,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTool || "json");

  const tools = [
    {
      id: "json",
      label: "JSON",
      icon: <FileJson style={{ width: 16, height: 16 }} />,
    },
    {
      id: "date",
      label: "日期",
      icon: <Calendar style={{ width: 16, height: 16 }} />,
    },
    {
      id: "unit",
      label: "单位",
      icon: <ArrowRightLeft style={{ width: 16, height: 16 }} />,
    },
    {
      id: "mask",
      label: "脱敏",
      icon: <Shield style={{ width: 16, height: 16 }} />,
    },
  ];

  React.useEffect(() => {
    if (defaultTool) {
      setActiveTab(defaultTool);
    }
  }, [defaultTool]);

  return (
    <Box sx={{ width: 360, maxWidth: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            "& .MuiTab-root": {
              minHeight: 40,
              fontSize: "0.75rem",
            },
          }}
        >
          {tools.map((tool) => (
            <Tab
              key={tool.id}
              value={tool.id}
              icon={tool.icon}
              iconPosition="start"
              label={tool.label}
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
        {activeTab === "json" && <JsonFormatter />}
        {activeTab === "date" && <DateCalculator />}
        {activeTab === "unit" && <UnitConverter />}
        {activeTab === "mask" && <DataMasker />}
      </Box>
    </Box>
  );
};

export default AIToolsPanel;
