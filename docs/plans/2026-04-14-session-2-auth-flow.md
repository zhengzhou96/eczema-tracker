# Session 2: Auth Flow + Authenticated Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the authentication flow with working login/signup/reset-password pages, session middleware, and authenticated app layout with bottom navigation.

**Architecture:** Supabase Auth with SSR session management. The middleware refreshes sessions on every request, and the app layout protects authenticated routes by redirecting unauthenticated users to login.

**Tech Stack:** Next.js 16 App Router, Supabase Auth (@supabase/ssr, @supabase/supabase-js), TypeScript, shadcn/ui components, Lucide icons.

---

## Current Status

Session 1 completed:
- ✅ Next.js 16 skeleton with App Router
- ✅ Supabase client configured (browser + server clients)
- ✅ Database schema with RLS policies
- ✅ Auth pages created (login, signup, reset-password)
- ✅ App layout with BottomNav and AppHeader
- ✅ Environment variables configured

**Session 2 is essentially complete.** The auth flow and layout are already implemented. This plan serves as verification and testing guidance.

---

### Task 1: Verify Auth Pages Implementation

**Files:**
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/(auth)/reset-password/page.tsx`
- `app/(auth)/layout.tsx`

- [ ] **Step 1: Review login page implementation**

Check that login page has:
- Email and password inputs with proper labels
- Loading state during submission
- Error message display for failed logins
- Link to signup page
- Link to reset-password page
- Redirect to `/dashboard` on success

- [ ] **Step 2: Review signup page implementation**

Check that signup page has:
- Email and password inputs with proper labels
- Password minimum length validation (8 chars)
- Loading state during submission
- Error message display
- Email confirmation message if email confirmation is enabled
- Redirect to `/dashboard` on immediate success
- Link back to login

- [ ] **Step 3: Review reset-password page implementation**

Check that reset-password page has:
- Email input
- Loading state
- Success message after sending reset email
- Proper `redirectTo` configuration
- Link back to login

- [ ] **Step 4: Commit verification**

```bash
git add .
git commit -m "feat: auth flow complete"
```

---

### Task 2: Verify Session Middleware

**Files:**
- `lib/supabase/middleware.ts`
- `middleware.ts` (needs to be created at root)

- [ ] **Step 1: Create root middleware file**

```typescript
// middleware.ts
import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Verify middleware is refreshing sessions**

The middleware should:
- Call `supabase.auth.getUser()` to refresh the session
- Propagate cookies correctly on both request and response

- [ ] **Step 3: Commit middleware**

```bash
git add middleware.ts
git commit -m "feat: add session middleware"
```

---

### Task 3: Verify Authenticated App Layout

**Files:**
- `app/(app)/layout.tsx`
- `components/bottom-nav.tsx`
- `components/app-header.tsx`

- [ ] **Step 1: Review app layout implementation**

Check that app layout:
- Fetches user session server-side
- Redirects to `/login` if not authenticated
- Renders AppHeader at top
- Renders BottomNav at bottom
- Wraps children with proper mobile-first max-width (480px)
- Has proper padding for bottom nav (pb-28 or similar)

- [ ] **Step 2: Review bottom navigation**

Check that BottomNav:
- Has 4 tabs: Log (/log), History (/history), Dashboard (/dashboard), Settings (/settings)
- Highlights active tab
- Uses Lucide icons (PencilLine, History, BarChart3, Settings)
- Is fixed at bottom with proper z-index
- Has safe-area-inset padding for mobile devices
- Uses pill-style active state with rounded-2xl

- [ ] **Step 3: Review app header**

Check that AppHeader:
- Shows "EczemaTrack" branding
- Displays user avatar/initial from email
- Links to Settings on avatar click
- Links to Dashboard on logo click
- Is sticky at top with border-bottom

- [ ] **Step 4: Commit layout verification**

```bash
git add .
git commit -m "feat: authenticated layout verified"
```

---

### Task 4: Test Authentication Flow End-to-End

**Test Steps:**

- [ ] **Step 1: Test signup flow**

```bash
pnpm dev
# Open http://localhost:3000/signup in browser
```

Test checklist:
- Enter email and password (8+ chars)
- Submit form
- Verify redirect to `/dashboard` OR email confirmation message
- Check Supabase Dashboard → Authentication → Users for new user

- [ ] **Step 2: Test login flow**

```bash
# Navigate to http://localhost:3000/login
```

Test checklist:
- Enter credentials
- Submit form
- Verify redirect to `/dashboard`
- Verify bottom nav appears
- Verify header shows user initial

- [ ] **Step 3: Test auth guard**

```bash
# In incognito window, navigate directly to:
http://localhost:3000/dashboard
```

Expected: Redirects to `/login`

- [ ] **Step 4: Test password reset**

```bash
# Navigate to http://localhost:3000/reset-password
```

Test checklist:
- Enter email
- Submit
- Verify success message
- Check email for reset link (if Supabase email is configured)

- [ ] **Step 5: Test logout (if implemented)**

If logout is implemented, test that it clears session and redirects to login.

---

### Task 5: Mobile Layout Verification

- [ ] **Step 1: Test at 375px width**

Open DevTools → Device toolbar → Select iPhone SE (375px)

Check:
- No horizontal scroll on any auth page
- Bottom nav is fully visible and tappable
- Header doesn't overflow
- All buttons are easily tappable (min 44px height)
- Text is readable without zooming

- [ ] **Step 2: Verify touch targets**

All interactive elements should be at least 44x44px for mobile accessibility.

---

## Definition of Done for Session 2

Before marking complete, verify:

- [ ] `pnpm build` passes with zero TS errors
- [ ] `pnpm lint` passes
- [ ] Can sign up with new email
- [ ] Can log in with credentials
- [ ] Unauthenticated users are redirected to login
- [ ] Bottom nav highlights active tab correctly
- [ ] Mobile layout works at 375px (no horizontal scroll)
- [ ] Commit message: `feat: auth flow and app layout shell`

---

## Execution Handoff

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch subagent to run verification tests and fix any gaps found

**2. Inline Execution** - Execute verification tasks in this session

**Which approach?**
