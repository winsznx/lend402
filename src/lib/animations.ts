export const ANIMATION_CLASSES = {
  fadeIn: "animate-[fadeIn_0.2s_ease-out]",
  fadeOut: "animate-[fadeOut_0.15s_ease-in]",
  slideUp: "animate-[slideUp_0.22s_cubic-bezier(0.22,1,0.36,1)]",
  slideDown: "animate-[slideDown_0.22s_cubic-bezier(0.22,1,0.36,1)]",
  scaleIn: "animate-[scaleIn_0.15s_ease-out]",
  pulse: "animate-pulse",
  spin: "animate-spin",
} as const;

export type AnimationPreset = keyof typeof ANIMATION_CLASSES;
