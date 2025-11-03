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
      busd: {
        symbol: 'BUSD',
        name: 'Binance USD',
        decimals: 18,
        address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        icon: '/tokens/busd.svg',
      },
      wbnb: {
        symbol: 'WBNB',
        name: 'Wrapped BNB',
        decimals: 18,
        address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        icon: '/tokens/wbnb.svg',
      },
      paimon: {
        symbol: 'PAIMON',
        name: 'Paimon Token',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000003',
        icon: '/tokens/paimon.svg',
      },
      esPaimon: {
        symbol: 'esPAIMON',
        name: 'Escrowed Paimon',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000002',
        icon: '/tokens/espaimon.svg',
      },
    },
    tokens: {
      psm: '0xBF194c604462168747C66b077F722C7F4a550AdC',
    },
    pools: {
      hydUsdc: '0x0000000000000000000000000000000000000010',
      paimonUsdc: '0x0000000000000000000000000000000000000011',
    },
    gauges: {
      hydUsdc: '0x1000000000000000000000000000000000000000',
      paimonUsdc: '0x1000000000000000000000000000000000000001',
    },
  },
}))

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: undefined,
    isConnected: false,
    isDisconnected: true,
  })),
  useConnect: jest.fn(() => ({
    connect: jest.fn(),
    connectors: [],
    isLoading: false,
  })),
  useDisconnect: jest.fn(() => ({
    disconnect: jest.fn(),
  })),
  // Legacy v1 hooks
  useContractRead: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
  useContractWrite: jest.fn(() => ({
    write: jest.fn(),
    isLoading: false,
    isSuccess: false,
  })),
  usePrepareContractWrite: jest.fn(() => ({
    config: {},
  })),
  useWaitForTransaction: jest.fn(() => ({
    isLoading: false,
    isSuccess: false,
  })),
  // New v2 hooks
  useReadContract: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  })),
  useWriteContract: jest.fn(() => ({
    writeContract: jest.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
  })),
  useWaitForTransactionReceipt: jest.fn(() => ({
    isLoading: false,
    isSuccess: false,
  })),
}))

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}
