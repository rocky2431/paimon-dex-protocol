'use client';

import {
  Drawer,
  Box,
  IconButton,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  Chip,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import * as Icons from '@mui/icons-material';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

import { getNavigationColumns, getActiveColumn, type NavColumn, type NavItem } from '@/config/navigation';

/**
 * Mobile Navigation Component
 * Drawer-style navigation for mobile devices (<1024px)
 *
 * Features:
 * - Hamburger menu button
 * - Slide-in drawer from left
 * - Accordion-style collapsible sections
 * - Shared configuration with desktop
 * - Feature flags auto-filtering
 * - Active state highlighting
 */
export function MobileNavigation() {
  const pathname = usePathname();
  const columns = getNavigationColumns();
  const activeColumnId = getActiveColumn(pathname);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const toggleColumn = (columnId: string) => {
    setExpandedColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  // Helper function to get Material-UI icon component by name
  const getIcon = (iconName: string, sx?: any) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent sx={sx} /> : null;
  };

  // Render a navigation column as accordion
  const renderColumn = (column: NavColumn) => {
    const isActive = activeColumnId === column.id;
    const isExpanded = expandedColumns[column.id];

    // If column has direct href (e.g., Analytics), render as simple link
    if (column.href) {
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
    }

    // Column with accordion
    return (
      <Box key={column.id}>
        <ListItemButton
          onClick={() => toggleColumn(column.id)}
          sx={{
            py: 2,
            px: 3,
            backgroundColor: isActive ? 'rgba(255, 152, 0, 0.1)' : 'transparent',
            borderLeft: isActive ? '4px solid' : '4px solid transparent',
            borderColor: isActive ? 'primary.main' : 'transparent',
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
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {column.items?.map((item) => renderMenuItem(item))}
          </List>
        </Collapse>
      </Box>
    );
  };

  // Render a menu item (supports nested children)
  const renderMenuItem = (item: NavItem) => {
    // If item has children, render as nested accordion
    if (item.children && item.children.length > 0) {
      const isExpanded = expandedColumns[item.id];

      return (
        <Box key={item.id}>
          {/* Submenu header */}
          <ListItemButton
            onClick={() => toggleColumn(item.id)}
            sx={{
              py: 1.5,
              pl: 7,
              pr: 3,
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
            }}
          >
            {getIcon(item.icon, { mr: 1.5, fontSize: 20, color: 'text.secondary' })}
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            />
            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </ListItemButton>

          {/* Submenu items */}
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => (
                <ListItemButton
                  key={child.id}
                  component={Link}
                  href={child.href!}
                  onClick={closeDrawer}
                  sx={{
                    py: 1.5,
                    pl: 11,
                    pr: 3,
                    backgroundColor: pathname === child.href ? 'rgba(255, 152, 0, 0.05)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 152, 0, 0.08)',
                    },
                  }}
                >
                  {getIcon(child.icon, { mr: 1.5, fontSize: 18, color: 'text.secondary' })}
                  <ListItemText
                    primary={child.label}
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      fontWeight: pathname === child.href ? 600 : 400,
                      color: pathname === child.href ? 'primary.main' : 'text.secondary',
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </Box>
      );
    }

    // Regular menu item with optional badge
    return (
      <ListItemButton
        key={item.id}
        component={Link}
        href={item.href!}
        onClick={closeDrawer}
        sx={{
          py: 1.5,
          pl: 7,
          pr: 3,
          backgroundColor: pathname === item.href ? 'rgba(255, 152, 0, 0.05)' : 'transparent',
          '&:hover': {
            backgroundColor: 'rgba(255, 152, 0, 0.08)',
          },
        }}
      >
        {getIcon(item.icon, { mr: 1.5, fontSize: 20, color: 'text.secondary' })}
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontSize: '0.9rem',
            fontWeight: pathname === item.href ? 600 : 400,
            color: pathname === item.href ? 'primary.main' : 'text.primary',
          }}
        />
        {item.badge && (
          <Chip
            label={item.badge}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 700,
              bgcolor: item.badge === 'HOT' ? 'error.main' : 'info.main',
              color: 'white',
            }}
          />
        )}
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
