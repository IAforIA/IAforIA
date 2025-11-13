# Design Guidelines: Guriri Express B2B Delivery Platform

## Design Approach

**Selected Approach:** Design System - Enterprise Dashboard Pattern
**Primary Reference:** Ant Design / Carbon Design System principles
**Justification:** B2B logistics platform requiring data-dense displays, operational efficiency, and professional credibility. Standard enterprise UI patterns ensure usability across three distinct user roles.

---

## Core Design Elements

### Typography
**Font Family:** Inter via Google Fonts CDN (primary), system fallback
- **Headings:** 
  - H1: 2.25rem (36px), font-semibold
  - H2: 1.875rem (30px), font-semibold
  - H3: 1.5rem (24px), font-medium
  - H4: 1.25rem (20px), font-medium
- **Body:** 
  - Default: 0.875rem (14px), font-normal
  - Large: 1rem (16px), font-normal
- **Labels/Captions:** 0.75rem (12px), font-medium, uppercase tracking-wide
- **Data/Numbers:** font-mono for order IDs, tracking numbers

### Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 or p-6
- Section spacing: gap-6 or gap-8
- Card margins: m-4
- Icon sizes: w-5 h-5 (20px) for UI icons, w-6 h-6 for feature icons

**Grid System:**
- Dashboard: 12-column grid with sidebar (max-w-7xl containers)
- Sidebar: Fixed 256px (w-64) for navigation
- Main content: Remaining flex-1 space
- Cards: Grid with gap-6, responsive columns (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

---

## Component Library

### Navigation
**Sidebar (Central & Client Dashboards):**
- Fixed left sidebar with logo at top
- Vertical navigation menu with icons (Heroicons)
- Active state: Subtle background with border-l-4 accent
- Collapsible on mobile (hamburger menu)

**Top Bar (All Views):**
- User profile dropdown (right)
- Notification bell icon with badge count
- Breadcrumb navigation for deep pages
- Height: h-16 with shadow-sm

### Core UI Elements

**Status Badges:**
- Pill-shaped with px-3 py-1, rounded-full, text-xs font-medium
- States: Pendente, Em Rota, Entregue, Cancelado
- Each with distinct semantic styling (no color specified here)

**Data Tables:**
- Striped rows for better scanning
- Sticky header on scroll
- Sortable columns with arrow indicators
- Row actions: Icon buttons (eye, edit, trash - from Heroicons)
- Pagination below table: showing "X-Y of Z results"
- Responsive: Stack to cards on mobile (< md breakpoint)

**Order Cards:**
- Compact card layout: rounded-lg, shadow-sm, p-4
- Header: Order ID + status badge (flex justify-between)
- Body: Origin → Destination with arrow icon between
- Footer: Price (right-aligned, font-semibold) + Entregador name
- Hover state: shadow-md transition

**Forms:**
- Stacked labels above inputs (text-sm font-medium mb-1)
- Input fields: h-10, px-3, rounded-md, border, focus:ring-2
- Required fields: asterisk after label
- Helper text: text-xs below input
- Button group: Primary CTA (right), Secondary (left) with gap-3

### Dashboard Components

**Stat Cards (Dashboard Overview):**
- Grid of 4 cards: Total Pedidos, Em Andamento, Concluídos, Entregadores Ativos
- Each card: p-6, rounded-lg, shadow
- Large number: text-3xl font-bold
- Label below: text-sm
- Small icon top-right: w-8 h-8 in subtle background circle

**Recent Orders List:**
- Scrollable container: max-h-96 overflow-y-auto
- Each order: Border-bottom separator, py-3 px-4
- Order info: flex layout with status badge right

**Map Component (Delivery Tracking):**
- Full-width container within content area
- Height: h-96 for embedded map
- Overlay controls: Absolute positioned top-right with gap-2

### Delivery Driver Mobile View

**Priority:** Mobile-first for driver interface
- Bottom navigation bar: Fixed with 3-4 main actions
- Large touch targets: min-h-12
- Swipe actions for order cards (accept/reject)
- Floating action button for "Available Orders" (bottom-right, w-14 h-14, rounded-full)

### Overlays & Modals

**Modal Dialog:**
- Centered overlay: max-w-lg, rounded-lg, p-6
- Header with close button (top-right X icon)
- Footer with action buttons (right-aligned)
- Backdrop: semi-transparent overlay

**Toast Notifications:**
- Top-right positioned: fixed top-4 right-4
- Auto-dismiss after 3s
- Icon + message + close button
- Slide-in animation from right

---

## Animations
**Minimal Motion:**
- Hover transitions: transition-all duration-200
- Modal/drawer entry: slide or fade (duration-300)
- Loading states: Subtle pulse on skeleton screens
- NO scroll-triggered animations
- NO parallax effects

---

## Icons
**Library:** Heroicons (outline for navigation, solid for actions) via CDN
**Common Icons:**
- truck (delivery), map-pin (location), clock (status), check-circle (complete)
- user-group (clients), identification (drivers), chart-bar (stats)

---

## Images
**Hero Section (Landing/Marketing Page Only):**
- Full-width hero: Delivery truck/logistics photo
- Height: h-screen on desktop, h-96 on mobile
- Overlay gradient for text readability
- CTA buttons with backdrop-blur-sm background

**Dashboard:** No decorative images - focus on data and functionality
**Empty States:** Simple illustration placeholders (<!-- CUSTOM ICON: empty box illustration -->)

---

## Key Principles
1. **Information Density:** Maximize screen real estate for data without overwhelming
2. **Role Clarity:** Visual consistency but distinct workflows per user type
3. **Real-time Feedback:** Prominent status indicators and live updates
4. **Mobile for Drivers:** Touch-optimized, one-handed operation priority
5. **Professional Trust:** Clean, organized layouts that inspire B2B confidence