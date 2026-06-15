import "lucide-react";
import type { SxProps, Theme } from "@mui/material/styles";

declare module "lucide-react" {
  interface LucideProps {
    sx?: SxProps<Theme>;
  }
}
