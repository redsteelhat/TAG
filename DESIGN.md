---
name: Fiscal Driver Pro
colors:
  surface: '#FFFFFF'
  surface-dim: '#d7dadb'
  surface-bright: '#f7fafb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f5'
  surface-container: '#ebeeef'
  surface-container-high: '#e5e9ea'
  surface-container-highest: '#e0e3e4'
  on-surface: '#181c1d'
  on-surface-variant: '#3e4947'
  inverse-surface: '#2d3132'
  inverse-on-surface: '#eef1f2'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#51606b'
  on-secondary: '#ffffff'
  secondary-container: '#d2e2ee'
  on-secondary-container: '#56656f'
  tertiary: '#005f29'
  on-tertiary: '#ffffff'
  tertiary-container: '#087a38'
  on-tertiary-container: '#a3ffb2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#d5e5f1'
  secondary-fixed-dim: '#b9c9d5'
  on-secondary-fixed: '#0e1d26'
  on-secondary-fixed-variant: '#3a4953'
  tertiary-fixed: '#95f8a7'
  tertiary-fixed-dim: '#79db8d'
  on-tertiary-fixed: '#00210a'
  on-tertiary-fixed-variant: '#005323'
  background: '#f7fafb'
  on-background: '#181c1d'
  surface-variant: '#e0e3e4'
  surface-muted: '#EDF2F4'
  border: '#D9E2E6'
  text-main: '#152028'
  profit: '#15803D'
  loss: '#B42318'
  warning: '#B54708'
  fuel: '#2563EB'
  package: '#7C3AED'
  depreciation: '#93370D'
typography:
  metric-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '750'
    lineHeight: 42px
    letterSpacing: -0.02em
  metric-md:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '750'
    lineHeight: 34px
    letterSpacing: -0.01em
  metric-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
  display-md:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '650'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '650'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 24px
  margin-mobile: 18px
  margin-desktop: 28px
  gutter: 16px
---

## Brand & Style

The design system is engineered for the **independent financial management of TAG drivers**. It moves away from the playful or consumer-oriented aesthetics of parent ride-sharing platforms to establish a **professional, analytical, and reliable** atmosphere. The target audience is drivers who need to treat their operation as a business, requiring clarity on net profit, fuel costs, and depreciation.

The chosen design style is **Corporate / Modern with a focus on Financial Utility**. 
- **Minimalism & Precision:** High whitespace and a strict grid system ensure that data-heavy screens remain scannable during field operations.
- **High-Contrast Reliability:** Deep teal and slate tones provide a serious financial character, ensuring readability in various lighting conditions (cabin use, bright sunlight, or night driving).
- **Tactile Card System:** Using subtle shadows and defined borders to create clear "buckets" of information, making the interface feel structured and trustworthy.

## Colors

The palette is anchored by **Teal (Primary)** for actions and **Slate (Secondary)** for structural elements, creating a neutral yet professional financial environment.

- **Primary & Actions:** Teal (#0F766E) is used for the most important CTAs and active states. It signals a "go" state that is more sophisticated than standard green.
- **Semantic Finance:** Colors carry strict functional meaning. **Success/Profit** uses emerald tones, **Loss/Danger** uses high-visibility red, and **Warning/Estimated** uses amber to signal data that is not yet finalized (e.g., estimated fuel costs).
- **Data Categorization:** Specialized colors are assigned to expense types (Fuel: Blue, Package: Purple, Fixed: Gray) to allow for instant visual recognition in breakdown charts without reading labels.
- **Surface Strategy:** The UI uses a "Cold Neutral" background (#F4F7F8) to reduce glare and a pure White (#FFFFFF) surface for cards to create a clear layer of elevation.

## Typography

Typography is systematic and prioritizes **numerical legibility**. We use **Inter** for its neutral, highly readable glyphs, especially for financial figures.

- **Metrics:** Special "Metric" levels are used for net profit and balance displays. These have tighter letter spacing and heavier weights to command attention.
- **Hierarchy:** We avoid "Hero" sizes in operational screens. Content stays within the 13px–16px range for maximum data density without sacrificing readability.
- **Alignment Rules:** In tables and lists, all monetary values must be **right-aligned** to allow for easy vertical comparison of decimal points and magnitudes.
- **Mobile Scaling:** Headline sizes are capped at 24px on mobile to ensure labels don't wrap awkwardly. Metric sizes remain large as they are the primary "answer" on the dashboard.

## Layout & Spacing

This design system utilizes a **fixed-fluid hybrid grid** based on a strict **4px/8px baseline rhythm**.

- **Desktop Layout:** A 12-column grid is used for the main dashboard. The layout typically features a fixed-width sidebar (280px) and a two-column main area (Main Content: 8 columns, Side Utility/Actions: 4 columns). 
- **Mobile Layout:** Content reflows into a single column with a fixed margin of 18px. Navigation moves to a bottom tab bar to accommodate one-handed operation.
- **Touch Targets:** All interactive elements (buttons, inputs) maintain a minimum height of 44px on web and 52px on mobile to account for field use conditions.
- **Data Density:** Table rows are standardized at 48px height to balance scanability with touch accuracy.

## Elevation & Depth

Visual hierarchy is primarily established through **Tonal Layers** and **Ambient Shadows**.

- **Base Layer:** The background (#F4F7F8) acts as the canvas.
- **Surface Layer:** White cards (#FFFFFF) are placed on the background with a 1px border (#D9E2E6).
- **Elevation Shadows:** Cards use a very soft, diffused shadow (`0 16px 44px rgba(21, 32, 40, 0.07)`) to lift them from the background without creating visual noise.
- **Interactive Depth:** On hover or active states, the shadow deepens slightly, and the border color darkens to #B8C8CF, providing tactile feedback that the element is "pressable."
- **Overlays:** Drawers and Modals use a semi-transparent backdrop (`rgba(21, 32, 40, 0.4)`) to focus the user on the financial entry task.

## Shapes

The shape language is **Rounded (8px)**, striking a balance between modern friendliness and professional structure.

- **Standard Radius:** All cards, buttons, and input fields use an 8px (0.5rem) radius.
- **Pill Shapes:** Reserved exclusively for **Status Badges** (e.g., "Completed", "Active") and **Delta Indicators** (e.g., "+12%"). This distinction helps users quickly identify status-related metadata versus actionable buttons.
- **Mobile Drawers:** Bottom sheets on mobile use a 12px top-radius to provide a softer, more native feel when swiping up.

## Components

- **Metric Cards:** The centerpiece of the dashboard. They must include a title (muted), a large primary value, and an optional "Delta" badge. Background is always white; icons are mandatory for categorical identification (e.g., Fuel, Profit).
- **Buttons:** 
  - **Primary:** Solid Teal fill, white text. No shadow on rest, subtle lift on hover.
  - **Secondary:** White fill, 1px border.
  - **Action Bar:** On mobile, a fixed floating action bar provides immediate access to "+ Sefer" and "+ Gider".
- **Inputs:** Fields must use a persistent label above the input. Placeholder text should only be used for example formats (e.g., "0,00 TL"). Focus state is indicated by a Teal border and a 3px soft outer glow.
- **Chips / Badges:** Used for filtering and status. Profit-related chips use light green backgrounds; expense-related chips use neutral or category-specific colors.
- **Profit Breakdown Drawer:** A specialized component that uses a vertical list to show the "waterfall" of deductions (Revenue -> Expenses -> Net Profit). It uses divider lines to separate "Cash Profit" from "Real Profit" (including depreciation).
- **Shift Status Card:** A persistent header component. When "Active," it displays a pulse animation next to a "Live" timer to indicate ongoing tracking.