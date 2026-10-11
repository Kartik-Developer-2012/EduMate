/**
 * EduMate Unified Design System & Theme Engine
 * Centralized Single Source of Truth
 */

import { brandColors, neutralColors, functionalColors } from './colors';
import { semanticColors, lightSemanticColors, darkSemanticColors } from './semanticColors';
import { fontFamilies, fontSizes, fontWeights, textStyles } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';

export {
  brandColors,
  neutralColors,
  functionalColors,
  semanticColors,
  lightSemanticColors,
  darkSemanticColors,
  fontFamilies,
  fontSizes,
  fontWeights,
  textStyles,
  spacing,
  radius,
  shadows,
};

export const theme = {
  colors: {
    brand: brandColors,
    neutral: neutralColors,
    functional: functionalColors,
    semantic: semanticColors,
  },
  typography: {
    families: fontFamilies,
    sizes: fontSizes,
    weights: fontWeights,
    styles: textStyles,
  },
  spacing,
  radius,
  shadows,
};

export default theme;
