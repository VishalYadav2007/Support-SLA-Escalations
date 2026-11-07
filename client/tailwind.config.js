export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "primary-fixed": "#ffdad6", "primary": "#ffb4ab", "on-surface": "#e2e2e9",
        "error-container": "#93000a", "primary-fixed-dim": "#ffb4ab", "on-tertiary": "#003355",
        "surface-container-high": "#282a2f", "surface-container-lowest": "#0c0e13",
        "surface-bright": "#38393e", "on-primary": "#690006", "surface-container-low": "#1a1b20",
        "surface-container-highest": "#33353a", "surface": "#121318", "on-tertiary-fixed": "#001d34",
        "on-secondary-fixed-variant": "#2d4c4c", "secondary-container": "#2d4c4c",
        "background": "#121318", "inverse-on-surface": "#2f3035", "inverse-primary": "#b32825",
        "on-secondary-fixed": "#002020", "secondary-fixed": "#c7e9e8", "on-error": "#690005",
        "secondary-fixed-dim": "#accdcc", "on-secondary-container": "#9bbbba",
        "surface-dim": "#121318", "on-surface-variant": "#e2beba", "outline": "#a98986",
        "on-primary-container": "#ffb5ad", "on-secondary": "#163535", "tertiary-fixed": "#cfe5ff",
        "tertiary-container": "#00578c", "secondary": "#accdcc", "on-primary-fixed-variant": "#900b10",
        "surface-tint": "#ffb4ab", "tertiary": "#99cbff", "on-background": "#e2e2e9",
        "primary-container": "#a31c1b", "surface-container": "#1e1f24", "outline-variant": "#5a413e",
        "error": "#ffb4ab", "inverse-surface": "#e2e2e9", "on-primary-fixed": "#410002",
        "on-tertiary-container": "#9bccff", "on-error-container": "#ffdad6",
        "surface-variant": "#33353a", "on-tertiary-fixed-variant": "#004a78",
        "tertiary-fixed-dim": "#99cbff"
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      spacing: {
        "space-lg": "1.5rem", "space-xs": "0.25rem", "gutter-tablet": "1rem",
        "space-xl": "2rem", gutter: "1rem", "margin-desktop": "2rem",
        "space-md": "1rem", "space-sm": "0.5rem", "gutter-desktop": "1rem",
        "margin-tablet": "1.5rem", margin: "1rem"
      },
      fontFamily: {
        "timer-display": ["Plus Jakarta Sans"], "headline-lg": ["Plus Jakarta Sans"],
        "body-md": ["Plus Jakarta Sans"], "body-lg": ["Plus Jakarta Sans"],
        "display-lg-mobile": ["Plus Jakarta Sans"], "label-md": ["Plus Jakarta Sans"],
        "headline-md": ["Plus Jakarta Sans"], "label-sm": ["Plus Jakarta Sans"],
        "body-sm": ["Plus Jakarta Sans"], "headline-sm": ["Plus Jakarta Sans"],
        "display-lg": ["Plus Jakarta Sans"]
      },
      fontSize: {
        "timer-display": ["18px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.015em", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "display-lg-mobile": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "label-md": ["13px", { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "500" }],
        "headline-md": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.05em", fontWeight: "600" }],
        "body-sm": ["12px", { lineHeight: "18px", fontWeight: "400" }],
        "headline-sm": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "display-lg": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" }]
      }
    }
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/container-queries")]
};
