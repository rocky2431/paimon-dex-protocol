# Bond Doge Mascot - Design Specification

**Version**: 1.0
**Created**: 2025-10-27
**Target**: Professional Designer / Illustrator
**Purpose**: Create custom Bond Doge (Shiba Inu) mascot artwork for Paimon DEX Presale

---

## 📋 Overview

**Bond Doge** is the official mascot of Paimon DEX's Bond NFT Presale system. The character is a **Shiba Inu dog in a business suit**, representing the professional yet playful nature of DeFi investment.

### Character Concept
- **Species**: Shiba Inu (柴犬)
- **Personality**: Professional, friendly, optimistic, lucky
- **Outfit**: Business suit (tie, jacket) - represents "Bond" in RWA Bond NFT
- **Style**: Modern, clean, memeable (think Dogecoin/Shiba Inu memes but professional)
- **Color Palette**: Warm tones (Material Design 3 compliant)
  - Primary: Orange (#FF6B35), Amber (#FFB74D)
  - Accent: Gold (#FFD700), Green (#8BC34A)
  - Avoid: Blue, Purple (except for specific expressions)

---

## 🎨 Required Expressions (10)

Each expression should be a complete illustration of Bond Doge with full body (or bust), showing the suit and characteristic Shiba Inu features.

### 1. **Happy** 😊
- **Use Case**: High dice roll (result > 10 on Gold Dice, result = 6 on Normal Dice)
- **Expression**: Big smile, bright eyes, ears perked up
- **Body Language**: Paws raised in celebration
- **Color Theme**: Green (#8BC34A) - success/profit
- **Props**: None
- **Mood**: Excited, victorious

### 2. **Sad** 😢
- **Use Case**: Low dice roll (result < 3)
- **Expression**: Droopy eyes, downturned mouth, ears slightly down
- **Body Language**: Slouched shoulders
- **Color Theme**: Gray (#9E9E9E) - disappointment
- **Props**: Small tear drop (optional)
- **Mood**: Disappointed but not defeated

### 3. **Shocked** 😲
- **Use Case**: Natural 20 on Diamond Dice (jackpot roll)
- **Expression**: Wide eyes, open mouth (O-shape), ears straight up
- **Body Language**: Slightly leaning back, paws near face
- **Color Theme**: Orange (#FF9800) with gold sparkles
- **Props**: Lightning bolts, sparkles around head
- **Mood**: Amazed, can't believe the luck

### 4. **Neutral** 😐
- **Use Case**: Default state, before rolling, waiting
- **Expression**: Calm eyes, slight smile, ears at normal position
- **Body Language**: Standing straight, professional pose
- **Color Theme**: Amber (#FFB74D) - standard warm tone
- **Props**: None
- **Mood**: Professional, ready for business

### 5. **Thinking** 🤔
- **Use Case**: Settlement decision page (choosing between veNFT or Cash)
- **Expression**: Eyes looking up/to side, slight frown, one ear tilted
- **Body Language**: Paw on chin (thinking pose)
- **Color Theme**: Purple (#9C27B0) - decision-making
- **Props**: Thought bubble with "?" symbol
- **Mood**: Contemplative, analytical

### 6. **Rich** 🤑
- **Use Case**: Legendary rarity tier (≥8 USDC Remint)
- **Expression**: Big grin, eyes as dollar signs ($), ears up
- **Body Language**: Confident stance, chest out
- **Color Theme**: Gold (#FFD700) - wealth
- **Props**: Crown, gold coins, sparkles, money bag
- **Mood**: Wealthy, successful, proud

### 7. **Celebrating** 🎉
- **Use Case**: Successful settlement (Bond NFT redeemed)
- **Expression**: Eyes closed (happy), wide smile, ears up
- **Body Language**: Dancing pose, arms raised
- **Color Theme**: Orange (#FF6B35) with confetti
- **Props**: Party hat, confetti, balloons (optional)
- **Mood**: Joyful, celebratory, accomplished

### 8. **Waving** 👋
- **Use Case**: Referral system (invite friends)
- **Expression**: Friendly smile, one eye winking (optional), ears normal
- **Body Language**: One paw raised in waving gesture
- **Color Theme**: Coral (#FF8A65) - friendly
- **Props**: None
- **Mood**: Welcoming, friendly, inviting

### 9. **Sleeping** 😴
- **Use Case**: Bond not yet matured (before 90 days)
- **Expression**: Closed eyes, peaceful smile, ears relaxed
- **Body Language**: Lying down or sitting with head tilted
- **Color Theme**: Taupe (#BCAAA4) - calm/rest
- **Props**: Sleep cap, "Zzz" symbols, pillow (optional)
- **Mood**: Patient, resting, waiting

### 10. **Dancing** 💃
- **Use Case**: Leaderboard top 3 position
- **Expression**: Excited eyes, open mouth (singing/cheering), ears bouncing
- **Body Language**: Dynamic dance pose, one leg lifted
- **Color Theme**: Orange (#FF6B35) with gold accents
- **Props**: Trophy, musical notes (♪♫), spotlight
- **Mood**: Competitive, energetic, victorious

---

## 📐 Technical Specifications

### File Format
- **Primary**: SVG (scalable vector graphics)
- **Fallback**: PNG (transparent background, 1000x1000px minimum)
- **Optional**: WebP (for web optimization)

### Dimensions
- **Canvas Size**: 1000x1000px (1:1 ratio)
- **Safe Area**: 900x900px (50px margin on all sides)
- **Character Size**: Should occupy 70-80% of canvas
- **File Size**: <500KB per file (SVG), <200KB (PNG)

### File Naming Convention
```
happy.svg / happy.png
sad.svg / sad.png
shocked.svg / shocked.png
neutral.svg / neutral.png
thinking.svg / thinking.png
rich.svg / rich.png
celebrating.svg / celebrating.png
waving.svg / waving.png
sleeping.svg / sleeping.png
dancing.svg / dancing.png
```

### Directory Structure
```
frontend/public/images/bond-doge/
├── happy.svg
├── sad.svg
├── shocked.svg
├── neutral.svg
├── thinking.svg
├── rich.svg
├── celebrating.svg
├── waving.svg
├── sleeping.svg
└── dancing.svg
```

---

## 🎯 Design Guidelines

### Character Anatomy
1. **Head**: Classic Shiba Inu features
   - Triangular ears
   - Round face
   - Black button nose
   - Expressive eyes (large, anime-style acceptable)
   - Cream/beige fur color with white chest

2. **Body**: Wearing business suit
   - Dark suit jacket (navy, charcoal, or black)
   - White dress shirt
   - Necktie (color can match expression theme)
   - Optional: Vest, pocket square

3. **Paws**: Four-fingered (cartoon style)
   - Can hold props
   - Expressive gestures

4. **Tail**: Shiba Inu curl
   - Can be incorporated into expressions (wagging, still, etc.)

### Color Requirements
- **Primary Character Colors**:
  - Fur: Cream/beige (#F5DEB3), White (#FFFFFF)
  - Suit: Navy (#1A237E), Charcoal (#424242)
  - Eyes: Dark brown (#3E2723)

- **Expression Theme Colors** (as defined above):
  - Use Material Design 3 warm palette
  - Avoid blue/purple except for specific expressions

### Style Reference
- **Inspiration**: Dogecoin, Shiba Inu memes, professional mascots
- **Quality**: Polished, professional (not hand-drawn/sketch style)
- **Consistency**: All 10 expressions should have consistent character design
- **Memeable**: Should work well in social media (Twitter, Discord)

---

## 🔗 Integration Points

### Frontend Components
1. **Dice Rolling Page** (`/presale/dice`)
   - Display: Happy (high roll), Sad (low roll), Shocked (nat 20), Neutral (default)

2. **Bond Dashboard** (`/presale/bonds`)
   - Display: Rich (Legendary rarity), Sleeping (before maturity), Neutral

3. **Settlement Page** (`/presale/settle/[tokenId]`)
   - Display: Thinking (decision), Celebrating (success)

4. **Referral System** (`/presale/tasks`)
   - Display: Waving (invite CTA)

5. **Leaderboards** (`/presale/leaderboards`)
   - Display: Dancing (top 3 winners)

### Code Integration
```typescript
// Example usage in React component
import Image from 'next/image';

<Image
  src="/images/bond-doge/happy.svg"
  alt="Happy Bond Doge"
  width={200}
  height={200}
/>
```

### Responsive Design
- Desktop: 200x200px typical display
- Mobile: 150x150px typical display
- Should remain clear and recognizable at smaller sizes

---

## 📦 Deliverables

### Phase 1: Concept Art (Optional)
- 3-5 initial concept sketches of Bond Doge character
- Color palette exploration
- Suit design variations

### Phase 2: Final Artwork (Required)
- 10 expressions as SVG files
- 10 expressions as PNG files (fallback)
- All files follow naming convention
- All files meet technical specifications

### Phase 3: Assets Pack (Optional)
- Meme templates (editable PSD/Figma)
- Social media banners featuring Bond Doge
- Animated GIF versions (for high-impact expressions)
- NFT collection artwork (5 rarity tiers)

---

## 📝 Usage Rights

- **Ownership**: Paimon DEX retains full commercial rights
- **Attribution**: Designer credit on website (optional)
- **Portfolio Use**: Designer may showcase work with permission
- **Modifications**: Paimon DEX may modify artwork as needed

---

## 🎨 Placeholder Reference

Current placeholder files are located in:
```
/frontend/public/images/bond-doge/*.svg
```

These are **simple geometric shapes** representing:
- Circle for head
- Ellipses for ears
- Basic features (eyes, nose, mouth)
- Expression-specific icons (crown, party hat, etc.)

**Designer should replace all placeholder files** with professional illustrations.

---

## 🚀 Timeline

- **Week 1**: Concept art review and approval
- **Week 2**: Final artwork delivery (10 expressions)
- **Week 3**: Revisions and asset pack (if requested)

---

## 📞 Contact

For questions or clarifications:
- **Project**: Paimon DEX Bond NFT Presale
- **Task ID**: PRESALE-016
- **Priority**: P2 (Nice-to-have, not blocking launch)
- **Delivery Format**: ZIP file or GitHub PR

---

## 🎯 Success Criteria

Artwork is considered complete when:
1. ✅ All 10 expressions delivered in SVG + PNG format
2. ✅ Files meet technical specifications (size, naming, dimensions)
3. ✅ Character design is consistent across all expressions
4. ✅ Colors follow Material Design 3 warm palette
5. ✅ Expressions are clearly distinguishable and appropriate for use cases
6. ✅ Artwork is memeable and shareable on social media
7. ✅ No copyright issues with reference materials

---

**Note to Designer**: The placeholder SVG files currently in the codebase are **intentionally simple**. Your professional artwork should be polished, detailed, and production-ready for a DeFi protocol launch. Think "Dogecoin meets Wall Street" aesthetic.

Good luck and have fun creating Bond Doge! 🐕💼
