import type { Theme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";
import { gradients } from "./gradients";
declare module "@mui/material/styles" {
    interface Theme {
        gradients: typeof gradients;
    }
    interface ThemeOptions {
        gradients?: typeof gradients;
    }
}
export declare const createCustomTheme: (mode: PaletteMode) => Theme;
export default createCustomTheme;
