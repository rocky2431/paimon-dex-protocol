'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import {
  BlockpassKYCConnect,
  BlockpassConfig,
  BlockpassEventType,
} from '@/types/blockpass';

/**
 * Props for BlockpassWidget component
 */
export interface BlockpassWidgetProps {
  /**
   * Custom button text
   * @default "Start KYC Verification"
   */
  buttonText?: string;

  /**
   * Custom button styling
   */
  buttonClassName?: string;

  /**
   * Callback when KYC verification is successful
   */
  onSuccess?: () => void;

  /**
   * Callback when KYC widget is closed
   */
  onClose?: () => void;

  /**
   * Callback when KYC is cancelled by user
   */
  onCancel?: () => void;

  /**
   * Callback when KYC widget encounters an error
   */
  onError?: (error: Error) => void;

  /**
   * Custom Blockpass configuration
   */
  config?: Partial<BlockpassConfig>;
}

/**
 * Blockpass KYC Widget Component
 *
 * Integrates Blockpass KYC verification into the application.
 * Automatically loads the Blockpass SDK from CDN and handles the KYC flow.
 *
 * @example
 * ```tsx
 * <BlockpassWidget
 *   buttonText="Verify Identity"
 *   onSuccess={() => console.log('KYC completed')}
 *   onError={(err) => console.error('KYC failed:', err)}
 * />
 * ```
 */
export const BlockpassWidget: React.FC<BlockpassWidgetProps> = ({
  buttonText = 'Start KYC Verification',
  buttonClassName = '',
  onSuccess,
  onClose,
  onCancel,
  onError,
  config = {},
}) => {
  const { address } = useAccount();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const blockpassInstance = useRef<BlockpassKYCConnect | null>(null);
  const buttonId = useRef(`blockpass-kyc-button-${Math.random().toString(36).substring(7)}`);

  /**
   * Load Blockpass SDK script from CDN
   */
  useEffect(() => {
    // Check if script is already loaded
    if (window.BlockpassKYCConnect) {
      setIsScriptLoaded(true);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://cdn.blockpass.org/widget/scripts/release/3.0.2/blockpass-kyc-connect.prod.js';
    script.async = true;

    script.onload = () => {
      setIsScriptLoaded(true);
    };

    script.onerror = () => {
      const error = new Error('Failed to load Blockpass SDK');
      console.error(error);
      onError?.(error);
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [onError]);

  /**
   * Initialize Blockpass widget when script is loaded
   */
  useEffect(() => {
    if (!isScriptLoaded || !window.BlockpassKYCConnect) {
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_BLOCKPASS_CLIENT_ID;
    if (!clientId) {
      const error = new Error('NEXT_PUBLIC_BLOCKPASS_CLIENT_ID is not configured');
      console.error(error);
      onError?.(error);
      return;
    }

    try {
      // Initialize Blockpass widget
      const blockpassConfig: BlockpassConfig = {
        refId: address || `guest-${Date.now()}`, // Use wallet address as unique identifier
        elementId: buttonId.current,
        mainColor: config.mainColor || '#FF6F00', // Warm orange color
        email: config.email,
        env: config.env || 'prod',
        ...config,
      };

      blockpassInstance.current = new window.BlockpassKYCConnect(
        clientId,
        blockpassConfig
      );

      // Register event listeners
      blockpassInstance.current.on('KYCConnectSuccess', handleKYCSuccess);
      blockpassInstance.current.on('KYCConnectClose', handleKYCClose);
      blockpassInstance.current.on('KYCConnectCancel', handleKYCCancel);
      blockpassInstance.current.on('KYCConnectLoad', handleKYCLoad);
    } catch (error) {
      console.error('Failed to initialize Blockpass widget:', error);
      onError?.(error as Error);
    }

    // Cleanup event listeners
    return () => {
      if (blockpassInstance.current) {
        blockpassInstance.current.off('KYCConnectSuccess', handleKYCSuccess);
        blockpassInstance.current.off('KYCConnectClose', handleKYCClose);
        blockpassInstance.current.off('KYCConnectCancel', handleKYCCancel);
        blockpassInstance.current.off('KYCConnectLoad', handleKYCLoad);
      }
    };
  }, [isScriptLoaded, address, config, onError]);

  /**
   * Handle KYC verification success
   */
  const handleKYCSuccess = async () => {
    console.log('KYC verification successful');
    setKycStatus('success');
    setIsLoading(false);

    // Notify backend about KYC completion
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/kyc/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          refId: address || `guest-${Date.now()}`,
          status: 'success',
          timestamp: new Date().toISOString(),
        }),
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`KYC callback failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('KYC callback response:', data);
    } catch (error) {
      console.error('Failed to notify backend about KYC completion:', error);
      // Don't block user experience, just log the error
    }

    // Call user-provided callback
    onSuccess?.();
  };

  /**
   * Handle KYC widget close
   */
  const handleKYCClose = () => {
    console.log('KYC widget closed');
    setIsLoading(false);
    onClose?.();
  };

  /**
   * Handle KYC cancellation
   */
  const handleKYCCancel = () => {
    console.log('KYC verification cancelled by user');
    setKycStatus('idle');
    setIsLoading(false);
    onCancel?.();
  };

  /**
   * Handle KYC widget load
   */
  const handleKYCLoad = () => {
    console.log('KYC widget loaded successfully');
    setIsLoading(false);
  };

  /**
   * Start KYC verification flow
   */
  const handleStartKYC = () => {
    if (!blockpassInstance.current) {
      const error = new Error('Blockpass widget not initialized');
      console.error(error);
      onError?.(error);
      return;
    }

    if (!address) {
      const error = new Error('Wallet not connected. Please connect your wallet first.');
      console.error(error);
      onError?.(error);
      return;
    }

    setIsLoading(true);
    setKycStatus('pending');

    try {
      blockpassInstance.current.startKYCConnect();
    } catch (error) {
      console.error('Failed to start KYC flow:', error);
      setIsLoading(false);
      setKycStatus('error');
      onError?.(error as Error);
    }
  };

  return (
    <div className="blockpass-widget-container">
      <button
        id={buttonId.current}
        onClick={handleStartKYC}
        disabled={!isScriptLoaded || isLoading || !address}
        className={buttonClassName || 'blockpass-kyc-button'}
        aria-label="Start KYC verification"
      >
        {isLoading ? 'Loading...' : buttonText}
      </button>

      {!address && (
        <p className="blockpass-widget-warning" style={{ color: '#ff9800', fontSize: '0.875rem', marginTop: '8px' }}>
          Please connect your wallet to start KYC verification
        </p>
      )}

      {kycStatus === 'success' && (
        <p className="blockpass-widget-success" style={{ color: '#4caf50', fontSize: '0.875rem', marginTop: '8px' }}>
          ✓ KYC verification completed successfully
        </p>
      )}

      {kycStatus === 'error' && (
        <p className="blockpass-widget-error" style={{ color: '#f44336', fontSize: '0.875rem', marginTop: '8px' }}>
          ✗ KYC verification failed. Please try again.
        </p>
      )}
    </div>
  );
};

export default BlockpassWidget;
