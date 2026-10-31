// TypoGuard — AI Importance Filtering (Phase 3)
// On-device importance scoring for captured text.
// Uses heuristics + optional TinyML model integration.

// Importance thresholds
const IMPORTANCE_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 1.0,
};

// Importance categories
const IMPORTANCE_CATEGORIES = {
  CODE: 'code',
  PROMPT: 'ai-prompt',
  NOTE: 'note',
  FORM: 'form-data',
  GENERAL: 'general',
  UNKNOWN: 'unknown',
};

/** Heuristic importance scoring (used when ML model unavailable) */
function scoreImportance(features) {
  let score = 0.5; // neutral default

  // Boost based on features
  if (features.fontSize && features.fontSize > 16) score += 0.1;
  if (features.fontWeight && features.fontWeight >= 700) score += 0.15;
  if (features.isContentEditable && features.selectionDuration > 3000) score += 0.1;
  if (features.textLength && features.textLength > 100) score += 0.1;
  if (features.hasMonospaceFont) score += 0.1;
  if (features.formFieldType) score += 0.05;

  return Math.min(score, 1.0);
}

/** Classify importance score into categories */
function classifyImportance(score) {
  if (score >= IMPORTANCE_THRESHOLDS.HIGH) return IMPORTANCE_CATEGORIES.CODE;
  if (score >= IMPORTANCE_THRESHOLDS.MEDIUM) return IMPORTANCE_CATEGORIES.PROMPT;
  return IMPORTANCE_CATEGORIES.GENERAL;
}

/** Extract features from a DOM element */
function extractFeatures(element) {
  try {
    const styles = window.getComputedStyle(element);

    const fontSize = parseFloat(styles.fontSize);
    const fontWeight = parseFloat(styles.fontWeight);
    const isContentEditable = element.isContentEditable;
    const textLength =
      isContentEditable
        ? (element.innerText?.length || 0)
        : element.tagName === 'TEXTAREA'
          ? (element.value?.length || 0)
          : 0;

    const isMonospace =
      /font-family:/i.test(styles.fontFamily)
        ? styles.fontFamily.toLowerCase().includes('monospace')
        : false;

    const formFieldType =
      element.type && /password|email|text|search|textarea|tel|url|number/i.test(
        element.type
      )
        ? element.type
        : null;

    const selectionDuration =
      element.__typoGuardLastSelectionTime__
        ? Date.now() - element.__typoGuardLastSelectionTime__
        : 0;

    const readonly = element.hasAttribute('readonly')
      ? 1
      : 0;

    const isDisabled = element.hasAttribute('disabled') ? 1 : 0;

    return {
      fontSize,
      fontWeight,
      isContentEditable,
      textLength,
      hasMonospaceFont: isMonospace,
      formFieldType,
      selectionDuration,
      readonly,
      isDisabled,
    };
  } catch (err) {
    console.warn('TypoGuard: Failed to extract features', err);
    return {
      fontSize: 0,
      fontWeight: 0,
      isContentEditable: false,
      textLength: 0,
      hasMonospaceFont: false,
      formFieldType: null,
      selectionDuration: 0,
      readonly: 0,
      isDisabled: 0,
    };
  }
}

window.typoGuardImportance = {
  scoreImportance,
  classifyImportance,
  extractFeatures,
};