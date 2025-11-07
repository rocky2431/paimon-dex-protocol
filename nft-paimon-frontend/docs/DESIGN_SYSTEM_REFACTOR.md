# 🎯 Paimon DEX Design System 重构落地计划

## 📊 问题诊断结果

**当前代码库统计（2025-11-07）：**
- ✅ **451 处内联 sx 样式**（散落在各页面）
- ✅ **31+ 处硬编码颜色值**（#FF6B35, rgba(255,107,0,...)）
- ✅ **20+ 处重复 whitespace 代码**（`<Box sx={{ height: { xs: 40, sm: 60 } }} />`）
- ✅ **缺乏统一 Card 体系**（各组件自定义 padding/radius/shadow）
- ✅ **Typography 层级不完整**（只有 h1-h3，缺 display/headline/caption）

**核心问题根源：**
1. **没有 Design Tokens** - 颜色、间距、阴影全部硬编码
2. **缺少原子组件** - PageShell, StyledCard, SectionHeader 等基础组件不存在
3. **样式耦合严重** - 业务逻辑和视觉样式混在一起
4. **响应式处理重复** - 每个页面都重复写 `{ xs: 40, sm: 60 }`

---

## 🗓️ 分阶段重构计划（4周）

### 第 1 周：建立 Design System 基础

#### 任务 1.1：创建 Design Tokens（2天）

**文件结构：**
```
src/design/
├── tokens/
│   ├── colors.ts        # 颜色系统
│   ├── spacing.ts       # 间距系统
│   ├── typography.ts    # 字体层级
│   ├── shadows.ts       # 阴影/投影
│   ├── radius.ts        # 圆角
│   └── index.ts         # 统一导出
└── theme.ts             # 扩展版 MUI theme
```

**colors.ts** - 统一颜色系统
```typescript
export const COLORS = {
  // Primary Palette (橙色系)
  primary: {
    main: '#FF6B35',      // 主橙色
    light: '#FF8F5F',
    dark: '#E64A19',
    contrast: '#FFFFFF',
  },
  // Accent Palette (强调色)
  accent: {
    main: '#FFC274',      // 金色强调
    light: '#FFD699',
    dark: '#FF9800',
  },
  // Background (背景色)
  background: {
    default: '#FFF9F5',   // 暖白色背景
    paper: '#FFFFFF',
    elevated: '#FFFBF7',  // 卡片悬浮背景
  },
  // Semantic (语义色)
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#FF6B35',

  // Grayscale (灰度)
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Gradients (渐变)
  gradients: {
    primary: 'linear-gradient(135deg, #FF6B35 0%, #FFC274 100%)',
    card: 'linear-gradient(135deg, rgba(255,107,53,0.08) 0%, rgba(255,194,116,0.05) 100%)',
    cardHover: 'linear-gradient(135deg, rgba(255,107,53,0.12) 0%, rgba(255,194,116,0.08) 100%)',
  },
} as const;
```

**spacing.ts** - 统一间距系统
```typescript
export const SPACING = {
  // Base spacing (8px grid)
  base: 8,

  // Padding (内边距)
  padding: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40,
    xxl: 48,
  },

  // Margin (外边距)
  margin: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40,
    xxl: 48,
  },

  // Section spacing (页面区块间距)
  section: {
    top: 64,         // 页面顶部间距
    bottom: 64,      // 页面底部间距
    between: 48,     // 区块之间间距
  },

  // Component spacing (组件内间距)
  component: {
    tiny: 4,
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 24,
  },
} as const;
```

**typography.ts** - 扩展字体层级
```typescript
export const TYPOGRAPHY = {
  // Font families
  fontFamily: {
    primary: "'Inter', -apple-system, sans-serif",
    secondary: "'Source Serif Pro', serif",
    mono: "'Fira Code', monospace",
  },

  // Font weights
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Font sizes (with responsive breakpoints)
  fontSize: {
    display: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },     // 大标题
    headline: { xs: '2rem', sm: '2.5rem', md: '3rem' },      // 页面标题
    title: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },      // 区块标题
    subtitle: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem' },
    body: { xs: '1rem', sm: '1rem', md: '1.125rem' },
    bodySmall: '0.875rem',
    caption: '0.75rem',
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;
```

