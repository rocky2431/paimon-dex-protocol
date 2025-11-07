'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Homepage - Redirect to /swap
 *
 * V3架构: 首页自动跳转到 /swap (PSM + DEX入口)
 * 原因: 交易是核心功能，PSM是新用户最友好的入口
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/swap');
  }, [router]);

  // 显示加载状态（瞬间跳转，用户基本看不到）
  return null;
}
