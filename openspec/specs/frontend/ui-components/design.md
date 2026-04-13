# Design: UI Component Library

## Technical Approach

The application uses a **custom UI component library** built on Tailwind CSS utility classes, providing consistent, reusable primitives (Button, Input, Card, Select, Badge) used throughout the application. Components follow the **variant/size pattern** with Tailwind class maps and extend native HTML element props via **`React.forwardRef`** for full compatibility with forms, refs, and third-party libraries.

The library is intentionally lightweight — no external component library dependency (shadcn/ui, Material UI, Chakra UI, Headless UI) is used. Each component is a thin wrapper around native HTML elements with consistent styling, dark mode support, and className merging for consumer customization.

## Architecture Decisions

### Decision: Custom UI Library (No External Component Library)

A **custom component library** is built from scratch rather than adopting shadcn/ui, Material UI, Chakra UI, or another pre-built component system.

The application's UI needs are modest — buttons, inputs, cards, selects, and badges cover 90%+ of the UI surface. These components are simple to implement with Tailwind CSS and don't benefit from the abstraction layers, theming systems, or accessibility features that large component libraries provide. More importantly, external libraries impose their own design opinions, styling systems, and update cadences that can conflict with project needs.

*Tradeoffs:* Custom components require implementing accessibility features (focus management, ARIA attributes, keyboard navigation) that mature libraries include by default. For simple components (Button, Input), native HTML elements provide adequate accessibility. For complex components (modals, dropdowns, date pickers), accessibility is harder to get right — if these are needed, adopting Headless UI (unstyled, accessible primitives) for just those components would be preferable to building custom accessible implementations.

The main risk is reinventing the wheel — spending time on component implementation that a library would provide for free. For the current component count (5 primitives), the implementation cost is low (~50-100 lines per component). The long-term maintenance cost is also low since these components rarely change once established.

*Alternatives considered:* shadcn/ui (rejected: while it's copy-paste rather than a dependency, it brings its own patterns, cn() utility, and Radix UI dependencies that add complexity), Material UI (rejected: heavy bundle, strong design opinion that's hard to customize to match a custom design), Chakra UI (rejected: CSS-in-JS runtime conflicts with Tailwind utility-first approach), Headless UI (considered for complex components: provides accessible primitives without styling, good complement to custom styled components).

### Decision: React.forwardRef with Native HTML Element Props

Components extend native HTML element props via **`React.forwardRef`** and type extensions like `ButtonHTMLAttributes<HTMLButtonElement>`, `InputHTMLAttributes<HTMLInputElement>`, etc.

This ensures components are **drop-in replacements for native HTML elements** — any prop you can pass to a `<button>` can be passed to `<Button>`, any prop for `<input>` works on `<Input>`. forwardRef enables parent components and form libraries to attach refs to the underlying DOM element. This approach follows the principle of least surprise: the custom component behaves exactly like its native counterpart with additional styling.

*Tradeoffs:* `forwardRef` adds a layer of indirection and makes the component definition slightly more verbose (the `forwardRef` wrapper and explicit type annotation). React 19 may simplify ref forwarding with the `ref` prop being automatically forwarded, which could allow removing the `forwardRef` wrapper in the future. The native props extension means the component accepts all HTML attributes, including ones that may conflict with custom props (e.g., a custom `size` prop vs. the native `size` attribute on `<input>`). Careful prop naming avoids this.