**shadows.ts** - 统一阴影系统
```typescript
export const SHADOWS = {
  // Card shadows
  card: '0 2px 8px rgba(255, 107, 53, 0.08)',
  cardHover: '0 8px 24px rgba(255, 107, 53, 0.16)',
  cardActive: '0 12px 32px rgba(255, 107, 53, 0.24)',

  // Button shadows
  button: 'none',
  buttonHover: '0 4px 12px rgba(255, 107, 53, 0.24)',

  // Modal shadows
  modal: '0 24px 48px rgba(0, 0, 0, 0.24)',

  // Elevation levels (Material Design 3)
  elevation: {
    0: 'none',
    1: '0 1px 3px rgba(0,0,0,0.12)',
    2: '0 2px 6px rgba(0,0,0,0.14)',
    3: '0 4px 12px rgba(0,0,0,0.16)',
    4: '0 8px 24px rgba(0,0,0,0.18)',
    5: '0 16px 48px rgba(0,0,0,0.20)',
  },
} as const;
```

**radius.ts** - 统一圆角系统
```typescript
export const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;
```

#### 任务 1.2：扩展 MUI Theme（1天）

**src/design/theme.ts** - 完整版主题配置
```typescript
import { createTheme } from '@mui/material/styles';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from './tokens';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    display: React.CSSProperties;
    headline: React.CSSProperties;
    title: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    display?: React.CSSProperties;
    headline?: React.CSSProperties;
    title?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    display: true;
    headline: true;
    title: true;
  }
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: COLORS.primary.main,
      light: COLORS.primary.light,
      dark: COLORS.primary.dark,
      contrastText: COLORS.primary.contrast,
    },
    // ... 其他 palette 配置
  },

  typography: {
    fontFamily: TYPOGRAPHY.fontFamily.primary,

    // 扩展 variants
    display: {
      fontSize: TYPOGRAPHY.fontSize.display.md,
      fontWeight: TYPOGRAPHY.fontWeight.extrabold,
      lineHeight: TYPOGRAPHY.lineHeight.tight,
      '@media (max-width:600px)': {
        fontSize: TYPOGRAPHY.fontSize.display.xs,
      },
    },
    headline: {
      fontSize: TYPOGRAPHY.fontSize.headline.md,
      fontWeight: TYPOGRAPHY.fontWeight.bold,
      lineHeight: TYPOGRAPHY.lineHeight.tight,
      '@media (max-width:600px)': {
        fontSize: TYPOGRAPHY.fontSize.headline.xs,
      },
    },
    title: {
      fontSize: TYPOGRAPHY.fontSize.title.md,
      fontWeight: TYPOGRAPHY.fontWeight.semibold,
      lineHeight: TYPOGRAPHY.lineHeight.normal,
      '@media (max-width:600px)': {
        fontSize: TYPOGRAPHY.fontSize.title.xs,
      },
    },
    // ... 其他 variants
  },

  shape: {
    borderRadius: RADIUS.md,
  },

  spacing: SPACING.base,

  components: {
    // 全局 Button 配置
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.md,
          padding: `${SPACING.padding.sm}px ${SPACING.padding.lg}px`,
          textTransform: 'none',
          fontWeight: TYPOGRAPHY.fontWeight.semibold,
        },
        contained: {
          boxShadow: SHADOWS.button,
          '&:hover': {
            boxShadow: SHADOWS.buttonHover,
          },
        },
      },
    },

    // 全局 Card 配置
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.lg,
          boxShadow: SHADOWS.card,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: SHADOWS.cardHover,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
  },
});
```

#### 任务 1.3：创建原子组件（2天）

**1. PageShell** - 页面骨架组件
```typescript
// src/components/layout/PageShell.tsx
import { Container, Box, Typography } from '@mui/material';
import { SPACING } from '@/design/tokens';
import { Navigation } from './Navigation';

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  sidePanel?: React.ReactNode;
}

export function PageShell({ title, subtitle, children, maxWidth = 'xl', sidePanel }: PageShellProps) {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navigation />

      <Container maxWidth={maxWidth} sx={{
        pt: SPACING.section.top / 8,
        pb: SPACING.section.bottom / 8,
        px: { xs: 2, sm: 3 },
      }}>
        {/* Header */}
        <Box sx={{ mb: SPACING.section.between / 8, textAlign: 'center' }}>
          <Typography variant="headline" color="primary" sx={{ mb: 2 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="subtitle1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Main content with optional side panel */}
        {sidePanel ? (
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
            <Box sx={{ flex: 1 }}>{children}</Box>
            <Box sx={{ width: { lg: 320 } }}>{sidePanel}</Box>
          </Box>
        ) : (
          children
        )}
      </Container>
    </Box>
  );
}
```

**2. StyledCard** - 统一卡片组件
```typescript
// src/components/common/StyledCard.tsx
import { Card, CardProps } from '@mui/material';
import { RADIUS, SPACING, SHADOWS, COLORS } from '@/design/tokens';

type CardSize = 'sm' | 'md' | 'lg';
type CardVariant = 'default' | 'primary' | 'elevated' | 'outlined';

interface StyledCardProps extends Omit<CardProps, 'variant'> {
  size?: CardSize;
  variant?: CardVariant;
  hover?: boolean;
}

export function StyledCard({
  size = 'md',
  variant = 'default',
  hover = true,
  children,
  sx,
  ...props
}: StyledCardProps) {
  // ... 实现代码
}
```

