/**
 * EduMate Typography Scale and Text Styles
 */

export const fontFamilies = {
  sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  heading: "'Syne', 'Inter', system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

export const fontSizes = {
  xs: ['0.75rem', { lineHeight: '1rem' }],        // 12px
  sm: ['0.875rem', { lineHeight: '1.25rem' }],    // 14px
  base: ['1rem', { lineHeight: '1.5rem' }],       // 16px
  lg: ['1.125rem', { lineHeight: '1.75rem' }],    // 18px
  xl: ['1.25rem', { lineHeight: '1.75rem' }],     // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
};

export const fontWeights = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
};

export const textStyles = {
  displayHeading: {
    fontFamily: fontFamilies.heading,
    fontWeight: fontWeights.extrabold,
    fontSize: '2rem',
    lineHeight: '2.5rem',
    letterSpacing: '-0.02em',
  },
  sectionHeading: {
    fontFamily: fontFamilies.heading,
    fontWeight: fontWeights.bold,
    fontSize: '1.25rem',
    lineHeight: '1.75rem',
    letterSpacing: '-0.015em',
  },
  cardHeading: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.semibold,
    fontSize: '0.9375rem',
    lineHeight: '1.375rem',
  },
  body: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.normal,
    fontSize: '0.875rem',
    lineHeight: '1.375rem',
  },
  caption: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.medium,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  button: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.semibold,
    fontSize: '0.8125rem',
    lineHeight: '1.25rem',
  },
};

export default { fontFamilies, fontSizes, fontWeights, textStyles };
