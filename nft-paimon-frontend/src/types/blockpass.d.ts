/**
 * TypeScript definitions for Blockpass KYC Connect widget
 *
 * Official documentation: https://developers.blockpass.org/
 * CDN: https://cdn.blockpass.org/widget/scripts/release/3.0.2/blockpass-kyc-connect.prod.js
 */

/**
 * Configuration options for Blockpass KYC widget
 */
export interface BlockpassConfig {
  /**
   * Unique user identifier (1-200 characters)
   * Alphanumeric characters plus: - _ + @ .
   *
   * @example "user-12345"
   * @example "user@example.com"
   */
  refId?: string;

  /**
   * Custom button element ID
   * If not provided, Blockpass will create default button
   *
   * @example "kyc-button"
   */
  elementId?: string;

  /**
   * Primary color for widget branding (hex color)
   *
   * @example "#FF6F00"
   * @example "#1976d2"
   */
  mainColor?: string;

  /**
   * Pre-fill user email address
   *
   * @example "user@example.com"
   */
  email?: string;

  /**
   * Environment mode
   * - "dev": Development/testing environment
   * - "prod": Production environment (default)
   */
  env?: 'dev' | 'prod';
}

/**
 * Event types emitted by Blockpass widget
 */
export type BlockpassEventType =
  | 'KYCConnectSuccess'  // Data submitted successfully
  | 'KYCConnectClose'    // Widget closed by user
  | 'KYCConnectCancel'   // User cancelled workflow
  | 'KYCConnectLoad';    // Widget iframe fully loaded

/**
 * Event callback function signature
 */
export type BlockpassEventCallback = () => void;

/**
 * Event data for KYCConnectSuccess
 */
export interface BlockpassSuccessData {
  refId: string;
  status: 'success' | 'pending' | 'approved' | 'rejected';
  message?: string;
}

/**
 * Main Blockpass KYC Connect class
 *
 * @example
 * ```typescript
 * const blockpass = new window.BlockpassKYCConnect(
 *   'your-client-id',
 *   {
 *     refId: 'user-12345',
 *     email: 'user@example.com',
 *     mainColor: '#FF6F00'
 *   }
 * );
 *
 * blockpass.on('KYCConnectSuccess', () => {
 *   console.log('KYC verification successful');
 * });
 *
 * blockpass.startKYCConnect();
 * ```
 */
export interface BlockpassKYCConnect {
  /**
   * Initialize Blockpass widget
   *
   * @param clientId - Your Blockpass client ID from dashboard
   * @param config - Widget configuration options
   */
  new (clientId: string, config?: BlockpassConfig): BlockpassKYCConnect;

  /**
   * Start KYC verification flow
   * Opens the Blockpass widget modal
   */
  startKYCConnect(): void;

  /**
   * Register event listener
   *
   * @param event - Event type to listen for
   * @param callback - Function to call when event fires
   *
   * @example
   * ```typescript
   * blockpass.on('KYCConnectSuccess', () => {
   *   console.log('Verification complete');
   * });
   * ```
   */
  on(event: BlockpassEventType, callback: BlockpassEventCallback): void;

  /**
   * Remove event listener
   *
   * @param event - Event type to stop listening for
   * @param callback - Callback function to remove
   */
  off(event: BlockpassEventType, callback: BlockpassEventCallback): void;

  /**
   * Destroy widget instance and cleanup
   */
  destroy(): void;
}

/**
 * Constructor interface for BlockpassKYCConnect
 */
export interface BlockpassKYCConnectConstructor {
  new (clientId: string, config?: BlockpassConfig): BlockpassKYCConnect;
  prototype: BlockpassKYCConnect;
}

/**
 * Extend Window interface to include Blockpass global
 */
declare global {
  interface Window {
    /**
     * Blockpass KYC Connect widget constructor
     * Available after loading CDN script
     */
    BlockpassKYCConnect: BlockpassKYCConnectConstructor;
  }
}

export {};
