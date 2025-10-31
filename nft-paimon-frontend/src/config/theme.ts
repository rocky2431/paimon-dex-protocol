import { createTheme } from '@mui/material/styles';

/**
 * Paimon DEX Material-UI Theme
 *
 * Design Requirements:
 * - Material Design 3 compliant
 * - Warm color palette (no blue/purple)
 * - Retro-futuristic style
 *
 * Color Scheme:
 * - Primary: Orange/Amber (warm, energetic)
 * - Secondary: Deep Orange/Brown (earthy, stable)
 * - Background: Warm neutrals
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#FF9800', // Orange - warm, energetic
      light: '#FFB74D',
      dark: '#F57C00',
      contrastText: '#fff',
    },
    secondary: {
      main: '#FF5722', // Deep Orange - bold, attention-grabbing
      light: '#FF8A65',
      dark: '#E64A19',
      contrastText: '#fff',
    },
    background: {
      default: '#FFF8E1', // Warm cream
      paper: '#FFFFFF',
    },
    text: {
      primary: '#3E2723', // Dark brown - warm neutral
      secondary: '#5D4037',
    },
    error: {
      main: '#D32F2F', // Red for errors
    },
    warning: {
      main: '#FFA726', // Amber for warnings
    },
    info: {
      main: '#FF9800', // Orange (avoiding blue)
    },
    success: {
      main: '#66BB6A', // Green for success
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    button: {
      textTransform: 'none', // Modern style: no all-caps
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12, // Rounded corners for modern look
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(255, 152, 0, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove default gradient
        },
      },
    },
  },
});

// Dark mode theme (optional for future)
export const darkTheme = createTheme({
  ...theme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#FFB74D', // Lighter orange for dark mode
      light: '#FFD54F',
      dark: '#FF9800',
      contrastText: '#000',
    },
    secondary: {
      main: '#FF8A65', // Lighter deep orange
      light: '#FFAB91',
      dark: '#FF5722',
      contrastText: '#000',
    },
    background: {
      default: '#1A1410', // Dark warm brown
      paper: '#2C1E15',
    },
    text: {
      primary: '#FFF8E1',
      secondary: '#FFCC80',
    },
  },
});
