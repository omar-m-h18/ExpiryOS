# ExpiryOS Development Roadmap

## Executive Summary

This roadmap outlines the staged development plan for ExpiryOS to transform it from an open demo into a **secure, multi-tenant SaaS** while maintaining its value as an **open-source contribution platform**. 

**Critical Principle:** Security and data isolation MUST be implemented BEFORE any public release or LinkedIn demo. Releasing software without authentication is like releasing a car with bumpers but no windshield—it looks functional but exposes users to critical risks.

---

## Current State Assessment (v1.0)

### ✅ What Works
- Full CRUD operations for items
- Automatic status computation (Active/Expiring Soon/Expired)
- Dashboard with summary counts and spotlight features
- Search, filter, and sort functionality
- Mobile-responsive UI with light/dark mode
- OpenAPI-first architecture with generated clients
- Repository pattern for database abstraction

### ❌ Critical Gaps (Blockers for Release)
1. **No Authentication** - Anyone can access all data
2. **No Data Isolation** - All users share the same global tables
3. **No User Context** - No way to distinguish between users
4. **Security Risk** - Demonstrates poor engineering practices if released as-is

---

## Stage 1: Security Foundation (MUST COMPLETE BEFORE RELEASE)

**Goal:** Implement authentication and data isolation so every user only sees their own data.

**Timeline:** 2-3 days  
**Priority:** 🔴 CRITICAL - Do not release without this

### 1.1 Database Schema Changes

**File:** `/workspace/lib/db/src/schema/items.ts`

```typescript
// Add user_id column to items table
export const itemsTable = pgTable("items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // ← NEW: Clerk user ID
  title: text("title").notNull(),
  category: text("category"),
  expirationDate: date("expiration_date", { mode: "string" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Add index for fast user-based queries
export const itemsUserIdIndex = index("items_user_id_idx").on(itemsTable.userId);
```

**Migration Required:** 
- Create migration to add `user_id` column
- Backfill existing rows with a default "demo" user ID (for transition period)
- Add NOT NULL constraint after backfill

### 1.2 Clerk Authentication Integration

