import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Pagination as MuiPagination, PaginationItem, Box } from "@mui/material";

export interface PaginationProps {
  count: number;
  page: number;
  onChange: (_event: React.ChangeEvent<unknown>, newPage: number) => void;
  rowsPerPage?: number;
  rowsPerPageOptions?: number[];
  onRowsPerPageChange?: (_event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  count,
  page,
  onChange,
  rowsPerPage,
  rowsPerPageOptions = [10, 20, 50, 100],
  onRowsPerPageChange,
  className,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 2,
        py: 2,
      }}
      className={className}
    >
      <MuiPagination
        count={count}
        page={page}
        onChange={onChange}
        shape="rounded"
        color="primary"
        renderItem={(item) => (
          <PaginationItem
            slots={{
              previous: () => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <ChevronLeft style={{ width: 16, height: 16 }} />
                  <span>上一页</span>
                </Box>
              ),
              next: () => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <span>下一页</span>
                  <ChevronRight style={{ width: 16, height: 16 }} />
                </Box>
              ),
            }}
            {...item}
          />
        )}
      />
      {onRowsPerPageChange && rowsPerPage !== undefined && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span style={{ fontSize: 14, color: "#666" }}>每页</span>
          <select
            value={rowsPerPage}
            onChange={onRowsPerPageChange}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: 4,
              padding: "4px 8px",
              fontSize: 14,
            }}
          >
            {rowsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 14, color: "#666" }}>条</span>
        </Box>
      )}
    </Box>
  );
};

export { Pagination };