*Alternatives considered:* Props interface without native extension (rejected: consumers can't pass standard HTML attributes like `disabled`, `aria-label`, `data-*`), class components with ref (rejected: class components are legacy pattern), custom hook returning props to spread on native elements (rejected: more verbose for consumers, loses the component abstraction).

### Decision: Variant/Size Pattern with Tailwind Class Maps

Components support **variants** (e.g., Button: `primary`, `secondary`, `outline`, `ghost`, `destructive`) and **sizes** (e.g., `sm`, `md`, `lg`) via props, with each combination mapped to a set of Tailwind classes in a **plain object map**.

```
const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  ...
}
```

This pattern is predictable, easy to maintain, and produces optimal Tailwind output (all classes are statically analyzable by Tailwind's JIT compiler). Adding a new variant is a one-line addition to the map. The pattern is consistent across all components — once a developer understands how Button variants work, they understand Input, Badge, and all other components.

*Tradeoffs:* Static class maps can't express dynamic styles (e.g., a color prop that accepts any Tailwind color). This is intentional — a constrained set of variants ensures design consistency. If arbitrary colors are needed, the `className` prop provides an escape hatch. The class map approach also means variant combinations are predefined — a variant/size combination that doesn't have explicit styling uses default composition, which may occasionally produce unexpected results.

*Alternatives considered:* cva (class-variance-authority) (considered: formalizes the variant pattern with a library, but adds a dependency for what's essentially an object lookup), Tailwind `@apply` in CSS modules (rejected: moves styling out of components, loses colocation benefit), dynamic class generation (rejected: breaks Tailwind JIT, classes must be statically present in source).

### Decision: Composable Card Sub-Component Pattern

The Card component uses a **composable sub-component pattern** (`Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`) rather than a props-based configuration where all content is passed as props.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Pet Details</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

The composable pattern provides **maximum flexibility** — consumers choose which sub-components to include, in what order, and with what content. A props-based approach (`<Card title="Pet Details" content={...} footer={...}>`) constrains the structure and makes complex content (JSX in props) awkward. The composable pattern also matches the pattern established by shadcn/ui and Radix UI, making it familiar to the React ecosystem.

*Tradeoffs:* Composable sub-components require more JSX to use (more lines of code per Card instance). For simple cards, a props-based API would be more concise. However, the verbosity pays for itself in complex cases where cards contain dynamic content, conditional sections, or custom layouts within sections. The sub-components are also independently styled, making it easy to customize individual sections.

*Alternatives considered:* Props-based configuration (rejected: inflexible for complex content, JSX-in-props is awkward), render props (rejected: unnecessarily complex for structural composition), single Card component with class-based internal structure (rejected: pushes layout knowledge to consumers, no consistent internal structure).

### Decision: Consistent Design Tokens

All components share **consistent design tokens** expressed as Tailwind classes: `rounded-lg` or `rounded-xl` for border radius, standardized shadow levels, consistent `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2` for focus indicators, and `transition-colors duration-200` for interactive state changes.

Design tokens ensure visual coherence — buttons, cards, inputs, and badges feel like they belong to the same design system. The tokens are applied directly as Tailwind classes (not as CSS custom properties or a theme object) because Tailwind's utility-first approach makes class-based tokens the natural expression.

*Tradeoffs:* Tailwind class tokens are scattered across component files rather than centralized in a theme file. Changing a global design decision (e.g., switching from `rounded-lg` to `rounded-md`) requires updating multiple component files. A centralized token file (mapping token names to Tailwind classes) would centralize changes but adds a layer of indirection. For 5 components, the maintenance cost of direct classes is low; if the component count grows significantly, centralized tokens should be considered.

*Alternatives considered:* CSS custom properties (rejected: adds a parallel styling system alongside Tailwind), centralized token object mapped to Tailwind classes (considered for future: useful at scale, unnecessary for 5 components), Tailwind theme extension in config (partially used: custom colors are defined in tailwind.config.ts, but per-component tokens like border radius are applied directly).

### Decision: Dark Mode via Tailwind dark: Prefix

All components include **`dark:` variant classes** for dark mode support, co-located with their light mode counterparts in the class maps.

```
'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
```

Co-locating light and dark styles makes it easy to see and maintain both variants together. Tailwind's `dark:` prefix is the native mechanism for class-based dark mode and integrates seamlessly with the theme toggle system.

*Tradeoffs:* Dark mode classes roughly double the class count per element, making class strings longer and harder to read. For frequently repeated patterns, extracting to the variant class maps keeps the component JSX clean. The visual noise of long class strings is a known Tailwind tradeoff accepted for the colocation and utility-first benefits.

### Decision: className Prop Merging

All components accept a **`className` prop** that is **merged with the component's base classes**, allowing consumers to add custom styles without overriding the component's structural styling.

This provides an escape hatch for one-off customizations (extra margin, custom width, specific background) without requiring a new variant for every possible style combination. The merge is a simple string concatenation — consumer classes appear after component classes, allowing CSS specificity to handle overrides when needed.

*Tradeoffs:* Simple string concatenation can cause Tailwind class conflicts (e.g., component has `bg-blue-600`, consumer passes `bg-red-600` — both are present, last one wins based on CSS source order, which may not be the consumer's class). A utility like `tailwind-merge` resolves conflicts by intelligently deduplicating Tailwind classes, but adds a dependency. For the current components, conflicts are rare since consumers typically add supplementary styles (margin, width) rather than overriding core styles. If conflicts become an issue, `tailwind-merge` can be adopted.

*Alternatives considered:* tailwind-merge / clsx / cn() utility (considered: would handle conflicts properly, adds dependency — can be adopted later if needed), style prop only (rejected: less powerful than className, can't express pseudo-states or responsive variants), no customization escape hatch (rejected: forces new variants for every one-off need, component library becomes a bottleneck).

## Data Flow

1. **Component consumption** -> Consumer imports component (e.g., `import { Button } from '@/components/ui/Button'`) -> Passes variant, size, and any native HTML props -> Component resolves variant/size to Tailwind class map -> Merges with consumer's className -> Renders native HTML element with combined classes and forwarded ref
2. **Card composition** -> Consumer composes Card with sub-components -> Each sub-component applies its section-specific styles -> Card wrapper provides border, shadow, background -> Sub-components provide padding, typography, spacing
3. **Theme response** -> Parent element (or `<html>`) has/lacks `dark` class -> Tailwind `dark:` variants activate/deactivate automatically -> No JavaScript needed for style switching, pure CSS

## Key Files

- **`src/components/ui/Button.tsx`** — Button component with variants (primary, secondary, outline, ghost, destructive), sizes (sm, md, lg), loading state with spinner, and full ButtonHTMLAttributes extension via forwardRef.
- **`src/components/ui/Input.tsx`** — Input component with consistent border, focus ring, placeholder styling, error state (red border), and full InputHTMLAttributes extension via forwardRef. Supports label prop for integrated label rendering.
- **`src/components/ui/Card.tsx`** — Composable card with sub-components (Card, CardHeader, CardTitle, CardContent, CardFooter). Provides border, shadow, rounded corners, and background with dark mode support. Each sub-component is independently exported.
- **`src/components/ui/Select.tsx`** — Select dropdown with consistent styling matching Input component. Custom chevron icon, variant support, and full SelectHTMLAttributes extension via forwardRef.
- **`src/components/ui/Badge.tsx`** — Inline status badge with variant-based coloring (default, success, warning, destructive, info). Used for schedule status, user roles, and pet attributes throughout the application.
