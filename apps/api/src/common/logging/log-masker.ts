const MASK = '[MASKED]';
const MASKED_EMAIL = '[MASKED_EMAIL]';
const MASKED_PHONE = '[MASKED_PHONE]';
const MASKED_TOKEN = '[MASKED_TOKEN]';
const MASKED_PLATE = '[MASKED_PLATE]';
const MASKED_IP = '[MASKED_IP]';
const MASKED_USER_AGENT = '[MASKED_USER_AGENT]';

const sensitiveKeys = new Set([
  'access_token',
  'accesstoken',
  'authorization',
  'city',
  'cookie',
  'district',
  'dropoff_location',
  'dropofflocation',
  'email',
  'full_name',
  'fullname',
  'gross_income',
  'grossincome',
  'income',
  'ip_address',
  'ipaddress',
  'location',
  'net_profit',
  'netprofit',
  'note',
  'original_name',
  'originalname',
  'password',
  'password_hash',
  'passwordhash',
  'phone',
  'pickup_location',
  'pickuplocation',
  'plate_number',
  'platenumber',
  'receipt_url',
  'receipturl',
  'refresh_token',
  'refresh_token_hash',
  'refreshtoken',
  'refreshtokenhash',
  'set_cookie',
  'setcookie',
  'station_name',
  'stationname',
  'tip_amount',
  'tipamount',
  'token',
  'user_agent',
  'useragent'
]);

const urlSensitiveParams = new Set([
  'access_token',
  'authorization',
  'email',
  'location',
  'password',
  'phone',
  'plate',
  'plate_number',
  'refresh_token',
  'token'
]);

export function maskSensitiveData(value: unknown, key?: string): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (key && isSensitiveKey(key)) {
    return maskSensitiveFieldValue(value, key);
  }

  if (typeof value === 'string') {
    return maskSensitiveString(value);
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskSensitiveData(item));
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      maskSensitiveData(entryValue, entryKey)
    ])
  );
}

export function maskLogMessage(message: string) {
  return maskSensitiveString(message);
}

function maskSensitiveFieldValue(value: unknown, key: string): unknown {
  const normalizedKey = normalizeKey(key);

  if (normalizedKey === 'ipaddress' || normalizedKey === 'ip_address') {
    return typeof value === 'string' ? maskIpAddress(value) : MASKED_IP;
  }

  if (normalizedKey === 'useragent' || normalizedKey === 'user_agent') {
    return MASKED_USER_AGENT;
  }

  if (normalizedKey === 'email') {
    return typeof value === 'string' ? maskEmail(value) : MASKED_EMAIL;
  }

  if (normalizedKey === 'phone') {
    return typeof value === 'string' ? maskPhone(value) : MASKED_PHONE;
  }

  if (normalizedKey === 'plate_number' || normalizedKey === 'platenumber') {
    return MASKED_PLATE;
  }

  return MASK;
}

function maskSensitiveString(value: string) {
  return maskSensitiveQueryParams(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${MASKED_TOKEN}`)
    .replace(
      /\b[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g,
      MASKED_TOKEN
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, (email) =>
      maskEmail(email)
    )
    .replace(
      /\b(?:0[1-9]|[1-7][0-9]|8[01])\s?[A-ZÇĞİÖŞÜ]{1,3}\s?\d{2,5}\b/gi,
      MASKED_PLATE
    )
    .replace(/(?:\+?90\s?)?0?5\d[\d\s().-]{7,}\d/g, (phone) =>
      maskPhone(phone)
    );
}

function maskSensitiveQueryParams(value: string) {
  return value.replace(
    /([?&])([^=\s&]+)=([^&\s]*)/g,
    (match, separator: string, rawKey: string) => {
      const decodedKey = decodeURIComponent(rawKey).toLowerCase();

      if (!urlSensitiveParams.has(decodedKey)) {
        return match;
      }

      return `${separator}${rawKey}=${MASK}`;
    }
  );
}

function maskEmail(value: string) {
  const [localPart, domain] = value.split('@');

  if (!localPart || !domain) {
    return MASKED_EMAIL;
  }

  return `${localPart.slice(0, 1)}***@${domain}`;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '');

  if (digits.length < 6) {
    return MASKED_PHONE;
  }

  return `${MASKED_PHONE}:${digits.slice(-2)}`;
}

function maskIpAddress(value: string) {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    const [first, second] = value.split('.');
    return `${first}.${second}.***.***`;
  }

  return MASKED_IP;
}

function isSensitiveKey(key: string) {
  return sensitiveKeys.has(normalizeKey(key));
}

function normalizeKey(key: string) {
  return key.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}
