<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Overview: Barbershop Reservation System (Frontend)

A Persian (Farsi) RTL web application for barbershop appointment booking with a 50% deposit payment flow.

---

## 1. Core Tech Stack & Package Management (STRICT)
- **Package Manager**: ALWAYS use `pnpm` (`pnpm add`, `pnpm dlx shadcn@latest add ...`). **NEVER** use `npm` or `yarn`.
- **Framework**: Next.js 16+ (App Router) with React 19 and TypeScript.
- **Styling**: **ONLY use Tailwind CSS v4** (CSS-first configuration in `app/globals.css`; no `tailwind.config.js`). Do **NOT** use custom CSS files, CSS Modules, styled-components, or inline `style={{ ... }}` objects unless dynamically required.
- **UI Component Library**: `shadcn` (`style: "base-luma"`) built on **`@base-ui/react`** primitives.
  - **CRITICAL**: Do **NOT** use `@radix-ui/*` primitives or Radix-specific props like `asChild`. `@base-ui/react` uses the `render` prop pattern (e.g., `<Button render={<Link href="/reserve" />}>`) instead of `asChild`.
  - Always check `components/ui/` before creating new primitives, and add missing shadcn components via `pnpm dlx shadcn@latest add <component>`.
- **Icons**: `lucide-react`.
- **Carousel**: `embla-carousel-react`.

## 2. Recommended / Approved Ecosystem Libraries
When implementing features that require additional tooling, prefer these standard libraries (install via `pnpm` when needed):
- **Forms & Validation**: `react-hook-form` + `zod` + `@hookform/resolvers`.
- **Date & Jalali (Shamsi) Calendar**: `date-fns-jalali` (or `jalaali-js` / `react-day-picker` with Jalali adapter) for Solar Hijri calendar calculations and formatting.
- **Data Fetching / API Client**: Native `fetch` or `@tanstack/react-query` communicating with an **External Backend API**.
- **Client State (Booking Wizard)**: URL Search Params or `zustand` for multi-step reservation state.

## 3. UI/UX, Localization, RTL & Formatting Rules
- **Responsive & Mobile-First Design (CRITICAL)**:
  - All pages and components MUST be designed **mobile-first** (base Tailwind classes target mobile viewports first, scaling up via `sm:`, `md:`, `lg:`, `xl:`).
  - Ensure touch-friendly tap targets (minimum `44px` height/width for buttons, calendar days, and time slots), smooth bottom-sheet/drawer patterns or sticky bottom CTA bars on mobile, and clean multi-column layouts on desktop.
  - Never allow horizontal overflow (`overflow-x-hidden`) across any breakpoint.
- **Language & Direction**: Persian (Farsi), Right-to-Left (`dir="rtl"`, `lang="fa"`).
- **Logical CSS Properties**: Always use RTL-friendly logical Tailwind classes (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`, `start-*`, `end-*`) rather than physical `ml-*`/`mr-*`/`left-*`/`right-*` where direction matters.
- **Calendar**: All user-facing dates and calendars MUST use the **Solar Hijri (Jalali / Shamsi)** calendar. Convert to ISO/Gregorian only when required by the backend API payload.
- **Currency & Numbers**: Format prices clearly in Toman / Rial with Persian locale digit formatting (`toLocaleString('fa-IR')`).

## 4. Product & Domain Architecture
1. **Landing Page (`app/page.tsx`)**:
   - Displays the barbershop introduction (hero, services showcase, barbers, gallery/reviews, location/hours).
   - Features a primary CTA button that navigates the user to the reservation flow.
2. **Multi-Step Reservation Flow**:
   - **Step 1 — Service(s) & Barber Selection**: Client selects one or more barbershop services and their preferred barber.
   - **Step 2 — Jalali Calendar & Time Slot**: Client selects an available date on the Shamsi calendar and picks an open time slot.
   - **Step 3 — Authentication (Phone / OTP)**: Client enters their mobile number and verifies via OTP code.
   - **Step 4 — 50% Deposit Payment**: System calculates the total price of selected services and charges **50% (half of the total price)** as an upfront deposit to lock and confirm the reservation.

## 5. Coding Guidelines for AI Agents
- Before using any `@base-ui/react` component or Next.js 16 API, inspect existing components in `components/ui/` or types in `node_modules/@base-ui/react` to ensure accurate prop usage.
- Keep components modular: place reusable UI primitives in `components/ui/` and domain/feature components in `components/` (e.g., `components/booking/`, `components/landing/`).
- Design clean TypeScript interfaces for API payloads (services, barbers, time slots, reservation requests) so connecting to the external backend API is seamless.

