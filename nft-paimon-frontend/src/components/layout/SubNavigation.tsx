'use client';

import { Tabs, Tab, Box } from '@mui/material';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * SubNavigation Tab Component
 * 可复用的页面内Tab导航组件
 *
 * 设计理念:
 * - 统一风格：所有页面的Tab导航保持一致
 * - URL同步：Tab状态同步到URL的tab参数
 * - 响应式：移动端自动适配
 *
 * 使用场景:
 * - /borrow → Dashboard | Stability Pool
 * - /liquidity → Pools | My Liquidity
 * - /vote → Vote | Lock | Bribes
 * - /portfolio → Overview | Rewards | Savings
 * - /swap → PSM | DEX
 *
 * @example
 * ```tsx
 * <SubNavigation
 *   tabs={[
 *     { value: 'vote', label: 'Vote' },
 *     { value: 'lock', label: 'Lock' },
 *     { value: 'bribes', label: 'Bribes' }
 *   ]}
 *   currentTab={currentTab}
 *   onChange={setCurrentTab}
 * />
 * ```
 */

export interface SubNavigationTab {
  value: string;
  label: string;
  disabled?: boolean;
  badge?: string; // 可选徽章 (e.g., "NEW", "BETA")
}

export interface SubNavigationProps {
  tabs: SubNavigationTab[];
  currentTab: string;
  onChange: (tab: string) => void;
  variant?: 'standard' | 'fullWidth' | 'scrollable';
}

/**
 * SubNavigation Component
 */
export function SubNavigation({
  tabs,
  currentTab,
  onChange,
  variant = 'standard',
}: SubNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Handle tab change with URL sync
  const handleChange = useCallback(
    (_event: React.SyntheticEvent, newValue: string) => {
      onChange(newValue);

      // Update URL with tab parameter
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', newValue);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [onChange, pathname, router, searchParams]
  );

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        mb: 3,
      }}
    >
      <Tabs
        value={currentTab}
        onChange={handleChange}
        variant={variant}
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.main',
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            minHeight: 48,
            color: 'text.secondary',
            transition: 'color 0.3s',
            '&:hover': {
              color: 'primary.main',
            },
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={
              tab.badge ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.label}
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      bgcolor: 'error.main',
                      color: 'white',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                    }}
                  >
                    {tab.badge}
                  </Box>
                </Box>
              ) : (
                tab.label
              )
            }
            disabled={tab.disabled}
          />
        ))}
      </Tabs>
    </Box>
  );
}

/**
 * Hook: useTabState
 * 从URL参数读取并管理Tab状态
 *
 * @param defaultTab - 默认Tab值
 * @returns [currentTab, setCurrentTab]
 *
 * @example
 * ```tsx
 * const [currentTab, setCurrentTab] = useTabState('vote');
 *
 * return (
 *   <SubNavigation
 *     tabs={VOTE_TABS}
 *     currentTab={currentTab}
 *     onChange={setCurrentTab}
 *   />
 * );
 * ```
 */
export function useTabState(defaultTab: string): [string, (tab: string) => void] {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || defaultTab;

  const setCurrentTab = useCallback((tab: string) => {
    // State is managed through URL, so this just provides onChange callback
    // Actual URL update happens in SubNavigation component
  }, []);

  return [currentTab, setCurrentTab];
}
