# Frontend Completion Plan - 100% Backend Parity

**Date Created:** November 20, 2025  
**Status:** In Progress  
**Goal:** Bring frontend to 100% feature parity with backend schema

---

## Critical Findings Summary

### 🔴 Major Subsystems Completely Missing (0% Implemented)
1. **Chat System** (`chatMessages` table) - No UI at all
2. **Live GPS Tracking** (`motoboyLocations` table) - No real-time map
3. **Shift Management** (`motoboySchedules` table) - Drivers can't set availability
4. **Opening Hours** (`clientSchedules` table) - No business hours enforcement

### 🟠 Critical Data Mismatches
1. **Client Order Form** - Missing: Payment Method, Change (Troco), Complement, Reference, Observations
2. **Driver Dashboard** - Can't see Payment Method or Change needed
3. **Address Schema** - Frontend uses simple strings; backend expects structured data
4. **Billing** - No UI for `mensalidade` (monthly fees)

### ⚠️ Admin & Management Gaps
1. **User Management** - Can't ban/promote users
2. **Manual Order Control** - Can't cancel/reassign stuck orders
3. **Database View** - No raw data editor for emergency fixes

---

## Implementation Steps (10 Steps)

### ✅ STEP 1: Client Order Form - Payment & Change
**Priority:** CRITICAL - Blocks revenue  
**Files to Modify:**
- `client/src/pages/client-dashboard.tsx`

**Changes:**
1. Add `formaPagamento` field to `orderSchema` (Select: Cash/Card/Pix)
2. Add `hasTroco` boolean (checkbox, only visible when Cash selected)
3. Add `trocoValor` number input (conditional, only when hasTroco=true)
4. Update mutation to send these fields instead of hardcoding

**Testing Checklist:**
- [ ] Form shows Payment Method selector
- [ ] Change fields appear only when Cash selected
- [ ] Backend receives correct data
- [ ] Order displays payment info in dashboard
- [ ] Existing orders still load correctly

**Status:** 🔲 Not Started

---

### ✅ STEP 2: Client Order Form - Address Details
**Priority:** CRITICAL - Drivers can't find addresses  
**Files to Modify:**
- `client/src/pages/client-dashboard.tsx`

**Changes:**
1. Add `coletaComplemento` (optional text input - e.g., "Apt 302")
2. Add `referencia` (optional text input - e.g., "Near the bakery")
3. Add `observacoes` (optional textarea - general notes)
4. Ensure these fields are sent to backend

**Testing Checklist:**
- [ ] New fields render in form
- [ ] Form submits successfully with new fields
- [ ] Backend stores data correctly
- [ ] Fields are optional (form works without them)
- [ ] Existing orders still display

**Status:** 🔲 Not Started

---

### ✅ STEP 3: Driver Dashboard - Show Payment Info
**Priority:** CRITICAL - Drivers need to know payment method  
**Files to Modify:**
- `client/src/components/OrderCard.tsx`
- `client/src/pages/driver-dashboard.tsx`

**Changes:**
1. Add Payment Method badge to `OrderCard`
2. Add "Change Needed" indicator when `hasTroco=true`
3. Display `trocoValor` amount
4. Show `complemento` and `referencia` in delivery details

**Testing Checklist:**
- [ ] Payment method visible on order cards
- [ ] Change info shows correctly
- [ ] Address details complete
- [ ] UI doesn't break with old orders (no payment data)
- [ ] Mobile responsive

**Status:** 🔲 Not Started

---

### ✅ STEP 4: Central Dashboard - User Management
**Priority:** HIGH - Can't manage bad actors  
**Files to Modify:**
- `client/src/pages/central-dashboard.tsx`

**Changes:**
1. Add "Users" tab/route
2. Create `UserManagementTable` component
3. Add "Ban/Activate" toggle buttons
4. Add "Change Role" dropdown (promote to admin)

**Backend Routes Needed:**
- `PATCH /api/users/:id/status` (activate/deactivate)
- `PATCH /api/users/:id/role` (change role)

**Testing Checklist:**
- [ ] Users table loads all users
- [ ] Ban button deactivates user
- [ ] Activate button re-enables user
- [ ] Role change works
- [ ] Can't ban yourself (safety check)

**Status:** 🔲 Not Started

---

### ✅ STEP 5: Central Dashboard - Manual Order Management
**Priority:** HIGH - Orders get stuck  
**Files to Modify:**
- `client/src/pages/central-dashboard.tsx`

**Changes:**
1. Add "Cancel Order" button to order cards
2. Add "Reassign Order" modal (pick different driver)
3. Add status override controls

**Backend Routes Needed:**
- `PATCH /api/orders/:id/cancel`
- `PATCH /api/orders/:id/reassign`

**Testing Checklist:**
- [ ] Cancel button changes status to cancelled
- [ ] Reassign modal lists available drivers
- [ ] Order updates in real-time
- [ ] WebSocket broadcast works
- [ ] Can't cancel delivered orders

**Status:** 🔲 Not Started

---

### ✅ STEP 6: Chat System - Backend Routes
**Priority:** MEDIUM - Communication needed  
**Files to Create/Modify:**
- Backend routes already exist (`GET /api/chat`, `POST /api/chat`)
- Just need to verify they work

**Changes:**
1. Test existing chat endpoints
2. Verify WebSocket broadcast for chat
3. Add pagination if needed (for performance)

