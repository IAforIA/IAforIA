# Business Logic & Mapping Implementation Plan

**Date Created:** November 21, 2025  
**Status:** 🚧 IN PROGRESS  
**Goal:** Add production-grade business intelligence, financial analytics, and mapping to Guriri Express

---

## 📊 PHASE 1: FINANCIAL ANALYTICS & BUSINESS INTELLIGENCE

### **STEP 11: Build Analytics Backend Module** ✅ CONCLUÍDO
**Priority:** CRITICAL - Zero revenue visibility without this  
**Estimated Time:** 4-6 hours  
**Completed:** 21/11/2025

**Files Modified:**
- `server/analytics.ts` - ✅ Adicionada TABELA_REPASSE fixa (hardcoded)
- `server/routes.ts` - ✅ Validação e cálculo automático implementados

**Functions Implemented:**
- ✅ `calculateGuririComission(valor, hasMensalidade)` - Retorna { motoboy, guriri } da tabela fixa
- ✅ `isValidDeliveryValue(valor, hasMensalidade)` - Valida se valor está permitido
- ✅ `getAllowedValues(hasMensalidade)` - Retorna [7,10,15] ou [8,10,15]
- ✅ `getDailyRevenue(date)` - SUM(valor) WHERE status='delivered' (fórmula corrigida)
- ✅ `getRevenueByDateRange(startDate, endDate)` - Lucro calculado corretamente
- ✅ Validação no POST /api/orders - Rejeita valores inválidos e calcula taxaMotoboy automaticamente

**Status:** ✅ BACKEND PROTEGIDO - Sistema não aceita mais valores arbitrários

---

### **STEP 12: Create Analytics REST API** ⏳ DEPENDS ON STEP 11
**Priority:** CRITICAL  
**Estimated Time:** 2-3 hours

**Files to Modify:**
- `server/routes.ts` - Add 5 new endpoints

**Endpoints:**
- `GET /api/analytics/dashboard` - Real-time KPIs
- `GET /api/analytics/revenue?start&end` - Revenue by date range
- `GET /api/analytics/motoboy/:id?start&end` - Driver earnings
- `GET /api/analytics/client/:id?month=YYYY-MM` - Client billing
- `GET /api/analytics/mrr` - Monthly recurring revenue

**Auth:** All require JWT, some require `role='central'`

**Status:** 🔴 NOT STARTED

---

### **STEP 13: Build Live Metrics Dashboard** ⏳ DEPENDS ON STEP 12
**Priority:** HIGH  
**Estimated Time:** 3-4 hours

**Files to Modify:**
- `client/src/pages/central-dashboard.tsx` - Replace static calculations (line 807-810)

