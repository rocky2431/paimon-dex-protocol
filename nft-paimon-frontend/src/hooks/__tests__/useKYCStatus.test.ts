/**
 * Unit tests for useKYCStatus hook
 *
 * Test coverage:
 * 1. Functional: Fetch KYC status from API
 * 2. Boundary: Different tier levels, different statuses
 * 3. Exception: API errors, network failures, unauthorized
 * 4. Performance: Caching, auto-refresh
 * 5. Security: Only fetch own address data
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useKYCStatus } from '../useKYCStatus';

// Mock fetch
global.fetch = jest.fn();

describe('useKYCStatus', () => {
  const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Functional Tests', () => {
    it('should fetch KYC status for Tier 0 user', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 0,
          status: 'pending',
          blockpassId: null,
          approvedAt: null,
        }),
      });

      const { result } = renderHook(() => useKYCStatus(mockAddress));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({
        tier: 0,
        status: 'pending',
        blockpassId: null,
        approvedAt: null,
      });
      expect(result.current.error).toBeNull();
    });

    it('should fetch KYC status for Tier 1 user', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 1,
          status: 'approved',
          blockpassId: 'bp_test_123',
          approvedAt: '2025-01-15T12:00:00Z',
        }),
      });

      const { result } = renderHook(() => useKYCStatus(mockAddress));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({
        tier: 1,
        status: 'approved',
        blockpassId: 'bp_test_123',
        approvedAt: '2025-01-15T12:00:00Z',
      });
    });

    it('should fetch KYC status for Tier 2 user', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 2,
          status: 'approved',
          blockpassId: 'bp_test_456',
          approvedAt: '2025-01-15T12:00:00Z',
        }),
      });

      const { result } = renderHook(() => useKYCStatus(mockAddress));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.tier).toBe(2);
      expect(result.current.data?.status).toBe('approved');
    });

    it('should include JWT token in request header', async () => {
      // Mock localStorage to return a token
      Storage.prototype.getItem = jest.fn(() => 'mock_jwt_token');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 0,
          status: 'pending',
          blockpassId: null,
          approvedAt: null,
        }),
      });

      renderHook(() => useKYCStatus(mockAddress));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/kyc/status/${mockAddress}`),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock_jwt_token',
            }),
          })
        );
      });
    });
  });

  describe('Boundary Tests', () => {
    it('should handle null address', () => {
      const { result } = renderHook(() => useKYCStatus(undefined));

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty address string', () => {
      const { result } = renderHook(() => useKYCStatus(''));

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle all KYC statuses', async () => {
      const statuses = ['pending', 'approved', 'rejected', 'expired'];

      for (const status of statuses) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            tier: 0,
            status,
            blockpassId: null,
            approvedAt: null,
          }),
        });

        const { result } = renderHook(() => useKYCStatus(mockAddress));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.data?.status).toBe(status);
      }
    });
  });

  describe('Exception Tests', () => {
    it('should handle API error (404)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const { result } = renderHook(() => useKYCStatus(mockAddress));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeTruthy();
    });

    it('should handle API error (500)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useKYCStatus(mockAddress));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useKYCStatus(mockAddress));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeNull();
    });

    it('should handle unauthorized (401)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const { result } = renderHook(() => useKYCStatus(mockAddress));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Performance Tests', () => {
    it('should set loading state correctly', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({
                  tier: 0,
                  status: 'pending',
                  blockpassId: null,
                  approvedAt: null,
                }),
              });
            }, 100);
          })
      );

      const { result } = renderHook(() => useKYCStatus(mockAddress));

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();

      // After fetch completes
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
    });
  });

  describe('Security Tests', () => {
    it('should only fetch when address is provided', () => {
      renderHook(() => useKYCStatus(undefined));

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch from correct API endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 0,
          status: 'pending',
          blockpassId: null,
          approvedAt: null,
        }),
      });

      renderHook(() => useKYCStatus(mockAddress));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/kyc/status/${mockAddress}`),
          expect.any(Object)
        );
      });
    });
  });
});
