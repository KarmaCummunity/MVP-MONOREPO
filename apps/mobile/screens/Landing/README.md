# Landing Page Module

## Overview

The Landing Page module is the main entry point for new visitors to the Karma Community platform. It provides a comprehensive, marketing-focused view of the platform's features, vision, and community impact.

## Architecture

```
Landing/
├── components/           # Reusable UI components
│   ├── Feature.tsx      # Feature card component
│   ├── FloatingMenu.tsx # Navigation menu
│   ├── HeroSection.tsx  # Hero section with CTAs
│   ├── LazySection.tsx  # Lazy loading wrapper
│   ├── Section.tsx      # Generic section wrapper
│   └── index.ts         # Component exports
├── constants/           # Configuration and constants
│   └── index.ts        # All constants
├── styles/             # StyleSheet definitions
│   └── index.ts       # All styles (to be created)
├── types/              # TypeScript definitions
│   └── index.ts       # Type definitions
├── utils/              # Helper functions
│   └── index.ts       # Utility functions
├── LandingSiteScreen.tsx  # Main screen component
└── README.md          # This file
```

## Components

### Core Components

#### `LandingSiteScreen`
Main orchestrator component that manages:
- State management for stats, modals, and navigation
- Data fetching from backend
- Section rendering and lazy loading
- Analytics tracking

#### `HeroSection`
Landing hero with:
- Animated entrance effects
- Logo and tagline
- Core values display
- Primary CTAs (WhatsApp, Donate)

#### `FloatingMenu`
Sticky navigation menu with:
- Collapsible states (minimized/expanded)
- Active section highlighting
- Smooth scrolling to sections
- Responsive sizing

#### `LazySection`
Performance wrapper that:
- Implements lazy loading for sections
- Uses IntersectionObserver (native)
- Immediate loading on web for SEO
- Loading indicators

### Utility Components

#### `Section`
Standardized section wrapper with:
- Title and subtitle
- Decorative underline
- Consistent spacing
- Web ID for navigation

#### `Feature`
Feature card display with:
- Emoji icons
- Title and description
- Optional green accent
- Consistent styling

## Types

All TypeScript interfaces are centralized in `types/index.ts`:

- `LandingStats` - Platform statistics structure
- `MenuItem` - Navigation menu configuration
- `SectionProps` - Section component props
- `FeatureProps` - Feature card props
- `FloatingMenuProps` - Menu component props
- And more...

## Constants

Configuration values in `constants/index.ts`:

- `SCREEN_WIDTH` - Current device width
- `IS_WEB` - Platform detection
- `IS_MOBILE_WEB` - Mobile web detection
- `MENU_ITEMS` - Navigation menu configuration
- `WHATSAPP_URL` - Contact URL
- `DEFAULT_STATS` - Fallback statistics
- `ANIMATION_DURATION` - Animation timing

## Utilities

Helper functions in `utils/index.ts`:

- `getSectionElement()` - Get DOM element by section ID
- `getMenuSizes()` - Calculate responsive menu dimensions
- `formatNumber()` - Format numbers with locale
- `formatCurrency()` - Format currency amounts
- `scrollToSection()` - Smooth scroll to section
- `isInViewport()` - Check element visibility

## Usage

### Basic Implementation

```tsx
import LandingSiteScreen from './screens/Landing/LandingSiteScreen';

// In your navigation stack
<Stack.Screen 
  name="LandingSite" 
  component={LandingSiteScreen} 
  options={{ headerShown: false }}
/>
```

### Using Individual Components

```tsx
import { HeroSection, Section, Feature } from './screens/Landing/components';

// Use in your custom landing page
<HeroSection onDonate={handleDonate} />

<Section id="features" title="תכונות" subtitle="מה אנחנו מציעים">
  <Feature 
    emoji="🎯" 
    title="תכלית ברורה" 
    text="מערכת ברורה ושקופה"
    greenAccent
  />
</Section>
```

## Performance Considerations

### Lazy Loading
- Sections load only when near viewport (native)
- Immediate load on web for SEO
- 100px rootMargin for smooth UX

### Optimizations
- Memoized callbacks with `useCallback`
- Efficient re-renders
- Image optimization
- Minimal animation overhead

## Accessibility

### ARIA Support
- All interactive elements have `accessibilityLabel`
- Proper `accessibilityRole` for buttons
- Semantic heading structure

### Keyboard Navigation
- Tab order follows visual flow
- Enter/Space activate buttons
- Escape closes modals

## Responsive Design

### Breakpoints
- **Mobile Web**: ≤ 768px
- **Tablet**: 769px - 1024px  
- **Desktop**: > 1024px

### Adaptive Sizing
All text, spacing, and components scale based on:
- `IS_MOBILE_WEB` flag
- `IS_TABLET` flag
- `SCREEN_WIDTH` calculations

## Analytics

### Tracked Events
- Page mount/unmount
- Section navigation
- Button clicks (Donate, WhatsApp, Go to App)
- Modal open/close
- Stats fetching

### Logger Usage
```tsx
logger.info('LandingSiteScreen', 'Event description', { data });
logger.error('LandingSiteScreen', 'Error message', error);
```

## Future Improvements

### Planned Enhancements
1. ✅ Extract all sections to separate files
2. ✅ Create comprehensive type definitions
3. ✅ Centralize constants and configuration
4. 🔄 Extract styles to separate module
5. ⏳ Add unit tests for components
6. ⏳ Implement E2E tests
7. ⏳ Add performance monitoring
8. ⏳ Optimize bundle size with code splitting
9. ⏳ Add internationalization (i18n)
10. ⏳ Implement A/B testing framework

### Migration Status
- ✅ Folder structure created
- ✅ Types defined
- ✅ Constants extracted
- ✅ Utils created
- ✅ Core components extracted (Hero, Menu, Section, Feature)
- 🔄 Remaining sections to extract
- ⏳ Styles module
- ⏳ Tests

## Contributing

When adding new sections or features:

1. **Create component file** in `components/`
2. **Define types** in `types/index.ts`
3. **Add constants** in `constants/index.ts` if needed
4. **Export component** in `components/index.ts`
5. **Document with JSDoc** comments
6. **Add to README** with usage examples
7. **Test responsive behavior** on all breakpoints
8. **Check accessibility** with screen reader
9. **Log analytics events** for tracking

## Support

For questions or issues:
- Contact: Karma Community Dev Team
- WhatsApp: +972-52-861-6878
- Email: [Contact through platform]

---

**Version**: 2.0.0  
**Last Updated**: 2026-02-17  
**Status**: 🔄 In Progress (Refactoring from monolithic to modular)
