import axios from 'axios';
import crypto from 'crypto';
import {
  buildSignedUrl,
  contentSha256,
  stringToSign,
  signTokenRequest,
} from './sign.js';

function randomNonce() {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Get Tuya access token (grant_type=1). Uses token API signing (no access_token in str).
 * @param {object} opts
 * @param {string} opts.baseUrl - e.g. https://openapi.tuyaeu.com
 * @param {string} opts.clientId - Tuya Access ID
 * @param {string} opts.secret - Tuya Access Secret
 * @returns {Promise<{ access_token: string, expire_time: number }>}
 */
export async function getToken({ baseUrl, clientId, secret }) {
  const path = '/v1.0/token';
  const params = { grant_type: '1' };
  const url = buildSignedUrl(path, params);
  const t = String(Date.now());
  const nonce = randomNonce();
  const body = '';
  const contentSha = contentSha256(body);
  const stringToSignValue = stringToSign('GET', contentSha, '', url);
  const sign = signTokenRequest(clientId, secret, t, nonce, stringToSignValue);

  const fullUrl = `${baseUrl.replace(/\/$/, '')}${url}`;
  const res = await axios.get(fullUrl, {
    headers: {
      client_id: clientId,
      sign,
      sign_method: 'HMAC-SHA256',
      t,
      nonce,
    },
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    const err = new Error(res.data?.msg || `Tuya token API error: ${res.status}`);
    err.status = res.status;
    err.code = res.data?.code;
    throw err;
  }

  if (res.data?.success === false) {
    console.error('[tuya] token API returned success:false:', JSON.stringify(res.data));
    const err = new Error(res.data?.msg || `Tuya token API error: ${res.data?.code}`);
    err.code = res.data?.code;
    throw err;
  }

  const result = res.data?.result;
  if (!result?.access_token) {
    console.error('[tuya] token response missing access_token:', JSON.stringify(res.data));
    throw new Error('Tuya token response missing access_token');
  }
  return {
    access_token: result.access_token,
    expire_time: result.expire_time,
  };
}

/**
 * In-memory token cache with refresh-before-expiry (refresh 5 minutes early).
 */
export function createTokenManager({ baseUrl, clientId, secret }) {
  let cached = null;

  async function ensureToken() {
    const now = Date.now();
    const expireMs = (cached?.expire_time ?? 0) * 1000;
    const refreshAt = expireMs - 5 * 60 * 1000; // 5 min before expiry
    if (cached && now < refreshAt) {
      return cached.access_token;
    }
    const result = await getToken({ baseUrl, clientId, secret });
    cached = result;
    return result.access_token;
  }

  return { ensureToken };
}
