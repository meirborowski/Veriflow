# Veriflow UI/UX Guidelines

## 1. Design Philosophy
Veriflow is a professional, high-efficiency tool for QA tracking and real-time collaboration. Our aesthetic is **clean, professional, and tool-focused**. 
*Think Linear or Notion, not Dribbble.*

- **Function over Flash:** Every pixel must serve a purpose. Avoid unnecessary animations, heavy shadows, or decorative elements.
- **High Information Density:** Users need to see a lot of data at once without feeling overwhelmed. Use whitespace strategically to group related information.
- **Real-time Awareness:** Since Veriflow features a live "Test Swarm," the UI must clearly communicate presence and live updates without jarring layout shifts.

## 2. Color System
We use a neutral base with highly intentional semantic accent colors. Color is primarily used to communicate **status** and **severity**.

### Base Palette
- **Backgrounds:** Clean white (`#FFFFFF`) or ultra-light gray (`#F8FAFC` - Slate 50) for main areas.
- **Surfaces:** White with subtle 1px borders (`#E2E8F0` - Slate 200) for cards and panels.
- **Text:** Dark slate (`#0F172A` - Slate 900) for primary text, muted slate (`#64748B` - Slate 500) for secondary text.

### Semantic Status Colors
Consistent across all views (dashboard, cards, badges, charts):

| Status | Color Intent | Tailwind Class |
| :--- | :--- | :--- |
| **Untested** | Neutral / Gray | `bg-slate-100 text-slate-700` |
| **In Progress** | Blue | `bg-blue-100 text-blue-700` |
| **Pass** | Green | `bg-emerald-100 text-emerald-700` |
| **Fail** | Red | `bg-rose-100 text-rose-700` |
| **Partially Tested** | Amber / Yellow | `bg-amber-100 text-amber-700` |
| **Can't Be Tested** | Muted / Disabled | `bg-slate-200 text-slate-500` |

*Note: Bug severity follows the same heat scale: `Critical` = Red, `Major` = Orange, `Minor` = Yellow, `Trivial` = Gray.*

## 3. Typography
We rely on a **System Font Stack** (e.g., Inter, San Francisco, Segoe UI) to ensure maximum performance and native feel.
- **Single Typeface:** Do not mix font families.
- **Hierarchy:** Establish hierarchy through weight (Medium/Semibold) and size, not variety.
- **Tabular Data:** Use tabular numbers (`tabular-nums`) in tables and metrics to ensure alignment.

## 4. Layout Principles
- **Sidebar Navigation:** Project-scoped. Switch projects from a top-level selector in the sidebar.
- **Content Area:** 
  - Single-column for forms and detail views (max-width to ensure readability).
  - Full-width table/grid for list views.
- **Breadcrumbs:** Essential for navigation. Always show on nested pages (e.g., `Project > Release > Test Runner`).
- **No Modals for Core Workflows:** Use full pages or slide-over panels for complex tasks. Reserve modals strictly for confirmations (e.g., "Are you sure you want to delete?") and quick, single-input actions.

## 5. Component Patterns
- **Tables:** Must include sortable columns, row actions via a trailing dropdown menu (`...`), and bulk selection checkboxes where relevant.
- **Forms:** 
  - Labels placed *above* inputs.
  - Inline validation (red text below input).
  - Submit button aligned to the bottom-right.
- **Empty States:** Never leave a blank screen. Always show a muted icon, a brief message, and a primary call-to-action button (e.g., "No stories yet. Create one.").
- **Loading States:** Use **Skeleton placeholders** that mimic the layout of the incoming data. Avoid spinners except for inline actions (like inside a saving button).
- **Toasts:** Positioned at the bottom-right. Auto-dismiss after 5 seconds.
  - Success = Green
  - Error = Red
  - Info = Blue

## 6. The Test Runner UI
The Test Runner is the heart of Veriflow. It must be distraction-free and highly actionable.
- **Layout:** Vertical checklist. Each step shows the instruction alongside a clear Pass/Fail/Skip toggle.
- **Focus:** The current story (Title, Description, Steps) fills the main content area.
- **Context:** A sidebar or top bar displays a live progress summary (e.g., "4 of 10 tested", pass/fail counts).
- **Real-time Presence:** Show avatars or names of other testers currently active in the session to prevent double-booking and foster collaboration.

## 7. Responsiveness & Accessibility
- **Desktop-First:** Veriflow is a professional work tool. The primary target is Desktop (1280px+).
- **Minimum Supported Width:** 1024px. Below this, display a polite "Best viewed on desktop" notice. No mobile layout is required for v1.
- **Accessibility (a11y) Baseline:**
  - All interactive elements must be keyboard-navigable (visible focus states).
  - **Color is never the only indicator.** Always pair status colors with icons (e.g., ✅ Pass, ❌ Fail) or text labels.
  - Minimum contrast ratio of 4.5:1 for all text.
