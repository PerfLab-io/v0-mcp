// Security filtering for log messages
// Prevents sensitive data from being logged

// Common patterns for sensitive information
const SENSITIVE_PATTERNS = {
  // API keys, tokens, secrets, passwords  
  credentials: /(api[\s_-]?key|token|secret|password|auth|bearer|jwt|session[_-]?id)[\s:="'`]+(\S+)/gi,
  
  // Email addresses (considered PII)
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Credit card numbers (basic pattern)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  
  // Phone numbers (US format)
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  
  // Social Security Numbers (US format)
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  
  // URLs with credentials
  urlWithCredentials: /https?:\/\/[^@\/\s]*:[^@\/\s]*@[^\s]*/g,
  
  // Private keys (PEM format indicators)
  privateKey: /-----BEGIN\s+(PRIVATE\s+KEY|RSA\s+PRIVATE\s+KEY)-----[\s\S]*?-----END\s+(PRIVATE\s+KEY|RSA\s+PRIVATE\s+KEY)-----/gi,
};

// Fields that commonly contain sensitive information
const SENSITIVE_FIELD_NAMES = new Set([
  'password', 'secret', 'token', 'key', 'auth', 'authorization', 
  'bearer', 'jwt', 'sessionId', 'session_id', 'apiKey', 'api_key',
  'clientSecret', 'client_secret', 'refreshToken', 'refresh_token',
  'accessToken', 'access_token', 'privateKey', 'private_key',
  'encryptedApiKey', 'encrypted_api_key', 'email', 'phone', 'ssn',
  'creditCard', 'credit_card', 'cardNumber', 'card_number'
]);

export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitive types
  if (typeof data === 'string') {
    return redactString(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  // Handle objects
  if (typeof data === 'object') {
    const redacted: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Check if field name suggests sensitive data
      if (isSensitiveFieldName(key)) {
        redacted[key] = '[REDACTED]';
      } else {
        // Recursively process nested objects/arrays
        redacted[key] = redactSensitiveData(value);
      }
    }
    
    return redacted;
  }

  return data;
}

function redactString(text: string): string {
  let result = text;

  // Apply all sensitive patterns
  Object.entries(SENSITIVE_PATTERNS).forEach(([patternName, regex]) => {
    result = result.replace(regex, (match, keyword, captured) => {
      // For credentials pattern, preserve the field name but redact the value
      if (patternName === 'credentials' && captured) {
        return match.replace(captured, '[REDACTED]');
      }
      // For other patterns, replace entire match
      return '[REDACTED]';
    });
  });

  return result;
}

function isSensitiveFieldName(fieldName: string): boolean {
  const lowerFieldName = fieldName.toLowerCase();
  
  // Direct match
  if (SENSITIVE_FIELD_NAMES.has(lowerFieldName)) {
    return true;
  }
  
  // Pattern matching for variations
  const sensitiveSubstrings = [
    'password', 'secret', 'token', 'key', 'auth', 'bearer', 
    'jwt', 'session', 'api', 'private', 'encrypted'
  ];
  
  return sensitiveSubstrings.some(substring => 
    lowerFieldName.includes(substring)
  );
}

// Utility function to safely log data with automatic redaction
export function createSafeLogData(originalData: any): any {
  try {
    return redactSensitiveData(originalData);
  } catch (error) {
    // If redaction fails, return a safe error message
    return {
      error: 'Failed to process log data',
      originalType: typeof originalData,
      message: 'Sensitive data filtering failed - original data redacted for safety'
    };
  }
}

// Test function for verifying redaction (useful for unit tests)
export function testRedaction(testData: any): { original: any; redacted: any } {
  return {
    original: testData,
    redacted: redactSensitiveData(testData)
  };
}