// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfills for Node.js environment
global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder

// Mock ResizeObserver for recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock config module
jest.mock('@/config', () => ({
  config: {
    chainId: 97,
    tokenConfig: {
      usdc: {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 18,
        address: '0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2',
        icon: '/tokens/usdc.svg',
      },
      usdp: {
        symbol: 'USDP',
        name: 'USD Paimon',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000001',
        icon: '/tokens/usdp.svg',
      },
      hyd: {
        symbol: 'HYD',
        name: 'Hydra Token',
        decimals: 18,
        address: '0x13487611cDb4A729ca449F0586F1d0E5F586949C',
        icon: '/tokens/hyd.svg',
      },
    },
    tokens: {
      psm: '0xBF194c604462168747C66b077F722C7F4a550AdC',
    },
  },
}))

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: undefined,
    isConnected: false,
    isDisconnected: true,
  }),
  useConnect: () => ({
    connect: jest.fn(),
    connectors: [],
    isLoading: false,
  }),
  useDisconnect: () => ({
    disconnect: jest.fn(),
  }),
  useContractRead: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  useContractWrite: () => ({
    write: jest.fn(),
    isLoading: false,
    isSuccess: false,
  }),
  usePrepareContractWrite: () => ({
    config: {},
  }),
  useWaitForTransaction: () => ({
    isLoading: false,
    isSuccess: false,
  }),
}))

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}