**3. SectionHeader** - 区块标题组件
**4. PrimaryButton** - 统一按钮组件

---

### 第 2 周：重构高流量页面

#### 任务 2.1：重构 Swap 页面（2天）

**Before (硬编码):**
```typescript
<Box sx={{ height: { xs: 40, sm: 60 } }} />
<Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
  <CardContent sx={{ p: 3 }}>
    <Typography variant="h5" sx={{ fontWeight: 700, color: '#ff6b00', mb: 2 }}>
      Swap Tokens
    </Typography>
  </CardContent>
</Card>
```

**After (使用 Design System):**
```typescript
import { PageShell, SectionHeader, StyledCard } from '@/components';

export default function LiquidityPage() {
  return (
    <PageShell
      title="Liquidity Hub"
      subtitle="Swap tokens, provide liquidity, and earn rewards"
    >
      <SectionHeader title="Swap Tokens" />
      <StyledCard size="lg" variant="primary">
        <SwapCard />
      </StyledCard>
    </PageShell>
  );
}
```

#### 任务 2.2：重构 Borrow (USDP Hub) 页面（2天）
#### 任务 2.3：重构 Vote (Governance) 页面（1天）

---

### 第 3 周：重构中低流量页面

#### 任务 3.1：重构 Portfolio 页面（2天）
#### 任务 3.2：重构 Launchpad 页面（2天）
#### 任务 3.3：重构 Presale/Nitro 页面（1天）

---

### 第 4 周：优化与文档

#### 任务 4.1：统一图表样式（2天）
#### 任务 4.2：创建 Storybook 文档（2天）
#### 任务 4.3：性能优化与测试（1天）

---

## 📁 最终文件结构

```
src/
├── design/                  # Design System 核心
│   ├── tokens/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   ├── shadows.ts
│   │   ├── radius.ts
│   │   └── index.ts
│   └── theme.ts             # 扩展 MUI theme
│
├── components/
│   ├── layout/              # 布局组件
│   │   ├── PageShell.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── Navigation.tsx
│   │   └── SubNavigation.tsx
│   │
│   ├── common/              # 原子组件
│   │   ├── StyledCard.tsx
│   │   ├── PrimaryButton.tsx
│   │   ├── SecondaryButton.tsx
│   │   ├── Badge.tsx
│   │   └── ...
│   │
│   └── [feature]/           # 业务组件 (继承原子组件)
│
└── app/                     # 页面 (使用 PageShell + 业务组件)
```

---

## ✅ 成功指标 (KPIs)

| 指标 | 当前 | 目标 | 测量方式 |
|------|------|------|----------|
| 硬编码颜色 | 31+ | 0 | `grep -r "#FF" src/` |
| 内联 sx | 451 | <50 | `grep -r "sx={{" src/` |
| 重复 whitespace | 20+ | 0 | 统一使用 PageShell |
| Card 样式一致性 | 混乱 | 100% | 所有使用 StyledCard |
| Typography 层级 | 3 (h1-h3) | 7+ | display/headline/title/subtitle/body/caption |
| Lighthouse 分数 | ? | >90 | Chrome DevTools |
| 组件复用率 | 低 | 高 | Storybook 文档覆盖率 |

---

## 🚀 执行建议

**1. 创建专门的 feature 分支**
```bash
git checkout -b feat/design-system-refactor
```

**2. 逐步迁移策略**
- Week 1: 建立基础设施（Tokens + Theme + 原子组件）
- Week 2: 迁移高流量页面（Swap, Borrow, Vote）
- Week 3: 迁移剩余页面
- Week 4: 优化 + 文档 + 发布

**3. Code Review Checklist**
- [ ] 所有颜色来自 `COLORS` token
- [ ] 所有间距来自 `SPACING` token
- [ ] 所有 Card 使用 `StyledCard`
- [ ] 所有页面使用 `PageShell`
- [ ] 无内联硬编码 sx 样式
- [ ] Typography 使用 variant (display/headline/title)

---

## 📝 相关文档

- **原始需求**: 详见 GitHub Issue/讨论记录
- **设计规范**: Material Design 3 + Camelot/Velodrome 风格参考
- **实施进度**: 见项目看板 (TODO/In Progress/Done)

---

**创建日期**: 2025-11-07
**负责人**: Frontend Team
**预计完成**: 4周
**优先级**: P0 (高优先级)
