# Bond Doge Mascot Assets

This directory contains Bond Doge (Shiba Inu) mascot illustrations for the Paimon DEX Bond NFT Presale.

## Current Status

⚠️ **PLACEHOLDER FILES** - These are simple SVG placeholders for development and testing.

The current files are geometric shapes representing the 10 Bond Doge expressions:
- happy.svg
- sad.svg
- shocked.svg
- neutral.svg
- thinking.svg
- rich.svg
- celebrating.svg
- waving.svg
- sleeping.svg
- dancing.svg

## Next Steps

Professional designer should replace these placeholder files with:
- ✅ Polished Shiba Inu character illustrations
- ✅ Business suit outfit (tie, jacket)
- ✅ Consistent character design across all expressions
- ✅ Material Design 3 warm color palette
- ✅ SVG format (vector graphics)
- ✅ 1000x1000px canvas size

## Design Specification

Full design specifications available in:
```
.ultra/docs/design/BOND-DOGE-MASCOT-SPEC.md
```

## Usage in Code

```typescript
import { BondDogeAvatar } from '@/components/presale/BondDogeAvatar';
import { BondDogeExpression } from '@/types/bondDoge';

// Example 1: Show happy Bond Doge
<BondDogeAvatar
  expression={BondDogeExpression.HAPPY}
  size={200}
  showLabel={true}
  animate={true}
/>

// Example 2: Dynamic expression based on dice roll
import { getBondDogeExpressionForDiceRoll } from '@/types/bondDoge';

const expression = getBondDogeExpressionForDiceRoll(rollResult, 'diamond');
<BondDogeAvatar expression={expression} size={150} />
```

## Integration Points

1. **Dice Rolling Page** - Display expression based on roll result
2. **Bond Dashboard** - Show rarity-based expression
3. **Settlement Page** - Display "thinking" or "celebrating"
4. **Referral System** - Show "waving" for invites
5. **Leaderboards** - Show "dancing" for top 3 users

## File Requirements

- **Format**: SVG (primary), PNG (fallback)
- **Size**: <500KB per SVG file
- **Dimensions**: 1000x1000px (1:1 ratio)
- **Background**: Transparent
- **Naming**: Lowercase, no spaces (e.g., `happy.svg`)

## Designer Contact

See task **PRESALE-016** in `.ultra/tasks/tasks.json` for delivery details.
