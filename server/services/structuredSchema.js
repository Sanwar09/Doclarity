export const LEGAL_DASHBOARD_SCHEMA = {
  type: 'object',
  required: [
    'document_type',
    'risk_level',
    'risk_score',
    'risk_signals',
    'deadlines',
    'money_terms',
    'priority_clauses',
    'key_benefits',
    'important_dates',
    'key_points'
  ],
  properties: {
    document_type: { type: 'string' },
    risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
    risk_score: { type: 'number', minimum: 0, maximum: 100 },
    risk_signals: { type: 'array', items: { type: 'string' } },
    deadlines: { type: 'array', items: { type: 'string' } },
    money_terms: { type: 'array', items: { type: 'string' } },
    priority_clauses: {
      type: 'array',
      items: {
        anyOf: [
          { type: 'string' },
          {
            type: 'object',
            required: ['clause_type', 'importance', 'evidence'],
            properties: {
              clause_type: { type: 'string' },
              importance: { type: 'string', enum: ['low', 'medium', 'high'] },
              evidence: { type: 'string' },
              explanation: { type: 'string' }
            }
          }
        ]
      }
    },
    key_benefits: { type: 'array', items: { type: 'string' } },
    important_dates: { type: 'array', items: { type: 'string' } },
    key_points: { type: 'array', items: { type: 'string' } }
  }
};

export function validateLegalDashboardSchema(payload) {
  const errors = [];
  const schema = LEGAL_DASHBOARD_SCHEMA;

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['Payload must be an object.'] };
  }

  for (const field of schema.required) {
    if (!(field in payload)) errors.push(`Missing required field: ${field}`);
  }

  validateType(payload.document_type, 'string', 'document_type', errors);
  validateEnum(payload.risk_level, ['low', 'medium', 'high'], 'risk_level', errors);

  if (typeof payload.risk_score !== 'number' || Number.isNaN(payload.risk_score)) {
    errors.push('risk_score must be a number.');
  } else if (payload.risk_score < 0 || payload.risk_score > 100) {
    errors.push('risk_score must be between 0 and 100.');
  }

  validateStringArray(payload.risk_signals, 'risk_signals', errors);
  validateStringArray(payload.deadlines, 'deadlines', errors);
  validateStringArray(payload.money_terms, 'money_terms', errors);
  validateStringArray(payload.key_benefits, 'key_benefits', errors);
  validateStringArray(payload.important_dates, 'important_dates', errors);
  validateStringArray(payload.key_points, 'key_points', errors);

  if (!Array.isArray(payload.priority_clauses)) {
    errors.push('priority_clauses must be an array.');
  } else {
    payload.priority_clauses.forEach((item, idx) => {
      if (typeof item === 'string') return;
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`priority_clauses[${idx}] must be string or object.`);
        return;
      }
      ['clause_type', 'importance', 'evidence'].forEach((k) => {
        if (!item[k]) errors.push(`priority_clauses[${idx}] missing ${k}`);
      });
      if (item.importance && !['low', 'medium', 'high'].includes(String(item.importance).toLowerCase())) {
        errors.push(`priority_clauses[${idx}].importance must be low|medium|high`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

function validateType(value, type, label, errors) {
  if (typeof value !== type) errors.push(`${label} must be ${type}.`);
}

function validateEnum(value, allowed, label, errors) {
  if (!allowed.includes(String(value || '').toLowerCase())) {
    errors.push(`${label} must be one of: ${allowed.join(', ')}`);
  }
}

function validateStringArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  value.forEach((v, idx) => {
    if (typeof v !== 'string') errors.push(`${label}[${idx}] must be a string.`);
  });
}
