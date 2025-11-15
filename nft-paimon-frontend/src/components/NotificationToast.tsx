/**
 * Notification Toast Component.
 *
 * Displays real-time notifications from WebSocket in toast format.
 */

import React from 'react';
import { Box, Alert, AlertTitle, IconButton, Collapse } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNotifications } from '@/contexts/SocketContext';
import { Notification } from '@/contexts/SocketContext';

// Map notification types to MUI Alert severities
const getSeverity = (type: Notification['type']): 'success' | 'info' | 'warning' | 'error' => {
  switch (type) {
    case 'task_completed':
      return 'success';
    case 'liquidation_warning':
      return 'warning';
    case 'reward_distributed':
      return 'info';
    default:
      return 'info';
  }
};

// Parse health factor severity from data
const getSeverityFromData = (notification: Notification): 'success' | 'info' | 'warning' | 'error' => {
  if (notification.type === 'liquidation_warning' && notification.data?.severity === 'critical') {
    return 'error';
  }
  return getSeverity(notification.type);
};

export const NotificationToast: React.FC = () => {
  const { notifications } = useNotifications();
  const [closedNotifications, setClosedNotifications] = React.useState<Set<string>>(new Set());

  const handleClose = (timestamp: string) => {
    setClosedNotifications((prev) => new Set([...prev, timestamp]));
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80, // Below header
        right: 20,
        zIndex: 9999,
        maxWidth: 400,
        width: '100%',
      }}
    >
      {notifications.map((notification) => {
        const isOpen = !closedNotifications.has(notification.timestamp);

        return (
          <Collapse key={notification.timestamp} in={isOpen} sx={{ mb: 2 }}>
            <Alert
              severity={getSeverityFromData(notification)}
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => handleClose(notification.timestamp)}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              }
              sx={{
                boxShadow: 3,
                '& .MuiAlert-message': {
                  width: '100%',
                },
              }}
            >
              <AlertTitle sx={{ fontWeight: 'bold' }}>{notification.title}</AlertTitle>
              {notification.message}

              {/* Task completion details */}
              {notification.type === 'task_completed' && notification.data && (
                <Box sx={{ mt: 1, fontSize: '0.875rem' }}>
                  <Box>
                    <strong>Reward:</strong> {notification.data.reward_amount} points
                  </Box>
                </Box>
              )}

              {/* Liquidation warning details */}
              {notification.type === 'liquidation_warning' && notification.data && (
                <Box sx={{ mt: 1, fontSize: '0.875rem' }}>
                  <Box>
                    <strong>Health Factor:</strong> {notification.data.health_factor}
                  </Box>
                  <Box>
                    <strong>Liquidation Threshold:</strong> {notification.data.liquidation_threshold}
                  </Box>
                  {notification.data.suggested_actions && (
                    <Box sx={{ mt: 1 }}>
                      <strong>Suggested Actions:</strong>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                        {notification.data.suggested_actions.slice(0, 2).map((action: string, index: number) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </Box>
                  )}
                </Box>
              )}
            </Alert>
          </Collapse>
        );
      })}
    </Box>
  );
};
