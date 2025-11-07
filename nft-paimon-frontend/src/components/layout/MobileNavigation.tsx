'use client';

import {
  Drawer,
  Box,
  IconButton,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import * as Icons from '@mui/icons-material';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

import { getNavigationColumns, getActiveColumn, type NavColumn } from '@/config/navigation';

/**
 * Mobile Navigation Component (V3 - Flat Navigation)
 * Drawer-style navigation for mobile devices (<1024px)
 *
 * Features:
 * - Hamburger menu button
 * - Slide-in drawer from left
 * - Flat navigation (no dropdowns/accordions)
 * - Shared configuration with desktop
 * - Feature flags auto-filtering
 * - Active state highlighting
 */
export function MobileNavigation() {
  const pathname = usePathname();
  const columns = getNavigationColumns();
  const activeColumnId = getActiveColumn(pathname);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  // Helper function to get Material-UI icon component by name
  const getIcon = (iconName: string, sx?: any) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent sx={sx} /> : null;
  };

  // Render a navigation column as simple link (V3 flat navigation)
  const renderColumn = (column: NavColumn) => {
    const isActive = activeColumnId === column.id;

    // All columns now have direct href (flat navigation design)
    return (
      <ListItemButton
        key={column.id}
        component={Link}
        href={column.href}
        onClick={closeDrawer}
        sx={{
          py: 2,
          px: 3,
          backgroundColor: isActive ? 'rgba(255, 152, 0, 0.1)' : 'transparent',
          borderLeft: isActive ? '4px solid' : '4px solid transparent',
          borderColor: isActive ? 'primary.main' : 'transparent',
          '&:hover': {
            backgroundColor: 'rgba(255, 152, 0, 0.05)',
          },
        }}
      >
        {getIcon(column.icon, { mr: 2, color: isActive ? 'primary.main' : 'text.secondary' })}
        <ListItemText
          primary={column.label}
          primaryTypographyProps={{
            fontWeight: isActive ? 700 : 600,
            color: isActive ? 'primary.main' : 'text.primary',
          }}
        />
      </ListItemButton>
    );
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <IconButton
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={toggleDrawer}
        sx={{
          display: { xs: 'flex', lg: 'none' },
          color: 'primary.main',
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={closeDrawer}
        sx={{
          '& .MuiDrawer-paper': {
            width: 300,
            backgroundColor: 'background.paper',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Drawer Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" fontWeight={700} color="primary">
              Paimon DEX
            </Typography>
            <IconButton onClick={closeDrawer} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Navigation List */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <List disablePadding>
              {columns.map((column) => renderColumn(column))}
            </List>
          </Box>

          {/* Drawer Footer */}
          <Divider />
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              BSC Testnet • v1.0.0
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