**Testing Checklist:**
- [ ] GET /api/chat returns messages
- [ ] POST /api/chat creates message
- [ ] WebSocket broadcasts `chat_message` event
- [ ] Messages persist in database
- [ ] Filtered by role if needed

**Status:** 🔲 Not Started

---

### ✅ STEP 7: Chat System - Frontend UI
**Priority:** MEDIUM - Depends on Step 6  
**Files to Create:**
- `client/src/components/ChatWidget.tsx`
- `client/src/components/ChatMessage.tsx`

**Files to Modify:**
- `client/src/pages/client-dashboard.tsx`
- `client/src/pages/driver-dashboard.tsx`
- `client/src/pages/central-dashboard.tsx`

**Changes:**
1. Create collapsible chat widget (bottom-right corner)
2. Connect to `/api/chat` endpoints
3. Listen to WebSocket for new messages
4. Add send message form
5. Show sender role badges

**Testing Checklist:**
- [ ] Chat widget renders in all dashboards
- [ ] Messages load on open
- [ ] New messages appear in real-time
- [ ] Can send messages
- [ ] Messages show sender name/role
- [ ] Widget collapsible

**Status:** 🔲 Not Started

---

### ✅ STEP 8: Shift Management - Backend Routes
**Priority:** MEDIUM - Optimize scheduling  
**Files to Create:**
- Backend routes for `motoboySchedules`

**Routes to Add:**
- `GET /api/motoboys/:id/schedules`
- `POST /api/motoboys/:id/schedules`
- `PATCH /api/motoboy-schedules/:id`

**Testing Checklist:**
- [ ] Can retrieve driver's schedule
- [ ] Can set shifts (Morning/Afternoon/Night)
- [ ] Can update existing schedule
- [ ] Validates day of week (0-6)
- [ ] Returns proper errors

**Status:** 🔲 Not Started

---

### ✅ STEP 9: Shift Management - Driver UI
**Priority:** MEDIUM - Depends on Step 8  
**Files to Modify:**
- `client/src/pages/driver-dashboard.tsx`

**Changes:**
1. Add "My Availability" tab/route
2. Create weekly schedule grid
3. Add toggle switches for Morning/Afternoon/Night per day
4. Auto-save on change

**Testing Checklist:**
- [ ] Grid shows all 7 days
- [ ] Toggles save to backend
- [ ] Current schedule loads correctly
- [ ] Visual feedback on save
- [ ] Mobile responsive

**Status:** 🔲 Not Started

---

### ✅ STEP 10: Profile Editing - Settings Pages
**Priority:** LOW - Quality of life  
**Files to Modify:**
- `client/src/pages/client-dashboard.tsx` (Settings route)
- `client/src/pages/driver-dashboard.tsx` (if has settings)
- `client/src/pages/central-dashboard.tsx` (if has settings)

**Changes:**
1. Wire up "Save Changes" button in Settings
2. Call `PATCH /api/users/:id` (already exists in backend)
3. Add form validation
4. Show success/error toast

**Testing Checklist:**
- [ ] Name update works
- [ ] Phone update works
- [ ] Password change works (with confirmation)
- [ ] Email update works (if allowed)
- [ ] Validation prevents bad data
- [ ] Toast shows success

**Status:** 🔲 Not Started

---

## Deferred Features (Not Blocking)

### 📍 Live GPS Map
- **Reason:** Requires real-time GPS from driver app + map library (Leaflet/Google Maps)
- **Backend Ready:** `motoboyLocations` table exists
- **Complexity:** High (needs mobile app integration)
- **Priority:** Future Enhancement

### 💰 Billing & Mensalidade
- **Reason:** Business logic not fully defined (payment gateway integration)
- **Backend Ready:** `clients.mensalidade` field exists
- **Complexity:** Medium (needs payment processor)
- **Priority:** Future Enhancement

### 🕐 Opening Hours Enforcement
- **Reason:** Business rules unclear (hard block vs warning?)
- **Backend Ready:** `clientSchedules` table exists
- **Complexity:** Low (just validation)
- **Priority:** Future Enhancement

---

## Implementation Rules

1. **Test Before Moving:** Each step must be fully tested before starting the next
2. **No Breaking Changes:** Existing functionality must continue working
3. **Incremental Commits:** Commit after each successful step
4. **Backward Compatibility:** Handle old data gracefully (null checks)
5. **Error Handling:** Always show user-friendly errors
6. **Mobile First:** Test on mobile viewport
7. **WebSocket Safe:** Don't break real-time updates
8. **Type Safety:** Maintain TypeScript strict mode
9. **Accessibility:** Keep ARIA labels and semantic HTML
10. **Performance:** Don't add unnecessary re-renders

---

## Progress Tracking

| Step | Status | Started | Completed | Notes |
|------|--------|---------|-----------|-------|
| 1 | 🔲 Not Started | - | - | Payment & Change fields |
| 2 | 🔲 Not Started | - | - | Address details |
| 3 | 🔲 Not Started | - | - | Driver payment display |
| 4 | 🔲 Not Started | - | - | User management |
| 5 | 🔲 Not Started | - | - | Order management |
| 6 | 🔲 Not Started | - | - | Chat backend |
| 7 | 🔲 Not Started | - | - | Chat frontend |
| 8 | 🔲 Not Started | - | - | Shifts backend |
| 9 | 🔲 Not Started | - | - | Shifts frontend |
| 10 | 🔲 Not Started | - | - | Settings save |

---

## Current Step: STEP 1
**Next Action:** Add Payment Method and Change fields to Client Order Form
