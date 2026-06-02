export interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: any) => string;
}

export const exportToCSV = (
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string = 'export'
) => {
  const headers = columns.map((col) => col.label);
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = col.formatter ? col.formatter(row[col.key]) : row[col.key];
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

export const exportToExcel = (
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string = 'export'
) => {
  const headers = columns.map((col) => col.label);
  const rows = data.map((row) =>
    columns.map((col) => col.formatter ? col.formatter(row[col.key]) : row[col.key])
  );

  const worksheet = createWorksheet(headers, rows);
  const workbook = createWorkbook(worksheet);
  
  const blob = new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `${filename}.xlsx`);
};

const createWorksheet = (headers: string[], rows: any[][]): string => {
  const xmlRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, cellIndex) => {
          const cellType = typeof cell === 'number' ? 'n' : 't';
          return `<c r="${getExcelCellReference(cellIndex, rowIndex + 1)}" t="${cellType}"><v>${cell}</v></c>`;
        })
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  const headerCells = headers
    .map((header, index) => {
      return `<c r="${getExcelCellReference(index, 0)}" t="t"><v>${header}</v></c>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">${headerCells}</row>
    ${xmlRows}
  </sheetData>
</worksheet>`;
};

const createWorkbook = (worksheet: string): Uint8Array => {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet.main+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
</Types>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const zipContent = [
    { path: '[Content_Types].xml', content: contentTypes },
    { path: '_rels/.rels', content: workbookRels },
    { path: 'xl/_rels/workbook.xml.rels', content: relationships },
    { path: 'xl/workbook.xml', content: workbook },
    { path: 'xl/worksheets/sheet1.xml', content: worksheet },
  ];

  return createZip(zipContent);
};

const createZip = (files: { path: string; content: string }[]): Uint8Array => {
  const centralDirectory: string[] = [];
  let offset = 0;
  const fileData: Uint8Array[] = [];

  files.forEach((file) => {
    const content = new TextEncoder().encode(file.content);
    
    const localFileHeader = new Uint8Array(30 + file.path.length);
    const headerView = new DataView(localFileHeader.buffer);
    
    headerView.setUint32(0, 0x04034B50);
    headerView.setUint16(4, 20);
    headerView.setUint16(6, 0);
    headerView.setUint16(8, 0);
    headerView.setUint16(10, 0);
    headerView.setUint32(12, 0);
    headerView.setUint32(16, content.length);
    headerView.setUint32(20, content.length);
    headerView.setUint16(24, file.path.length);
    headerView.setUint16(26, 0);
    
    const pathBytes = new TextEncoder().encode(file.path);
    localFileHeader.set(pathBytes, 30);
    
    fileData.push(localFileHeader);
    fileData.push(content);
    
    const cdRecord = new Uint8Array(46 + file.path.length);
    const cdView = new DataView(cdRecord.buffer);
    
    cdView.setUint32(0, 0x02014B50);
    cdView.setUint16(4, 20);
    cdView.setUint16(6, 0);
    cdView.setUint16(8, 0);
    cdView.setUint16(10, 0);
    cdView.setUint16(12, 0);
    cdView.setUint32(14, 0);
    cdView.setUint32(18, content.length);
    cdView.setUint32(22, content.length);
    cdView.setUint16(26, file.path.length);
    cdView.setUint16(28, 0);
    cdView.setUint16(30, 0);
    cdView.setUint16(32, 0);
    cdView.setUint32(34, 0);
    cdView.setUint32(38, offset);
    
    cdRecord.set(pathBytes, 46);
    
    centralDirectory.push(cdRecord);
    offset += localFileHeader.length + content.length;
  });

  const cdOffset = offset;
  const cdSize = centralDirectory.reduce((sum, cd) => sum + cd.length, 0);
  
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  
  eocdView.setUint32(0, 0x06054B50);
  eocdView.setUint16(4, 0);
  eocdView.setUint16(6, 0);
  eocdView.setUint16(8, files.length);
  eocdView.setUint16(10, files.length);
  eocdView.setUint32(12, cdSize);
  eocdView.setUint32(16, cdOffset);
  eocdView.setUint16(20, 0);

  const allParts = [...fileData, ...centralDirectory, eocd];
  const totalSize = allParts.reduce((sum, part) => sum + part.length, 0);
  
  const result = new Uint8Array(totalSize);
  let pos = 0;
  allParts.forEach((part) => {
    result.set(part, pos);
    pos += part.length;
  });

  return result;
};

const getExcelCellReference = (col: number, row: number): string => {
  let column = '';
  let num = col + 1;
  
  while (num > 0) {
    num--;
    column = String.fromCharCode(65 + (num % 26)) + column;
    num = Math.floor(num / 26);
  }
  
  return `${column}${row + 1}`;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface ExportButtonProps {
  onExport: () => void;
  disabled?: boolean;
  variant?: 'csv' | 'excel';
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport, disabled, variant = 'csv' }) => {
  const labels = {
    csv: '导出 CSV',
    excel: '导出 Excel',
  };
  
  const icons = {
    csv: '📄',
    excel: '📊',
  };

  return (
    <button
      onClick={onExport}
      disabled={disabled}
      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
    >
      <span>{icons[variant]}</span>
      <span>{labels[variant]}</span>
    </button>
  );
};

export const useExport = <T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[]
) => {
  const exportCSV = (filename?: string) => {
    exportToCSV(data, columns, filename || 'export');
  };

  const exportExcel = (filename?: string) => {
    exportToExcel(data, columns, filename || 'export');
  };

  return {
    exportCSV,
    exportExcel,
  };
};

export default ExportButton;
