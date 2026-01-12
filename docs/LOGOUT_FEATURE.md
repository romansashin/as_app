# Logout Feature

## Overview

Logout functionality for proper user session termination.

## Why This Feature?

1. **Security** - User can logout on shared/public devices
2. **Account Switching** - Ability to login with different Google/Yandex account
3. **Session Management** - Control over active sessions
4. **UX** - Standard practice in web applications

## Implementation

### Backend (`server/server.js`)

Route `/auth/logout` available always (even in DEV mode):

```javascript
fastify.post('/auth/logout', async (request, reply) => {
  try {
    if (request.user) {
      request.logout(); // Passport logout
    }
    if (request.session) {
      request.session.delete(); // Delete session
    }
    return { success: true };
  } catch (error) {
    fastify.log.error('Logout error:', error);
    return { success: true }; // Still consider successful
  }
});
```

**Important:**
- Route moved out of `setupAuthRoutes()` to work without OAuth
- Safe error handling
- Session cleanup via `request.session.delete()`
- Passport logout to clear user

### Frontend API (`client/src/utils/api.js`)

Added `logout()` function:

```javascript
export const logout = async () => {
  const url = `${API_URL}/auth/logout`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include', // Important for cookies
    });
    
    if (!response.ok) {
      throw new Error(`Failed to logout: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};
```

### Header Component (`client/src/components/Header.jsx`)

New component for displaying user info and logout button:

**Functionality:**
- ✅ Loads user data via `/api/me`
- ✅ Shows user email
- ✅ "Logout" button with icon
- ✅ Automatically hidden on `/login` page
- ✅ Not shown in DEV mode (when no OAuth)
- ✅ Redirects to `/login` after logout

**Appearance:**
```
┌─────────────────────────────────────────┐
│ 👤 user@email.com        🚪 Logout      │
└─────────────────────────────────────────┘
```

### DEV Mode Support

Header shown in DEV mode with visual distinction:

```
┌─────────────────────────────────────────┐
│ 👤 [DEV] Test user       🚪 Logout      │
└─────────────────────────────────────────┘
```

**Features:**
- Yellow "DEV" badge for visual distinction
- Text "Test user" instead of email
- "Logout" button works (reloads page in DEV)
- Automatic mode detection (401 from `/api/me`)

## User Flow

### Production Mode

1. User clicks "Logout" button in Header
2. Frontend → `POST /auth/logout`
3. Backend cleans up session
4. Backend → `{ success: true }`
5. Frontend redirects to `/login`
6. User sees login page

### DEV Mode

1. User clicks "Logout" button in Header
2. Frontend → `POST /auth/logout`
3. Backend → `{ success: true }`
4. Frontend reloads page (`window.location.reload()`)
5. User continues using app (no auth required)

## Progress Preservation

**Important:** User progress is tied to `user_id` in database, not to session.

- ✅ Logout does NOT delete progress
- ✅ Progress accessible from any device after re-login
- ✅ Account switch shows different progress
- ✅ Data persists even after logout

## Security

### Session Cleanup

- `request.logout()` - Passport clears user from session
- `request.session.delete()` - Complete session deletion
- httpOnly cookies - XSS protection
- Secure flag in production - HTTPS only

### CORS

- Configured for specific FRONTEND_URL
- Credentials: 'include' for cookie transmission
- Protection against CSRF attacks

## Testing

### Manual Test - Production

1. Login with Google/Yandex
2. Verify email shown in Header
3. Listen to practice - progress recorded
4. Click "Logout"
5. Verify redirect to `/login`
6. Login again - progress should be preserved

### Manual Test - DEV Mode

1. Start app in DEV mode (no OAuth)
2. Verify "[DEV] Test user" shown in Header
3. Listen to practice - progress recorded
4. Click "Logout"
5. Verify page reloads
6. Progress should be preserved

## Known Limitations

1. **Independent Sessions**
   - Logout on one device doesn't affect other devices
   - Each device has its own session

2. **DEV Mode**
   - All users work under `user_id = 1`
   - Progress shared between all DEV sessions

3. **No Confirmation**
   - Clicking "Logout" immediately executes
   - No "Are you sure?" dialog

## Future Improvements

- [ ] "Logout everywhere" (terminate all sessions)
- [ ] Active sessions list
- [ ] Logout confirmation dialog
- [ ] Session timeout settings

---

**Version:** 1.2.0  
**Status:** Production Ready
