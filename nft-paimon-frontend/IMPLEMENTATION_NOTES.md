# Task 15 - Social Login UI Integration - Implementation Notes

## Implementation Date
2025-11-15

## Overview
Integrated Reown AppKit social login (Email, Google, X) with the existing authentication system using a unified wallet signature approach.

## Key Design Decision: Wallet Signature Flow vs OAuth Token Flow

### Why Wallet Signature Instead of OAuth?

Reown AppKit's social login creates **smart wallet addresses** for users, not traditional OAuth tokens. This means:

1. **Email/Google/X login** → AppKit creates an embedded smart wallet
2. **User gets a blockchain address** (e.g., `0x1234...`)
3. **No OAuth access tokens** are provided by AppKit

Therefore, we use the **same wallet signature authentication flow** for both:
- Traditional wallet users (MetaMask, Binance Wallet, WalletConnect)
- Social login users (Email, Google, X)

### Benefits of This Approach

✅ **Unified Authentication**: Single codebase for all login methods
✅ **Blockchain-Native**: All users are authenticated via wallet signatures
✅ **Secure**: No OAuth token handling vulnerabilities
✅ **Seamless UX**: Social login users don't see "sign message" as a separate step

## Authentication Flow

### Step 1: Wallet Connection
```typescript
// User clicks "Connect Wallet" → Reown AppKit modal opens
// Option A: User connects MetaMask/Binance/WalletConnect
// Option B: User logs in with Email/Google/X → AppKit creates smart wallet
```

### Step 2: Auto-Login Trigger
```typescript
useEffect(() => {
  if (isConnected && address && !authState.isAuthenticated) {
    login().catch((error) => {
      console.error('Auto-login failed:', error);
    });
  }
}, [isConnected, address]);
```

### Step 3: Wallet Signature Authentication
```typescript
// 1. Get nonce from backend
const nonce = await fetch('/api/auth/nonce?address=0x1234...');

// 2. Sign message with wallet
const message = `Sign this message to login to Paimon DEX.\n\nNonce: ${nonce}`;
const signature = await signMessageAsync({ message });

// 3. Send signature to backend
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ address, message, signature, nonce })
});

// 4. Receive JWT tokens
const { access_token, refresh_token, token_type } = await response.json();
```

### Step 4: Token Storage
```typescript
// Access token → localStorage (for API calls)
localStorage.setItem('access_token', tokens.accessToken);

// Refresh token → httpOnly cookie (backend sets automatically)
// Stored via `credentials: 'include'` in fetch options
```

### Step 5: Extract Social Login Email (Optional)
```typescript
// For social login users, extract email from embedded wallet info
const { embeddedWalletInfo } = useAppKitAccount();
const email = embeddedWalletInfo?.user?.email || null;

// Store in auth state for display purposes
setAuthState({ ...authState, email });
```

## File Changes

### Created Files
- **`src/hooks/useAuth.ts`**: Core authentication hook

### Hook API
```typescript
const {
  isAuthenticated,  // boolean - Is user logged in?
  isLoading,        // boolean - Is login in progress?
  address,          // string | null - User's wallet address
  email,            // string | null - User's email (social login only)
  tokens,           // AuthTokens | null - JWT tokens
  error,            // string | null - Error message
  login,            // () => Promise<void> - Manual login (auto-login is default)
  logout,           // () => void - Logout user
} = useAuth();
```

## Backend Integration

### Expected API Endpoints
1. **GET `/api/auth/nonce?address={address}`**
   Returns: `{ "nonce": "a1b2c3d4..." }`

2. **POST `/api/auth/login`**
   Body: `{ address, message, signature, nonce }`
   Returns: `{ "access_token": "eyJ...", "refresh_token": "eyJ...", "token_type": "bearer" }`

### Backend Verification Flow
```python
# 1. Verify nonce is valid and not expired
# 2. Recover signer address from (message, signature)
# 3. Verify recovered address == claimed address
# 4. Generate JWT tokens
# 5. Set refresh token as httpOnly cookie
# 6. Return access token in response body
```

## Security Considerations

### ✅ Implemented
- Nonce prevents replay attacks
- Wallet signature proves address ownership
- Refresh token stored in httpOnly cookie (XSS protection)
- Auto-logout on wallet disconnect

### ⚠️ Future Enhancements
- Token refresh mechanism (when access token expires)
- Rate limiting on nonce generation
- CSRF protection for token refresh endpoint

## Testing Checklist

### Manual Testing
- [ ] Email login → auto-login works
- [ ] Google login → auto-login works
- [ ] X login → auto-login works
- [ ] MetaMask wallet → auto-login works
- [ ] Binance Wallet → auto-login works
- [ ] WalletConnect → auto-login works
- [ ] Logout → clears tokens
- [ ] Wallet disconnect → auto-logout

### Unit Tests (Future)
- [ ] `getNonce()` handles network errors
- [ ] `login()` throws error when wallet not connected
- [ ] `logout()` clears localStorage
- [ ] Auto-login triggers on wallet connection
- [ ] Auto-logout triggers on wallet disconnection

## Known Limitations

1. **No Token Refresh**: Access token stored in localStorage will expire after 24 hours (backend default). User must reconnect wallet to get new token.
   - **Future Fix**: Implement token refresh using refresh token from httpOnly cookie

2. **No Social Login Backend Endpoint**: Backend has `/api/auth/social` endpoint, but we don't use it because AppKit doesn't provide OAuth tokens.
   - **Status**: Not an issue, wallet signature flow works for all login types

3. **Email Extraction**: Social login email is extracted from `embeddedWalletInfo` which may not be available in all AppKit versions.
   - **Fallback**: Email is optional, authentication works without it

## References

- **Reown AppKit Docs**: https://docs.reown.com/appkit/react/core/installation
- **wagmi Hooks**: https://wagmi.sh/react/hooks
- **Backend Auth API**: `paimon-backend/app/routers/auth.py`
