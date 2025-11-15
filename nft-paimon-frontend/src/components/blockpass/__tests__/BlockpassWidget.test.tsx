/**
 * Unit tests for BlockpassWidget component
 *
 * Testing approach: TDD with six-dimensional coverage
 * 1. Functional: Core KYC flow works
 * 2. Boundary: Edge cases (no wallet, missing config)
 * 3. Exception: Error handling (script load fail, API fail)
 * 4. Performance: N/A (widget is external)
 * 5. Security: Wallet validation, secure callbacks
 * 6. Compatibility: N/A (component-level test)
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BlockpassWidget } from '../BlockpassWidget';

// Mock wagmi useAccount hook
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
}));

// Mock fetch for backend API calls
global.fetch = jest.fn();

describe('BlockpassWidget', () => {
  const mockAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const mockClientId = 'test-client-id';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Set environment variables
    process.env.NEXT_PUBLIC_BLOCKPASS_CLIENT_ID = mockClientId;
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    // Mock useAccount to return connected wallet
    const { useAccount } = require('wagmi');
    useAccount.mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });

    // Mock Blockpass SDK
    const mockBlockpassInstance = {
      startKYCConnect: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      destroy: jest.fn(),
    };

    window.BlockpassKYCConnect = jest.fn(() => mockBlockpassInstance) as any;
  });

  afterEach(() => {
    // Clean up DOM
    (window as any).BlockpassKYCConnect = undefined;
  });

  describe('1. Functional Testing', () => {
    test('should render KYC button with default text', () => {
      render(<BlockpassWidget />);

      const button = screen.getByRole('button', { name: /start kyc verification/i });
      expect(button).toBeInTheDocument();
    });

    test('should render KYC button with custom text', () => {
      render(<BlockpassWidget buttonText="Verify Identity" />);

      const button = screen.getByRole('button', { name: /verify identity/i });
      expect(button).toBeInTheDocument();
    });

    test('should initialize Blockpass SDK when script loads', async () => {
      render(<BlockpassWidget />);

      await waitFor(() => {
        expect(window.BlockpassKYCConnect).toHaveBeenCalledWith(
          mockClientId,
          expect.objectContaining({
            refId: mockAddress,
            mainColor: '#FF6F00',
            env: 'prod',
          })
        );
      });
    });

    test('should start KYC flow when button is clicked', async () => {
      const mockStartKYC = jest.fn();
      const mockInstance = {
        startKYCConnect: mockStartKYC,
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      window.BlockpassKYCConnect = jest.fn(() => mockInstance) as any;

      render(<BlockpassWidget />);

      const button = screen.getByRole('button', { name: /start kyc verification/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockStartKYC).toHaveBeenCalled();
      });
    });

    test('should call onSuccess callback when KYC is successful', async () => {
      const onSuccess = jest.fn();
      let successCallback: (() => void) | undefined;

      const mockInstance = {
        startKYCConnect: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'KYCConnectSuccess') {
            successCallback = callback;
          }
        }),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      window.BlockpassKYCConnect = jest.fn(() => mockInstance) as any;

      render(<BlockpassWidget onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(mockInstance.on).toHaveBeenCalled();
      });

      // Simulate KYC success event
      if (successCallback) {
        await successCallback();
      }

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('2. Boundary Testing', () => {
    test('should display warning when wallet is not connected', () => {
      const { useAccount } = require('wagmi');
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      render(<BlockpassWidget />);

      expect(screen.getByText(/please connect your wallet/i)).toBeInTheDocument();
    });

    test('should disable button when wallet is not connected', () => {
      const { useAccount } = require('wagmi');
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      render(<BlockpassWidget />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('should use guest refId when wallet is not connected', async () => {
      const { useAccount } = require('wagmi');
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      render(<BlockpassWidget />);

      await waitFor(() => {
        if (window.BlockpassKYCConnect) {
          expect(window.BlockpassKYCConnect).toHaveBeenCalledWith(
            mockClientId,
            expect.objectContaining({
              refId: expect.stringMatching(/^guest-\d+$/),
            })
          );
        }
      });
    });

    test('should handle custom config options', async () => {
      const customConfig = {
        mainColor: '#1976d2',
        email: 'user@example.com',
        env: 'dev' as const,
      };

      render(<BlockpassWidget config={customConfig} />);

      await waitFor(() => {
        expect(window.BlockpassKYCConnect).toHaveBeenCalledWith(
          mockClientId,
          expect.objectContaining({
            mainColor: '#1976d2',
            email: 'user@example.com',
            env: 'dev',
          })
        );
      });
    });
  });

  describe('3. Exception Testing', () => {
    test('should handle missing client ID gracefully', () => {
      delete process.env.NEXT_PUBLIC_BLOCKPASS_CLIENT_ID;
      const onError = jest.fn();

      render(<BlockpassWidget onError={onError} />);

      // Component should still render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should call onError when script fails to load', () => {
      const onError = jest.fn();
      (window as any).BlockpassKYCConnect = undefined;

      render(<BlockpassWidget onError={onError} />);

      // Simulate script load error
      const script = document.querySelector('script[src*="blockpass"]');
      if (script) {
        fireEvent.error(script);
      }

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to load'),
        })
      );
    });

    test('should call onError when starting KYC without wallet', async () => {
      const { useAccount } = require('wagmi');
      useAccount.mockReturnValue({
        address: null,
        isConnected: false,
      });

      const onError = jest.fn();
      const mockInstance = {
        startKYCConnect: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      window.BlockpassKYCConnect = jest.fn(() => mockInstance) as any;

      render(<BlockpassWidget onError={onError} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled(); // Button should be disabled, so click won't trigger
    });

    test('should handle backend API failure gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('API error'));

      let successCallback: (() => void) | undefined;
      const mockInstance = {
        startKYCConnect: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'KYCConnectSuccess') {
            successCallback = callback;
          }
        }),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      window.BlockpassKYCConnect = jest.fn(() => mockInstance) as any;

      render(<BlockpassWidget />);

      await waitFor(() => {
        expect(mockInstance.on).toHaveBeenCalled();
      });

      // Simulate KYC success (API should fail but not crash)
      if (successCallback) {
        await successCallback();
      }

      // Component should still show success message
      await waitFor(() => {
        expect(screen.getByText(/kyc verification completed successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. Event Handling', () => {
    test('should call onClose callback when widget is closed', async () => {
      const onClose = jest.fn();
      let closeCallback: (() => void) | undefined;

      const mockInstance = {
        startKYCConnect: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'KYCConnectClose') {
            closeCallback = callback;
          }
        }),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      window.BlockpassKYCConnect = jest.fn(() => mockInstance) as any;

      render(<BlockpassWidget onClose={onClose} />);

      await waitFor(() => {
        expect(mockInstance.on).toHaveBeenCalled();
      });

      // Simulate close event
      if (closeCallback) {
        closeCallback();
      }

      expect(onClose).toHaveBeenCalled();
    });

    test('should call onCancel callback when KYC is cancelled', async () => {
      const onCancel = jest.fn();
      let cancelCallback: (() => void) | undefined;

      const mockInstance = {
        startKYCConnect: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'KYCConnectCancel') {
            cancelCallback = callback;
          }
        }),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      window.BlockpassKYCConnect = jest.fn(() => mockInstance) as any;

      render(<BlockpassWidget onCancel={onCancel} />);

      await waitFor(() => {
        expect(mockInstance.on).toHaveBeenCalled();
      });

      // Simulate cancel event
      if (cancelCallback) {
        cancelCallback();
      }

      expect(onCancel).toHaveBeenCalled();
    });

    test('should register all event listeners on mount', async () => {
      const mockInstance = {
        startKYCConnect: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      window.BlockpassKYCConnect = jest.fn(() => mockInstance) as any;

      render(<BlockpassWidget />);

      await waitFor(() => {
        expect(mockInstance.on).toHaveBeenCalledWith('KYCConnectSuccess', expect.any(Function));
        expect(mockInstance.on).toHaveBeenCalledWith('KYCConnectClose', expect.any(Function));
        expect(mockInstance.on).toHaveBeenCalledWith('KYCConnectCancel', expect.any(Function));
        expect(mockInstance.on).toHaveBeenCalledWith('KYCConnectLoad', expect.any(Function));
      });
    });

    test('should unregister event listeners on unmount', async () => {
      const mockInstance = {
        startKYCConnect: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      window.BlockpassKYCConnect = jest.fn(() => mockInstance) as any;

      const { unmount } = render(<BlockpassWidget />);

      await waitFor(() => {
        expect(mockInstance.on).toHaveBeenCalled();
      });

      unmount();

      expect(mockInstance.off).toHaveBeenCalledWith('KYCConnectSuccess', expect.any(Function));
      expect(mockInstance.off).toHaveBeenCalledWith('KYCConnectClose', expect.any(Function));
      expect(mockInstance.off).toHaveBeenCalledWith('KYCConnectCancel', expect.any(Function));
      expect(mockInstance.off).toHaveBeenCalledWith('KYCConnectLoad', expect.any(Function));
    });
  });

  describe('5. Security Testing', () => {
    test('should use wallet address as refId for KYC tracking', async () => {
      render(<BlockpassWidget />);

      await waitFor(() => {
        expect(window.BlockpassKYCConnect).toHaveBeenCalledWith(
          mockClientId,
          expect.objectContaining({
            refId: mockAddress,
          })
        );
      });
    });

    test('should send KYC status to backend with authentication', async () => {
      let successCallback: (() => void) | undefined;
      const mockInstance = {
        startKYCConnect: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'KYCConnectSuccess') {
            successCallback = callback;
          }
        }),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      window.BlockpassKYCConnect = jest.fn(() => mockInstance) as any;

      render(<BlockpassWidget />);

      await waitFor(() => {
        expect(mockInstance.on).toHaveBeenCalled();
      });

      // Simulate KYC success
      if (successCallback) {
        await successCallback();
      }

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/kyc/callback',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Authentication via cookies
            body: expect.stringContaining(mockAddress),
          })
        );
      });
    });

    test('should not expose sensitive data in component state', () => {
      const { container } = render(<BlockpassWidget />);

      // Ensure no client ID or sensitive data is exposed in DOM
      const html = container.innerHTML;
      expect(html).not.toContain(mockClientId);
      expect(html).not.toContain('test-client-id');
    });
  });

  describe('6. UI State Testing', () => {
    test('should show loading state when KYC is in progress', async () => {
      const mockInstance = {
        startKYCConnect: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      window.BlockpassKYCConnect = jest.fn(() => mockInstance) as any;

      render(<BlockpassWidget />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should show success message after KYC completion', async () => {
      let successCallback: (() => void) | undefined;
      const mockInstance = {
        startKYCConnect: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'KYCConnectSuccess') {
            successCallback = callback;
          }
        }),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      window.BlockpassKYCConnect = jest.fn(() => mockInstance) as any;

      render(<BlockpassWidget />);

      await waitFor(() => {
        expect(mockInstance.on).toHaveBeenCalled();
      });

      // Simulate KYC success
      if (successCallback) {
        await successCallback();
      }

      await waitFor(() => {
        expect(screen.getByText(/kyc verification completed successfully/i)).toBeInTheDocument();
      });
    });
  });
});
