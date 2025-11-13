# Design Guidelines: Guriri Express B2B Delivery Platform

## Design Approach

**Selected Approach:** Enterprise Dashboard Pattern (Carbon Design System + Ant Design principles)
**Justification:** B2B logistics platform requiring data-dense displays, real-time operations, and multi-role interfaces. Enterprise patterns ensure scalability and professional credibility.

---

## Core Design Elements

### Typography
**Font Family:** Inter (Google Fonts CDN) with system fallback
- **Headings:** H1: 2.25rem/semibold, H2: 1.875rem/semibold, H3: 1.5rem/medium, H4: 1.25rem/medium
- **Body:** Default 0.875rem, Large 1rem (normal weight)
- **Labels:** 0.75rem, medium weight, uppercase with tracking-wide
- **Data/Monospace:** font-mono for order IDs, tracking numbers, timestamps

### Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12
- Component padding: p-4 or p-6
- Section spacing: gap-6 or gap-8
- Consistent vertical rhythm: py-6 for sections, py-12 for major divisions

**Grid Architecture:**
- Sidebar: Fixed w-64 (256px) with collapsible mobile drawer
- Main content: flex-1 with max-w-7xl containers
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 with gap-6
- Data tables: Full-width with responsive stacking on mobile

---

## Component Library

### Navigation
**Sidebar:** Logo top, vertical icon menu, active state with border-l-4 accent, collapsible hamburger on mobile
**Top Bar:** Breadcrumbs (left), notification bell with badge, chat icon, user dropdown (right), h-16 with shadow-sm

### Dashboard Components

**KPI Stat Cards:**
- 4-card grid: Total Pedidos, Em Andamento, Entregues Hoje, Entregadores Ativos
- Layout: p-6, rounded-lg, shadow
- Number: text-3xl font-bold with trend indicator (arrow up/down icon + percentage)
- Label: text-sm below, icon top-right in w-10 h-10 circle background

**Real-Time Order Feed:**
- Live-updating list with pulse animation on new entries
- Each order: flex layout with order ID, route (origin → destination with arrow), status badge, timestamp
- Auto-scroll to new items with smooth transition
- Max-height container: max-h-96 with overflow-y-auto

**Activity Timeline:**
- Vertical timeline with connecting lines between nodes
- Each event: timestamp (left), icon node, description (right)
- Real-time updates append to top with slide-in animation

### Data Tables
- Striped rows, sticky header, sortable columns with Heroicons arrows
- Row actions: icon buttons (eye, edit, archive)
- Bulk selection: checkbox column (left) with action bar appearing on selection
- Pagination: bottom-center with "X-Y of Z results"
- Mobile: Stack to expandable cards

### Order Management Cards
- Compact card: rounded-lg, shadow-sm, p-4
- Header: Order ID + status badge (flex justify-between)
- Body: Origin/Destination with map-pin icons, entregador avatar + name
- Footer: Timestamp (left), price (right, font-semibold)
- Hover: shadow-md with scale-101 transform

### Live Tracking Module
**Map Container:**
- Full-width, h-96 embedded map (Leaflet/Mapbox placeholder comment)
- Real-time driver markers with pulse animation
- Route polyline overlay
- Info cards: absolute positioned over map (top-left: delivery details, bottom-right: ETA countdown)

**Driver Location Panel:**
- Side panel (w-80) showing current location, speed, last update timestamp
- Battery level indicator, online status dot
- Refresh button with loading spinner state

### Chat Interface
**Chat Window:**
- Split layout: contact list sidebar (w-72) + conversation area (flex-1)
- Message bubbles: rounded-lg, max-w-md, sender (right-aligned), receiver (left-aligned)
- Input bar: fixed bottom with h-12 input, send button, attachment icon
- Unread badge on contact avatars
- Typing indicator: animated dots
- Timestamp: text-xs below message groups

**Quick Actions Panel:**
- Floating drawer (right-side) with common templates: "Onde está o pedido?", "Confirmar entrega", etc.
- Click to insert into chat input

### Document Upload
**Upload Zone:**
- Dashed border drag-and-drop area: min-h-32, rounded-lg
- Upload icon (cloud-upload from Heroicons), "Arraste arquivos ou clique" text
- File list below: each file with icon, name, size, remove button
- Progress bar during upload with percentage
- Accepted formats badge: text-xs showing "PDF, PNG, JPG"

### Forms
- Stacked labels (text-sm font-medium mb-1) with required asterisks
- Inputs: h-10, px-3, rounded-md, border with focus:ring-2
- Multi-step forms: progress stepper at top (circles with connecting lines)
- Inline validation: check/error icons in input (right-positioned)

### Status System
**Badges:** Pill-shaped px-3 py-1, rounded-full, text-xs font-medium
- States: Pendente, Confirmado, Coletado, Em Rota, Entregue, Cancelado

### Modals & Overlays
- Modal: centered max-w-2xl, rounded-lg, p-6, close button top-right
- Toast: fixed top-4 right-4, slide-in from right, auto-dismiss 3s
- Confirmation dialogs: max-w-md with two-button footer (cancel left, confirm right)

### Mobile Driver Interface
**Priority Layout:**
- Bottom navigation: fixed bar with 4 icons (home, orders, chat, profile), min-h-14
- Swipeable order cards for accept/reject actions
- Floating action button: w-14 h-14 rounded-full (bottom-right) for "Ver Pedidos Disponíveis"
- Large touch targets: min-h-12 for all interactive elements

---

## Animations
- Hover transitions: duration-200
- Modal entry: slide fade duration-300
- Real-time updates: pulse on new data, slide-in for messages
- Loading: skeleton screens with subtle pulse
- NO scroll animations or parallax

---

## Icons
**Heroicons via CDN** (outline for nav, solid for actions)
Common: truck, map-pin, clock, check-circle, user-group, chart-bar, chat-bubble-left-right, cloud-arrow-up, bell

---

## Images

**Landing Page Hero:**
- Full-width hero with professional logistics photo (modern delivery truck, warehouse operations, or urban delivery scene)
- Height: h-screen on desktop, h-96 on mobile
- Gradient overlay for text readability
- CTA buttons with backdrop-blur-sm background

**Dashboard Empty States:**
- Minimal line illustrations for "Nenhum pedido ativo", "Sem mensagens"
- Placeholder comments: <!-- CUSTOM ICON: empty state illustration -->

**User Avatars:**
- Circular w-10 h-10 for driver/client profile images in lists
- Fallback: initials in colored circle background

**No decorative imagery in operational dashboards** - maintain data focus

---

## Key Principles
1. **Real-Time First:** Immediate visual feedback for live data updates
2. **Information Density:** Maximize operational data visibility without clutter
3. **Role-Specific Optimization:** Admin (analytics focus), Client (order tracking), Driver (mobile-first)
4. **Trust Signals:** Professional layouts, clear status communication, reliable performance indicators
5. **Efficient Workflows:** Minimize clicks for common actions, keyboard shortcuts for power users