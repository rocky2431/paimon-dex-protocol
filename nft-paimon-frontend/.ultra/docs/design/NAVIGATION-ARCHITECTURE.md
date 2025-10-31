# Frontend Navigation Architecture

**Created**: 2025-10-26
**Status**: Proposal for Implementation

---

## Current Problem

Many functional pages lack clear entry points in the navigation system. Users can only access them by manually typing URLs.

**Pages without navigation entry**:
- `/rewards` - Rewards Dashboard
- `/bribes` - Bribes Marketplace
- `/analytics` - Analytics Dashboard
- `/presale/mint` - Bond NFT Minting
- `/presale/dice` - Dice Rolling Game
- `/liquidity/remove` - Remove Liquidity
- `/liquidity/stake` - Stake LP Tokens

---

## Proposed Navigation Architecture

### 1. Main Navigation Bar (Top)

**Location**: All pages
**Component**: `<Navigation />`

```
[Paimon DEX Logo] | Swap | Liquidity | Lock | Vote | [Presale ▼] | [More ▼] | [🔔] | [Connect Wallet]
```

**Links**:
- **Swap** → `/` (current ✅)
- **Liquidity** → `/liquidity/add` (current ✅)
- **Lock** → `/lock` (current ✅)
- **Vote** → `/vote` (current ✅)
- **Presale** → Dropdown menu (new ⚠️)
  - Mint Bond NFT → `/presale/mint`
  - Dice Rolling → `/presale/dice`
- **More** → Dropdown menu (new ⚠️)
  - Analytics → `/analytics`

---

### 2. Vote Page Sub-Navigation

**Location**: `/vote` page only
**Design**: Tab navigation below VotingCard title

```
┌─────────────────────────────────────────┐
│ Vote for Gauges | My Rewards | Bribes  │ ← Tab Navigation
├─────────────────────────────────────────┤
│                                         │
│         [Voting Interface]              │
│                                         │
└─────────────────────────────────────────┘
```

**Tabs**:
1. **Vote for Gauges** → Current voting interface
2. **My Rewards** → `/rewards` (Rewards Dashboard)
3. **Bribes** → `/bribes` (Bribes Marketplace)

**Rationale**: These 3 features are closely related in the ve33 governance model.

---

### 3. Liquidity Page Sub-Navigation

**Location**: All `/liquidity/*` pages
**Design**: Tab navigation at page top

```
┌─────────────────────────────────────────┐
│ Add | Remove | Stake | My Positions    │ ← Tab Navigation
├─────────────────────────────────────────┤
│                                         │
│      [Liquidity Interface]              │
│                                         │
└─────────────────────────────────────────┘
```

**Tabs**:
1. **Add** → `/liquidity/add` (current ✅)
2. **Remove** → `/liquidity/remove` (new entry ⚠️)
3. **Stake** → `/liquidity/stake` (new entry ⚠️)
4. **My Positions** → New page showing all LP positions

**Rationale**: Liquidity management is a complete workflow: Add → Stake → Remove.

---

### 4. Notification Bell (Optional)

**Location**: Top right of navigation bar
**Icon**: 🔔 Bell icon
**Function**: Show unclaimed rewards, pending votes, new bribes, etc.

---

## Implementation Priority

### Phase 1: Critical (Required for MVP)
1. ✅ Main navigation component created (`Navigation.tsx`)
2. ⚠️ Add Presale dropdown to main navigation
3. ⚠️ Add Liquidity tab navigation (`/liquidity/add`, `/remove`, `/stake`)
4. ⚠️ Add Vote tab navigation (`/vote`, `/rewards`, `/bribes`)

### Phase 2: Enhancement
5. Add "More" dropdown with Analytics link
6. Create "My Positions" page for LP tracking
7. Add notification bell with real-time updates

### Phase 3: Polish
8. Add breadcrumb navigation for deep pages
9. Mobile responsive hamburger menu
10. Search functionality for gauges/pools

---

## Component Structure

```
components/
├── layout/
│   ├── Navigation.tsx              ← Main nav bar (done ✅)
│   ├── NavigationDropdown.tsx      ← Dropdown menu (new)
│   ├── LiquidityTabs.tsx           ← Liquidity sub-nav (new)
│   └── VoteTabs.tsx                ← Vote sub-nav (new)
```

---

## Example: Vote Page with Tabs

```typescript
// /app/vote/page.tsx
import { Navigation } from '@/components/layout/Navigation';
import { VoteTabs } from '@/components/layout/VoteTabs';

export default function VotePage() {
  return (
    <Box>
      <Navigation activePage="vote" />
      <Container>
        <VoteTabs activeTab="vote" />
        <VotingCard />
      </Container>
    </Box>
  );
}
```

```typescript
// /app/rewards/page.tsx
import { Navigation } from '@/components/layout/Navigation';
import { VoteTabs } from '@/components/layout/VoteTabs';

export default function RewardsPage() {
  return (
    <Box>
      <Navigation activePage="vote" />
      <Container>
        <VoteTabs activeTab="rewards" />
        <RewardsDashboard />
      </Container>
    </Box>
  );
}
```

---

## User Flow Examples

### Flow 1: Vote → View Rewards → Claim
1. User clicks **Vote** in main nav
2. User sees tab navigation: `Vote | My Rewards | Bribes`
3. User clicks **My Rewards** tab
4. User lands on `/rewards` showing RewardsDashboard
5. User claims rewards

### Flow 2: Add Liquidity → Stake LP
1. User clicks **Liquidity** in main nav
2. User sees tab navigation: `Add | Remove | Stake | My Positions`
3. User is on **Add** tab, adds liquidity
4. After adding, tab switches to **Stake** tab automatically
5. User stakes the newly minted LP tokens

### Flow 3: Mint NFT → Roll Dice
1. User clicks **Presale** dropdown in main nav
2. Dropdown shows: `Mint Bond NFT` | `Dice Rolling`
3. User clicks **Mint Bond NFT** → `/presale/mint`
4. After minting, a banner appears: "✅ NFT Minted! [Roll Dice →]"
5. User clicks banner link → `/presale/dice`

---

## Next Steps

1. **Create VoteTabs component** - Tab navigation for Vote/Rewards/Bribes
2. **Create LiquidityTabs component** - Tab navigation for Add/Remove/Stake
3. **Add Presale dropdown** to main Navigation component
4. **Update all affected pages** to include tab navigation
5. **Add analytics tracking** for navigation usage

---

**Estimated Implementation Time**: 4-6 hours

**Blockers**: None

**Dependencies**: Material-UI Tabs component

---

## Design Mockup

```
┌────────────────────────────────────────────────────────────────┐
│ [Paimon DEX] Swap Liquidity Lock Vote [Presale▼] [More▼] [💰] │ ← Main Nav
└────────────────────────────────────────────────────────────────┘

If on /vote or /rewards or /bribes:
┌────────────────────────────────────────────────────────────────┐
│  [Vote for Gauges]  [My Rewards]  [Bribes]                     │ ← Sub Nav Tabs
└────────────────────────────────────────────────────────────────┘

If on /liquidity/* pages:
┌────────────────────────────────────────────────────────────────┐
│  [Add]  [Remove]  [Stake]  [My Positions]                      │ ← Sub Nav Tabs
└────────────────────────────────────────────────────────────────┘
```

---

**Approved By**: Pending
**Implementation**: Ready to start
