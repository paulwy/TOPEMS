export declare const designTokens: {
    colors: {
        primary: {
            50: string;
            100: string;
            200: string;
            300: string;
            400: string;
            500: string;
            600: string;
            700: string;
            800: string;
            900: string;
            main: string;
            light: string;
            dark: string;
            contrastText: string;
        };
        secondary: {
            50: string;
            100: string;
            200: string;
            300: string;
            400: string;
            500: string;
            600: string;
            700: string;
            800: string;
            900: string;
            main: string;
            light: string;
            dark: string;
            contrastText: string;
        };
        success: {
            50: string;
            100: string;
            200: string;
            300: string;
            400: string;
            500: string;
            600: string;
            700: string;
            800: string;
            900: string;
            main: string;
            light: string;
            dark: string;
        };
        warning: {
            50: string;
            100: string;
            200: string;
            300: string;
            400: string;
            500: string;
            600: string;
            700: string;
            800: string;
            900: string;
            main: string;
            light: string;
            dark: string;
        };
        error: {
            50: string;
            100: string;
            200: string;
            300: string;
            400: string;
            500: string;
            600: string;
            700: string;
            800: string;
            900: string;
            main: string;
            light: string;
            dark: string;
        };
        info: {
            50: string;
            100: string;
            200: string;
            300: string;
            400: string;
            500: string;
            600: string;
            700: string;
            800: string;
            900: string;
            main: string;
            light: string;
            dark: string;
        };
        grey: {
            50: string;
            100: string;
            200: string;
            300: string;
            400: string;
            500: string;
            600: string;
            700: string;
            800: string;
            900: string;
            950: string;
        };
        background: {
            default: string;
            paper: string;
            elevated: string;
        };
        surface: {
            50: string;
            100: string;
            200: string;
            300: string;
            400: string;
            500: string;
        };
        text: {
            primary: string;
            secondary: string;
            muted: string;
            disabled: string;
        };
        border: {
            default: string;
            light: string;
            dark: string;
        };
        action: {
            hover: string;
            active: string;
            selected: string;
            disabled: string;
            disabledBackground: string;
            focus: string;
        };
    };
    spacing: {
        none: number;
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        "2xl": number;
        "3xl": number;
    };
    borderRadius: {
        none: number;
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        "2xl": number;
        "3xl": number;
        full: number;
    };
    shadows: {
        none: string;
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        "2xl": string;
        "3xl": string;
        inner: string;
    };
    typography: {
        fontFamily: string;
        fontSize: {
            xs: string;
            sm: string;
            base: string;
            lg: string;
            xl: string;
            "2xl": string;
            "3xl": string;
            "4xl": string;
            "5xl": string;
            "6xl": string;
        };
        fontWeight: {
            light: number;
            normal: number;
            medium: number;
            semibold: number;
            bold: number;
            extrabold: number;
        };
        lineHeight: {
            tight: number;
            normal: number;
            relaxed: number;
        };
        letterSpacing: {
            tighter: string;
            tight: string;
            normal: string;
            wide: string;
            wider: string;
        };
        h1: {
            fontSize: string;
            fontWeight: number;
            lineHeight: number;
            letterSpacing: string;
        };
        h2: {
            fontSize: string;
            fontWeight: number;
            lineHeight: number;
            letterSpacing: string;
        };
        h3: {
            fontSize: string;
            fontWeight: number;
            lineHeight: number;
        };
        h4: {
            fontSize: string;
            fontWeight: number;
            lineHeight: number;
        };
        h5: {
            fontSize: string;
            fontWeight: number;
            lineHeight: number;
        };
        h6: {
            fontSize: string;
            fontWeight: number;
            lineHeight: number;
        };
        body1: {
            fontSize: string;
            fontWeight: number;
            lineHeight: number;
        };
        body2: {
            fontSize: string;
            fontWeight: number;
            lineHeight: number;
        };
        caption: {
            fontSize: string;
            fontWeight: number;
            lineHeight: number;
            letterSpacing: string;
        };
        button: {
            fontSize: string;
            fontWeight: number;
            lineHeight: number;
            letterSpacing: string;
            textTransform: string;
        };
        overline: {
            fontSize: string;
            fontWeight: number;
            lineHeight: number;
            letterSpacing: string;
            textTransform: string;
        };
    };
    zIndex: {
        mobileStepper: number;
        snackbar: number;
        tooltip: number;
        appBar: number;
        drawer: number;
        modal: number;
        popover: number;
        snackbarContent: number;
        tooltipContent: number;
    };
    transitions: {
        duration: {
            shortest: number;
            shorter: number;
            short: number;
            standard: number;
            complex: number;
            enteringScreen: number;
            leavingScreen: number;
        };
        easing: {
            easeInOut: string;
            easeOut: string;
            easeIn: string;
            sharp: string;
        };
    };
    breakpoints: {
        values: {
            xs: number;
            sm: number;
            md: number;
            lg: number;
            xl: number;
        };
    };
};
export type DesignTokens = typeof designTokens;
