import crypto from 'crypto';

const EMPTY_BODY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * Build URL string for signature: path + sorted query params.
 * @param {string} path - e.g. /v1.0/iot-03/devices/xxx
 * @param {Record<string, string>} [params] - query params
 * @returns {string}
 */
export function buildSignedUrl(path, params = {}) {
  const keys = Object.keys(params).filter((k) => params[k] != null && params[k] !== '');
  if (keys.length === 0) return path;
  keys.sort();
  const query = keys.map((k) => `${k}=${params[k]}`).join('&');
  return `${path}?${query}`;
}

/**
 * Content-SHA256 of request body (UTF-8).
 * @param {string} [body]
 * @returns {string}
 */
export function contentSha256(body) {
  if (body == null || body === '') return EMPTY_BODY_SHA256;
  const buf = Buffer.from(body, 'utf8');
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * stringToSign per Tuya: METHOD + "\n" + Content-SHA256 + "\n" + Optional_Headers + "\n" + URL
 * Without custom Signature-Headers, Optional_Headers is empty (blank line).
 */
export function stringToSign(method, contentSha, optionalSignatureKey, url) {
  const parts = [method, contentSha, optionalSignatureKey || '', url];
  return parts.join('\n');
}

/**
 * HMAC-SHA256 then uppercase hex.
 * @param {string} str
 * @param {string} secret
 * @returns {string}
 */
export function hmacSha256(str, secret) {
  return crypto.createHmac('sha256', secret).update(str, 'utf8').digest('hex').toUpperCase();
}

/**
 * Sign for token API: str = client_id + t + nonce + stringToSign
 */
export function signTokenRequest(clientId, secret, t, nonce, stringToSignValue) {
  const str = clientId + t + nonce + stringToSignValue;
  return hmacSha256(str, secret);
}

/**
 * Sign for general API: str = client_id + access_token + t + nonce + stringToSign
 */
export function signGeneralRequest(clientId, accessToken, secret, t, nonce, stringToSignValue) {
  const str = clientId + accessToken + t + nonce + stringToSignValue;
  return hmacSha256(str, secret);
}