**Service:** [Clerk.dev](https://clerk.com) (Managed auth - no custom auth tables)

**Why Clerk:**
- Zero security risk from rolling your own auth
- 20-minute setup vs weeks of building secure auth
- Handles OAuth, MFA, password reset, sessions out-of-the-box
- Free tier generous enough for demo/open-source use
- Provides JWT tokens for API verification

**Backend Changes:**

**File:** `/workspace/artifacts/api-server/src/middlewares/auth.middleware.ts` (NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/backend';

export interface AuthRequest extends Request {
  userId?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const session = await clerkClient.verifyToken(token);
    req.userId = session.sub; // Clerk user ID
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**File:** `/workspace/artifacts/api-server/src/routes/items.ts`

```typescript
// Update all routes to use requireAuth middleware
router.get("/items", requireAuth, async (req: AuthRequest, res: Response) => {
  // Pass userId to repository
  const items = await itemsRepository.findAll({ 
    ...parsed.data, 
    userId: req.userId! // ← Filter by authenticated user
  });
  res.json(items);
});

// Same for POST, PATCH, DELETE - all require auth
```

**Repository Changes:**

**File:** `/workspace/artifacts/api-server/src/repositories/items.repository.ts`

```typescript
export interface ListItemsOptions {
  search?: string;
  status?: "active" | "expiring_soon" | "expired";
  sort?: SortDirection;
  userId?: string; // ← NEW: Filter by user
}

export interface CreateItemData {
  title: string;
  category?: string | null;
  expiration_date: string;
  notes?: string | null;
  userId: string; // ← NEW: Required for creation
}

// In DrizzleItemsRepository implementation:
async findAll(options: ListItemsOptions = {}): Promise<EnrichedItem[]> {
  const { search, status, sort = "asc", userId } = options;
  
  let query = db.select().from(itemsTable);
  
  // CRITICAL: Always filter by userId if provided
  if (userId) {
    query = query.where(eq(itemsTable.userId, userId)) as typeof query;
  }
  
  // ... rest of query logic
}

async create(data: CreateItemData): Promise<EnrichedItem> {
  const [row] = await db
    .insert(itemsTable)
    .values({
      userId: data.userId, // ← Store user ownership
      title: data.title,
      // ... other fields
    })
    .returning();
  
  return enrichItem(row);
}
```

### 1.3 Frontend Authentication UI

**File:** `/workspace/artifacts/expiry-tracker/src/App.tsx`

```typescript
import { ClerkProvider, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <SignedOut>
              {/* Public landing page with login CTA */}
              <LandingPage />
            </SignedOut>
            <SignedIn>
              {/* Protected app routes */}
              <AppLayout>
                <Router />
              </AppLayout>
            </SignedIn>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
```

**File:** `/workspace/artifacts/expiry-tracker/src/pages/landing.tsx` (NEW)

```typescript
// Simple landing page for non-authenticated users
// - Value proposition
// - Features overview
// - Login/Signup buttons via Clerk components
```

**API Client Updates:**

All API calls must include the Clerk JWT token:

```typescript
// In lib/api-client or hooks
const token = await window.Clerk?.session?.getToken();

const response = await fetch('/api/items', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 1.4 Environment Variables

**Update `.env.example`:**

```bash
# Clerk Authentication (Stage 1)
CLERK_SECRET_KEY=sk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_JWT_ISSUER=https://your-instance.clerk.accounts.dev
```

### 1.5 Testing Checklist

- [ ] Unauthenticated requests return 401
- [ ] User A cannot see User B's items (test with 2 accounts)
- [ ] User can create items and they're tagged with userId
- [ ] User can edit/delete only their own items
- [ ] Token expiration is handled gracefully
- [ ] Refresh token flow works seamlessly

---

## Stage 2: Contributor Experience & Demo Mode

**Goal:** Make it easy for open-source contributors to develop locally while maintaining security in production.

**Timeline:** 1-2 days  
**Priority:** 🟡 HIGH - Needed for community growth

### 2.1 Local Development Mode

Create a "demo mode" for local development where:
- Auto-create a demo user on first run
- Seed with sample data
- Skip auth checks in local environment only

**File:** `/workspace/artifacts/api-server/src/config/index.ts`

```typescript
export const DEMO_MODE = process.env.DEMO_MODE === 'true';
export const DEMO_USER_ID = process.env.DEMO_USER_ID || 'demo-user';
```

**Repository Logic:**

```typescript
if (DEMO_MODE && !userId) {
  // In local dev, default to demo user
  userId = DEMO_USER_ID;
}
```

### 2.2 Seed Scripts

**File:** `/workspace/scripts/seed-demo-data.ts` (NEW)

```typescript
// Create demo user and sample items for local testing
// Run with: pnpm run seed:demo
```

### 2.3 Documentation Updates

**Update `README.md`:**
- Add "Local Development" section with Clerk setup instructions
- Explain demo mode vs production mode
- Link to CONTRIBUTING.md with workflow guide

**Update `CONTRIBUTING.md`:**
- Step-by-step local setup guide
- How to get free Clerk account for development
- Testing guidelines

---

## Stage 3: Bulk Import Feature

**Goal:** Allow users to migrate from spreadsheets with CSV import.

**Timeline:** 1 day  
**Priority:** 🟢 MEDIUM - Key feature for adoption

### 3.1 Client-Side CSV Parsing

**Library:** `papaparse` (lightweight, client-side)

**Why Client-Side:**
- Avoids server timeouts on Render free tier
- Instant feedback to user
- No file upload storage needed
- Reduces server load

**File:** `/workspace/artifacts/expiry-tracker/src/pages/import.tsx` (NEW)

```typescript
import Papa from 'papaparse';

function ImportWizard() {
  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Validate data structure
        const items = validateCSVData(results.data);
        
        // Batch create items
        items.forEach(item => createItem.mutate(item));
      }
    });
  };
  
  // UI: Drag-drop zone, preview table, progress indicator
}
```

### 3.2 API Endpoint for Batch Creation

**File:** `/workspace/artifacts/api-server/src/routes/items.ts`

```typescript
// POST /items/batch
router.post("/items/batch", requireAuth, async (req: AuthRequest, res: Response) => {
  const items = req.body.items; // Array of items
  
  // Validate batch size (limit to 100 to prevent timeouts)
  if (items.length > 100) {
    res.status(400).json({ error: 'Maximum 100 items per batch' });
    return;
  }
  
  const created = await itemsRepository.createBatch(items, req.userId!);
  res.json(created);
});
```

---

## Stage 4: UX Polish & Production Readiness

**Goal:** Make the app feel like a polished SaaS product.

**Timeline:** 1-2 days  
**Priority:** 🟢 MEDIUM - Important for LinkedIn demo credibility

### 4.1 Loading States

- Skeleton loaders for dashboard cards
- Shimmer effect on items list during fetch
- Optimistic updates for create/edit/delete

### 4.2 Error Handling

- Error boundaries around main sections
- User-friendly error messages
- Retry mechanisms for failed requests

### 4.3 Success Feedback

- Toast notifications for all mutations
- Undo capability for deletions (5-second window)
- Confirmation dialogs for destructive actions

---

## Stage 5: Multi-Tenancy & Teams (Future)

**Goal:** Enable team collaboration features.

**Timeline:** TBD  
**Priority:** ⚪ LOW - Post-launch enhancement

### 5.1 Workspace/Team Model

- Add `workspaces` table
- Add `workspace_members` junction table
- Items belong to workspace, not individual users
- Role-based permissions (owner/admin/member)

### 5.2 Sharing & Collaboration

- Invite members via email
- Shared views and filters
- Activity log/audit trail

---

## Version Timeline

| Version | Milestone | Target Date | Status |
|---------|-----------|-------------|--------|
| v1.0 | Current state (no auth) | - | ❌ DO NOT RELEASE |
| v1.1 | Stage 1 complete (auth + isolation) | Sprint 1 | 🔴 IN PROGRESS |
| v1.2 | Stage 2 + 3 (contributor experience + CSV import) | Sprint 2 | ⏳ PENDING |
| v1.3 | Stage 4 (UX polish) | Sprint 3 | ⏳ PENDING |
| v2.0 | Stage 5 (teams/multi-tenancy) | Future | ⏳ BACKLOG |

---

## Immediate Action Items (Sprint 1)

### Day 1: Backend Security
- [ ] Install `@clerk/backend` in api-server
- [ ] Update database schema with `user_id` column
- [ ] Create and run migration
- [ ] Implement auth middleware
- [ ] Update repository to filter by userId
- [ ] Test with Postman/curl

### Day 2: Frontend Auth
- [ ] Install `@clerk/clerk-react` in frontend
- [ ] Wrap app with ClerkProvider
- [ ] Create landing page with login/signup
- [ ] Protect all routes with SignedIn
- [ ] Update API client to send JWT token
- [ ] Test full CRUD flow with auth

### Day 3: Testing & Hardening
- [ ] Test multi-user isolation (User A vs User B)
- [ ] Verify unauthenticated requests are blocked
- [ ] Test token refresh flow
- [ ] Add error handling for auth failures
- [ ] Update documentation
- [ ] Deploy to staging for final review

---

## Success Metrics

**Stage 1 Complete When:**
- ✅ Two different users can create accounts and only see their own items
- ✅ Unauthenticated API requests return 401
- ✅ All CRUD operations work with auth context
- ✅ No shared data between users

**Release Criteria for LinkedIn Demo:**
- ✅ Stage 1 complete (security foundation)
- ✅ At least 10 demo items in seeded database
- ✅ Smooth onboarding flow (signup → dashboard in <2 minutes)
- ✅ No console errors or visible bugs
- ✅ Mobile responsive and looks professional

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Clerk API downtime | Users can't login | Implement graceful degradation with cached sessions |
| Migration breaks existing data | Data loss | Backup before migration, test on staging first |
| Performance issues with userId filtering | Slow queries | Add database index on user_id column |
| Free tier limits hit | Service interruption | Monitor usage, set up alerts, optimize payload sizes |

---

## Notes for Contributors

This roadmap is designed to be **incremental and testable**. Each stage builds on the previous one and can be developed independently. We welcome contributions in the following areas:

- **Stage 1:** Backend developers familiar with Express middleware
- **Stage 2:** DevOps/documentation contributors
- **Stage 3:** Frontend developers with CSV/data import experience
- **Stage 4:** UX/UI designers and frontend developers
- **Stage 5:** Architects interested in multi-tenancy patterns

See `CONTRIBUTING.md` for development workflow and coding standards.

---

*Last Updated: $(date)*  
*Version: 1.1 (Draft)*  
*Status: Ready for Sprint 1 Implementation*