**New Metrics Cards:**
- Receita Hoje (today's delivered orders)
- Lucro MTD (month-to-date profit)
- MRR Ativo (active subscriptions)
- Faturamento Pendente (in_progress orders value)
- Taxa Média Motoboy (average commission)

**Features:**
- Auto-refresh every 30 seconds
- Loading states
- Error handling
- Mobile responsive grid

**Status:** 🔴 NOT STARTED

---

### **STEP 14: Create Financial Reports Page** ⏳ DEPENDS ON STEP 12
**Priority:** HIGH  
**Estimated Time:** 5-6 hours

**Files to Create:**
- `client/src/pages/FinancialReports.tsx` - Main reports page

**Report Types:**
1. **Client Analysis** - Orders, revenue, mensalidade status, debt
2. **Motoboy Earnings** - Deliveries, commission, averages
3. **Period Analysis** - Date range, grouping, trends
4. **Debt Management** - Outstanding balances, overdue tracking

**Components:**
- Date range picker
- Client/Motoboy dropdowns
- Data tables
- Summary cards
- Export buttons (future)

**Status:** 🔴 NOT STARTED

---

## 📍 PHASE 2: MAPPING & GEOLOCATION SYSTEM

### **STEP 15: Install and Configure Leaflet** ⏳ READY TO START
**Priority:** HIGH  
**Estimated Time:** 1-2 hours

**Commands:**
```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

**Files to Create:**
- `client/src/lib/geocoding.ts` - ViaCEP API integration
- `server/config/neighborhoods.json` - Guriri coordinates

**Functions:**
- `fetchAddressByCEP(cep)` - Auto-fill from Brazilian postal API
- `validateGuririCEP(cep, addressData)` - São Mateus only
- `formatCEP(cep)` - Display formatting

**Status:** 🔴 NOT STARTED

---

### **STEP 16: Build Delivery Map Component** ⏳ DEPENDS ON STEP 15
**Priority:** HIGH  
**Estimated Time:** 3-4 hours

**Files to Create:**
- `client/src/components/DeliveryMap.tsx` - Interactive map

**Features:**
- OpenStreetMap tiles (free)
- Custom marker icons (pickup=green, delivery=red, driver=blue)
- Auto-zoom to fit all markers
- Click popups with order details
- Responsive height prop

**Map Center:** Guriri, São Mateus [-18.7263, -39.8561]

**Status:** 🔴 NOT STARTED

---

### **STEP 17: Enhance Order Form with CEP Autocomplete** ⏳ DEPENDS ON STEPS 15, 16
**Priority:** MEDIUM  
**Estimated Time:** 2-3 hours

**Files to Modify:**
- `client/src/pages/client-dashboard.tsx` - Order form

**Features:**
- Auto-fill street/neighborhood on CEP blur
- Loading spinner during fetch
- São Mateus validation
- Map preview modal before submit
- Error handling for invalid CEP

**UX Flow:**
1. User enters CEP
2. Auto-fetch address data
3. Fill fields automatically
4. Show "Visualizar no Mapa" button
5. Confirm locations visually
6. Submit order

**Status:** 🔴 NOT STARTED

---

### **STEP 18: Create Neighborhood Distance Matrix** ⏳ CAN START ANYTIME
**Priority:** MEDIUM  
**Estimated Time:** 2 hours

**Files to Create:**
- `server/config/neighborhoods.json` - Coordinates for major areas
- `server/lib/distance.ts` - Haversine formula

**Neighborhoods:**
- Centro, Guriri, Liberdade, Aviação, Sernamby

**Functions:**
- `calculateDistance(lat1, lng1, lat2, lng2)` - Returns km
- `getNeighborhoodCoords(bairro)` - Lookup coordinates
- `getEstimatedDeliveryTime(originBairro, destBairro)` - Minutes

**Status:** 🔴 NOT STARTED

---

### **STEP 19: Integrate Map into Central Dashboard** ⏳ DEPENDS ON STEP 16
**Priority:** MEDIUM  
**Estimated Time:** 3-4 hours

**Files to Modify:**
- `client/src/pages/central-dashboard.tsx` - Add "Mapa" tab

**Features:**
- Show all `status='in_progress'` orders
- Display driver locations (if tracked)
- Order cards below map
- Cancel/reassign from map view
- Real-time updates via WebSocket
- Color-coded legend

**Status:** 🔴 NOT STARTED

---

### **STEP 20: Add Driver Location Tracking** ⏳ DEPENDS ON STEP 19
**Priority:** MEDIUM  
**Estimated Time:** 3-4 hours

**Files to Modify:**
- `server/routes.ts` - Add `POST /api/motoboys/:id/location`
- `server/storage.ts` - Add `updateMotoboyLocation()`
- `client/src/pages/driver-dashboard.tsx` - Geolocation tracking

**Features:**
- Request GPS permission
- Track location only during active delivery
- Update every 30 seconds
- Broadcast to central via WebSocket
- Battery-friendly settings

**Status:** 🔴 NOT STARTED

---

## 🎯 DESIGN DECISIONS

### **1. Offline Map Tiles**
**Decision:** Online-only for MVP  
**Reasoning:** Drivers need internet for orders anyway, caching adds 500MB+

### **2. CEP Database**
**Decision:** Hybrid - API + local cache  
**Implementation:** Create `addressCache` table, check cache first, then ViaCEP API

### **3. Route Optimization**
**Decision:** Single order assignment for MVP  
**Reasoning:** TSP is complex, most drivers handle 1-2 orders max. Add greedy algorithm in v1.1

---

## 📋 IMPLEMENTATION SEQUENCE

**Priority 1 (Business Critical):**
1. Step 11: Analytics Backend ← START HERE
2. Step 12: Analytics API
3. Step 13: Live Metrics Dashboard
4. Step 14: Financial Reports

**Priority 2 (User Experience):**
5. Step 15: Install Leaflet
6. Step 16: Delivery Map Component
7. Step 17: CEP Autocomplete
8. Step 18: Distance Matrix

**Priority 3 (Advanced Features):**
9. Step 19: Central Map View
10. Step 20: Driver Tracking

---

## ✅ TESTING CHECKLIST

### After Each Step:
- [ ] TypeScript compiles with no errors
- [ ] Server starts without crashes
- [ ] All existing features still work
- [ ] New feature works as expected
- [ ] Mobile responsive (if UI change)
- [ ] Console has no errors

### Before Git Commit:
- [ ] Run `npm run dev` successfully
- [ ] Test login for all 3 roles
- [ ] Create test order end-to-end
- [ ] Check WebSocket connections
- [ ] Verify database queries work

---

## 🚨 SAFETY GUIDELINES

1. **Never modify existing working code** unless necessary
2. **Add new files** instead of editing complex existing ones
3. **Test after each step** before moving to next
4. **Keep backups** of modified files
5. **Use TypeScript strict mode** to catch errors early
6. **Follow existing patterns** in codebase

---

## 📦 DEPENDENCIES TO INSTALL

```bash
# Phase 2 - Mapping
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

**No Python, no payment gateways, no new frameworks** - TypeScript only!

---

## 🎯 SUCCESS METRICS

**Phase 1 Complete When:**
- [ ] Central can see real-time revenue/profit
- [ ] Financial reports show client debt
- [ ] Motoboy earnings tracked accurately
- [ ] MRR calculation working

**Phase 2 Complete When:**
- [ ] CEP auto-fills addresses
- [ ] Map shows all deliveries
- [ ] Driver locations update live
- [ ] Distance estimates accurate

---

**Current Status:** 🔴 Step 11 (Analytics Backend) - Ready to Start  
**Last Updated:** November 21, 2025  
**Total Estimated Time:** 35-45 hours
