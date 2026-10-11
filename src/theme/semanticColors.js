/**
 * EduMate Semantic Color System
 * Maps exact brand tokens (#F1FAEE, #A8DADC, #457B9D, #1D3557) to UI roles.
 * Optimized for rich dark software experience with maximum data visibility.
 */

import { brandColors, neutralColors, functionalColors } from './colors';

export const darkSemanticColors = {
  // Brand hierarchy
  primary: brandColors.cerulean,               // #457B9D (Primary action button / interactive)
  primaryHover: '#386684',
  primaryActive: '#2C526A',
  primaryForeground: brandColors.honeydew,     // #F1FAEE

  secondary: brandColors.frostedBlue,          // #A8DADC (Secondary actions / badges)
  secondaryHover: '#BDEDEF',
  secondaryActive: '#92C6C8',
  secondaryForeground: brandColors.oxfordNavy, // #1D3557

  accent: brandColors.frostedBlue,             // #A8DADC
  accentForeground: brandColors.oxfordNavy,    // #1D3557
  accentHover: '#BDEDEF',

  // Surfaces & Backgrounds (Dark Mode Foundation)
  background: neutralColors.darkPage,          // #0A131F
  surface: neutralColors.darkSurface,          // #112033
  surfaceHover: neutralColors.darkSurfaceHover,// #172C46
  surfaceCard: neutralColors.darkSurfaceCard,  // #13253B
  surfaceElevated: neutralColors.darkSurfaceElevated, // #1D3557 (Oxford Navy)
  surfaceSoft: neutralColors.darkSurfaceSoft,  // #193452
  surfaceSoftSubtle: 'rgba(29, 53, 87, 0.45)',
  highlight: brandColors.oxfordNavy,           // #1D3557
  highlightSubtle: 'rgba(69, 123, 157, 0.2)',

  // Typography (Ultra-readable contrast on dark)
  textPrimary: brandColors.honeydew,           // #F1FAEE (Heading & main text)
  textSecondary: brandColors.frostedBlue,      // #A8DADC (Subtitles & labels)
  textMuted: neutralColors.darkTextMuted,      // #7693A6
  textInverse: brandColors.oxfordNavy,         // #1D3557

  // Borders & Dividers
  border: neutralColors.darkBorder,            // #223E5E
  borderSubtle: neutralColors.darkBorderSubtle,// rgba(168, 218, 220, 0.14)
  borderHover: brandColors.frostedBlue,        // #A8DADC
  divider: neutralColors.darkBorder,

  // States & Interactivity
  focusRing: brandColors.frostedBlue,          // #A8DADC
  selectionBg: brandColors.cerulean,           // #457B9D
  selectionText: brandColors.honeydew,         // #F1FAEE

  // Status / Feedback
  success: functionalColors.success,
  successSurface: functionalColors.successSurface,
  warning: functionalColors.warning,
  warningSurface: functionalColors.warningSurface,
  error: functionalColors.error,
  errorSurface: functionalColors.errorSurface,
  info: brandColors.cerulean,
  infoSurface: functionalColors.infoSurface,
};

export const lightSemanticColors = {
  primary: brandColors.oxfordNavy,             // #1D3557
  primaryHover: '#152842',
  primaryActive: '#0E1C2E',
  primaryForeground: '#FFFFFF',

  secondary: brandColors.cerulean,             // #457B9D
  secondaryHover: '#386684',
  secondaryActive: '#2C526A',
  secondaryForeground: '#FFFFFF',

  accent: brandColors.frostedBlue,             // #A8DADC
  accentForeground: brandColors.oxfordNavy,    // #1D3557
  accentHover: '#92C6C8',

  background: neutralColors.offWhite,          // #F4F8F7
  surface: neutralColors.white,
  surfaceCard: neutralColors.white,
  surfaceHover: '#EBF3F5',
  surfaceElevated: neutralColors.white,
  surfaceSoft: 'rgba(168, 218, 220, 0.25)',
  surfaceSoftSubtle: '#F1FAEE',
  highlight: brandColors.honeydew,             // #F1FAEE
  highlightSubtle: '#F7FCF5',

  textPrimary: brandColors.oxfordNavy,         // #1D3557
  textSecondary: brandColors.cerulean,         // #457B9D
  textMuted: '#6B8798',
  textInverse: '#FFFFFF',

  border: neutralColors.borderNeutral,
  borderSubtle: neutralColors.borderSubtle,
  borderHover: brandColors.cerulean,
  divider: neutralColors.borderNeutral,

  focusRing: brandColors.oxfordNavy,
  selectionBg: brandColors.frostedBlue,
  selectionText: brandColors.oxfordNavy,

  success: functionalColors.success,
  successSurface: functionalColors.successSurface,
  warning: functionalColors.warning,
  warningSurface: functionalColors.warningSurface,
  error: functionalColors.error,
  errorSurface: functionalColors.errorSurface,
  info: brandColors.cerulean,
  infoSurface: functionalColors.infoSurface,
};

// Default to darkSemanticColors as requested
export const semanticColors = darkSemanticColors;

export default semanticColors;
