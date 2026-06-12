import * as XLSX from "xlsx";
import dayjs from "dayjs";

export const parseFileExtension = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "xlsx" || ext === "xls") {
    return "xlsx";
  }
  return "csv";
};

export const getImportModeLabel = (mode: string): string => {
  const labels: Record<string, string> = {
    create: "仅创建（跳过已存在）",
    update: "仅更新",
    create_update: "创建或更新",
  };
  return labels[mode] || mode;
};

export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const downloadBase64File = (
  base64Data: string,
  filename: string,
): void => {
  const link = document.createElement("a");
  link.href = `data:application/octet-stream;base64,${base64Data}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export interface ExportColumn<T> {
  key: keyof T;
  label: string;
  format?: (value: any) => string;
}

export const exportToExcel = <T>(
  data: T[],
  columns: ExportColumn<T>[],
  fileName: string = "export",
): void => {
  const headers = columns.map((col) => col.label);

  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col.key];
      if (col.format) {
        return col.format(value);
      }
      if (value === null || value === undefined) {
        return "";
      }
      if (typeof value === "boolean") {
        return value ? "是" : "否";
      }
      if (
        value instanceof Date ||
        (typeof value === "string" && dayjs(value).isValid())
      ) {
        return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
      }
      return String(value);
    }),
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  XLSX.writeFile(
    workbook,
    `${fileName}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`,
  );
};

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: { row: number; message: string }[];
}

export const importFromExcel = async <T>(
  file: File,
  columns: ExportColumn<T>[],
  transform?: (raw: Record<string, any>) => T,
): Promise<ImportResult<T>> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<
          string,
          any
        >[];

        const errors: { row: number; message: string }[] = [];
        const result: T[] = [];

        rawData.forEach((row, index) => {
          try {
            if (transform) {
              const item = transform(row);
              result.push(item);
            } else {
              const item: any = {};
              columns.forEach((col) => {
                item[col.key] = row[col.label];
              });
              result.push(item as T);
            }
          } catch (error) {
            errors.push({
              row: index + 2,
              message: error instanceof Error ? error.message : "导入失败",
            });
          }
        });

        resolve({
          success: errors.length === 0,
          data: result,
          errors,
        });
      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: [
            {
              row: 0,
              message: error instanceof Error ? error.message : "读取文件失败",
            },
          ],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: [{ row: 0, message: "读取文件失败" }],
      });
    };

    reader.readAsArrayBuffer(file);
  });
};

export const exportToCSV = <T>(
  data: T[],
  columns: ExportColumn<T>[],
  fileName: string = "export",
): void => {
  const headers = columns.map((col) => col.label).join(",");

  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        let result: string;

        if (col.format) {
          result = col.format(value);
        } else if (value === null || value === undefined) {
          result = "";
        } else if (typeof value === "boolean") {
          result = value ? "是" : "否";
        } else if (
          value instanceof Date ||
          (typeof value === "string" && dayjs(value).isValid())
        ) {
          result = dayjs(value).format("YYYY-MM-DD HH:mm:ss");
        } else {
          result = String(value);
        }

        if (result.includes(",")) {
          result = `"${result}"`;
        }
        return result;
      })
      .join(","),
  );

  const csvContent = [headers, ...rows].join("\n");

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}_${dayjs().format("YYYYMMDD_HHmmss")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadTemplate = <T>(
  columns: ExportColumn<T>[],
  fileName: string = "template",
): void => {
  const headers = columns.map((col) => col.label);
  const csvContent = headers.join("\n");

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}_template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
