import React from "react";
import { Button } from "../ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}) => {
  const pages: (number | string)[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      );
    }
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="icon"
        disabled={disabled || currentPage === 1}
        onClick={() => onPageChange(1)}
      >
        <ChevronsLeft className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={disabled || currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {pages.map((page, index) => (
        <Button
          key={index}
          variant={page === currentPage ? "default" : "outline"}
          size="sm"
          disabled={disabled || typeof page === "string"}
          onClick={() => typeof page === "number" && onPageChange(page)}
          className={
            page === currentPage
              ? "bg-blue-600 hover:bg-blue-600 text-white"
              : "min-w-[36px]"
          }
        >
          {page}
        </Button>
      ))}

      <Button
        variant="outline"
        size="icon"
        disabled={disabled || currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={disabled || currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
      >
        <ChevronsRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default Pagination;
