export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const cell = row[header];
          if (typeof cell === "string") {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToJSON = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], {
    type: "application/json;charset=utf-8;",
  });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToMarkdown = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const markdownContent = [
    `# ${filename}`,
    "",
    `导出时间: ${new Date().toLocaleString("zh-CN")}`,
    "",
    `数据行数: ${data.length}`,
    "",
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...data.map(
      (row) => `| ${headers.map((header) => row[header] || "").join(" | ")} |`,
    ),
  ].join("\n");

  const blob = new Blob([markdownContent], {
    type: "text/markdown;charset=utf-8;",
  });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.md`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDateRange = (range: string): { start: string; end: string } => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (range) {
    case "today":
      startDate = now;
      endDate = now;
      break;
    case "yesterday":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      endDate = startDate;
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      endDate = now;
      break;
    case "month":
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      endDate = now;
      break;
    case "quarter":
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3);
      endDate = now;
      break;
    case "year":
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate = now;
      break;
    case "custom":
    default:
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      endDate = now;
  }

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
};
