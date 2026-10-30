/**
 * TypoGuard — Safety / Sensitive-Field Engine
 * Phase 4
 *
 * Responsibility:
 * Detect and block sensitive input fields from being captured.
 * Protects passwords, credit cards, secrets, tokens, and other PII.
 *
 * IMPORTANT:
 * This module does NOT:
 * - capture text
 * - store text
 * - communicate with external servers
 */

// Attribute patterns that indicate a sensitive field
const SENSITIVE_ATTRIBUTES = [
  // Input types
  { attribute: 'type', value: 'password' },
  { attribute: 'type', value: 'email' },
  { attribute: 'type', value: 'tel' },
  // Autocomplete values
  { attribute: 'autocomplete', value: 'current-password' },
  { attribute: 'autocomplete', value: 'new-password' },
  { attribute: 'autocomplete', value: 'cc-number' },
  { attribute: 'autocomplete', value: 'cc-exp' },
  { attribute: 'autocomplete', value: 'cc-csc' },
  { attribute: 'autocomplete', value: 'cc-type' },
  { attribute: 'autocomplete', value: 'transaction-amount' },
  { attribute: 'autocomplete', value: 'street-address' },
  { attribute: 'autocomplete', value: 'postal-code' },
  { attribute: 'autocomplete', value: 'cc-family-name' },
  { attribute: 'autocomplete', value: 'cc-given-name' },
  { attribute: 'autocomplete', value: 'cc-additional-name' },
  // Name attribute keywords
  { attribute: 'name', keyword: ['password', 'passwd', 'pass', 'pwd', 'secret', 'token', 'api-key', 'apikey', 'access-token', 'auth', 'credential', 'ssn', 'social-security', 'credit-card', 'creditcard', 'cc-number', 'cvv', 'cvc', 'pin'] },
  // ID attribute keywords
  { attribute: 'id', keyword: ['password', 'passwd', 'pass', 'pwd', 'secret', 'token', 'api-key', 'apikey', 'access-token', 'auth', 'credential', 'ssn', 'social-security', 'credit-card', 'creditcard', 'cc-number', 'cvv', 'cvc', 'pin'] },
  // Placeholder keyword hints
  { attribute: 'placeholder', keyword: ['password', 'secret', 'token', 'api key', 'access token', 'ssn', 'credit card', 'cvv', 'cvc', 'pin'] },
  // ARIA label keyword hints
  { attribute: 'aria-label', keyword: ['password', 'secret', 'token', 'api key', 'access token', 'ssn', 'credit card', 'cvv', 'cvc', 'pin'] },
];

/**
 * Check whether an element is a sensitive field that should NOT be captured.
 *
 * @param {Element} element
 * @returns {boolean} true if the field is sensitive and should be excluded
 */
function isSensitiveField(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  // Check each sensitive attribute pattern
  for (const pattern of SENSITIVE_ATTRIBUTES) {
    const attrValue = element.getAttribute(pattern.attribute);

    if (attrValue === null) {
      continue;
    }

    // Exact match (e.g., type="password")
    if (pattern.value !== undefined && attrValue.toLowerCase() === pattern.value.toLowerCase()) {
      return true;
    }

    // Keyword match (e.g., name contains "password")
    if (pattern.keyword !== undefined) {
      const lowerValue = attrValue.toLowerCase();
      for (const keyword of pattern.keyword) {
        if (lowerValue.includes(keyword.toLowerCase())) {
          return true;
        }
      }
    }
  }

  // Check if element is inside a form with sensitive indication
  const form = element.closest('form');
  if (form) {
    const formAction = form.getAttribute('action') || '';
    const formId = form.getAttribute('id') || '';
    const sensitiveFormKeywords = ['login', 'signin', 'sign-in', 'auth', 'password', 'secret', 'payment', 'checkout'];
    const combined = (formAction + ' ' + formId).toLowerCase();
    for (const keyword of sensitiveFormKeywords) {
      if (combined.includes(keyword)) {
        // Only block if the element itself looks like an input/textarea
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          return true;
        }
      }
    }
  }

  return false;
}

// Expose publicly
window.typoGuardSafety = {
  isSensitiveField: isSensitiveField,
  SENSITIVE_ATTRIBUTES: SENSITIVE_ATTRIBUTES,
};