/**
 * Modern Animation & Transition Utilities
 * Smooth, professional animations for StudyBee UI
 * Used across all components for consistent feel
 */

export const animationClasses = {
  // Fade animations
  fadeIn: 'animate-in fade-in duration-150',
  fadeInSlow: 'animate-in fade-in duration-300',
  fadeOut: 'animate-out fade-out duration-150',

  // Scale animations (Hover effects)
  scaleUp: 'hover:scale-105 transition-transform duration-150',
  scaleDown: 'active:scale-95 transition-transform duration-100',

  // Slide animations
  slideInRight: 'animate-in slide-in-from-right duration-200',
  slideOutLeft: 'animate-out slide-out-to-left duration-200',
  slideInUp: 'animate-in slide-in-from-bottom duration-200',

  // Lift effect (cards on hover)
  liftCard: 'hover:-translate-y-1 transition-all duration-200 hover:shadow-lg',

  // Smooth color transitions
  colorTransition: 'transition-colors duration-200',

  // Smooth all transitions
  smoothAll: 'transition-all duration-200',

  // Glow effect
  glowPurple: 'hover:shadow-[0_0_20px_rgba(91,33,182,0.3)] transition-shadow duration-300',
  glowCyan: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-shadow duration-300',
};

/**
 * Add these to your Tailwind config or use as className strings
 */
export const customAnimations = `
  @keyframes slideInFromRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideOutToLeft {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(-100%); opacity: 0; }
  }

  @keyframes slideInFromBottom {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @keyframes gradientShimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(91, 33, 182, 0.3); }
    50% { box-shadow: 0 0 30px rgba(91, 33, 182, 0.5); }
  }
`;

/**
 * Smooth scroll behavior
 */
export const smoothScroll = 'scroll-smooth';

/**
 * Gradient backgrounds for modern look
 */
export const gradients = {
  purpleToCyan: 'bg-gradient-to-r from-[#5B21B6] to-[#06B6D4]',
  purpleToEmerald: 'bg-gradient-to-r from-[#5B21B6] to-[#10B981]',
  darkToSlate: 'bg-gradient-to-b from-[#0F172A] to-[#1A2840]',
};
