import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // The Clean Control Palette
        primary: {
          bg: "#F5F7FA",        // Primary Background - Very light gray/off-white
          text: "#333333",      // Text & UI Elements - Dark gray
          accent: "#E65100",    // Accent (Primary Action) - Rich warm orange
          "accent-hover": "#D84315",  // Slightly darker orange for hover states
          "accent-light": "#FF8A50",  // Lighter orange for backgrounds
        },
        danger: {
          DEFAULT: "#E53935",   // Warning & Danger - Vibrant red
          hover: "#C62828",     // Darker red for hover
          light: "#FFEBEE",     // Light red for backgrounds
          text: "#B71C1C",      // Dark red for text
        },
        success: {
          DEFAULT: "#388E3C",   // Success & Safety - Balanced green
          hover: "#2E7D32",     // Darker green for hover
          light: "#E8F5E8",     // Light green for backgrounds
          text: "#1B5E20",      // Dark green for text
        },
        // Additional neutral colors for UI
        gray: {
          50: "#FAFBFC",
          100: "#F5F7FA",       // Primary background
          200: "#E4E7EB",
          300: "#CBD2D9",
          400: "#9AA5B1",
          500: "#7B8794",
          600: "#616E7C",
          700: "#52606D",
          800: "#3E4C59",
          900: "#333333",       // Primary text
        },
        // Fire-themed colors (variations of orange/red)
        fire: {
          50: "#FFF3E0",
          100: "#FFE0B2",
          200: "#FFCC80",
          300: "#FFB74D",
          400: "#FFA726",
          500: "#FF9800",
          600: "#E65100",       // Primary accent
          700: "#D84315",
          800: "#BF360C",
          900: "#A62F00",
        }
      },
      backgroundColor: {
        'primary': '#F5F7FA',
        'card': '#FFFFFF',
        'hover': '#FAFBFC',
      },
      textColor: {
        'primary': '#333333',
        'secondary': '#7B8794',
        'accent': '#E65100',
      },
      borderColor: {
        'primary': '#E4E7EB',
        'accent': '#E65100',
      },
      height: {
        'sidebar': 'calc(100vh - 4rem)', // Full height minus top nav (64px)
      }
    },
  },
  plugins: [],
};

export default config;