/**
 * EduMate Brand Color Palette
 * Authoritative single source of truth based on exact HEX swatches:
 * 1. Honeydew:     #F1FAEE
 * 2. Frosted Blue: #A8DADC
 * 3. Cerulean:     #457B9D
 * 4. Oxford Navy:  #1D3557
 */

export const brandColors = {
  // Exact Swatches
  oxfordNavy: '#1D3557',     // Deepest brand foundation, elevated dark surfaces, navigation
  cerulean: '#457B9D',       // Primary interactive actions, buttons, active highlights
  frostedBlue: '#A8DADC',    // Secondary brand, accents, progress bars, active badges, icons
  honeydew: '#F1FAEE',       // Crisp text, high-visibility contrast, headings, warm highlights

  // Backwards-compatible aliases
  darkTeal: '#1D3557',
  seaGreen: '#457B9D',
  celadon: '#A8DADC',
  teaGreen: '#A8DADC',
  vanillaCream: '#F1FAEE',
};

export const neutralColors = {
  // Dark mode surfaces (Primary & Default Experience)
  darkPage: '#0A131F',              // Deepest midnight navy canvas
  darkSurface: '#112033',           // Refined dark card surface
  darkSurfaceHover: '#172C46',      // Card surface hover
  darkSurfaceCard: '#13253B',       // Elevated panel
  darkSurfaceElevated: '#1D3557',   // Exact Oxford Navy elevated container
  darkSurfaceSoft: '#193452',       // Soft supporting surface
  darkBorder: '#223E5E',            // Subtle navy border
  darkBorderSubtle: 'rgba(168, 218, 220, 0.14)',
  darkBorderHover: '#A8DADC',       // Frosted Blue hover border
  darkTextPrimary: '#F1FAEE',       // Exact Honeydew - crystal-clear contrast
  darkTextSecondary: '#A8DADC',     // Exact Frosted Blue - soft, readable
  darkTextMuted: '#7693A6',

  // Light mode neutrals
  offWhite: '#F4F8F7',
  white: '#FFFFFF',
  charcoal: '#1D3557',
  mutedNeutral: '#457B9D',
  borderNeutral: '#D6E4E5',
  borderSubtle: '#E8F1F2',
};

export const functionalColors = {
  success: '#2A9D8F',
  successSurface: 'rgba(42, 157, 143, 0.2)',
  warning: '#E76F51',
  warningSurface: 'rgba(231, 111, 81, 0.2)',
  error: '#E63946',
  errorSurface: 'rgba(230, 57, 70, 0.2)',
  info: brandColors.cerulean,
  infoSurface: 'rgba(69, 123, 157, 0.2)',
};

export default brandColors;
