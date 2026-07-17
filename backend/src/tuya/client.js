import axios from 'axios';
import crypto from 'crypto';
import {
  buildSignedUrl,
  contentSha256,
  stringToSign,
  signGeneralRequest,
} from './sign.js';

function randomNonce() {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Signed request to Tuya Cloud (general business API).
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string} opts.clientId
 * @param {string} opts.secret
 * @param {string} opts.accessToken
 * @param {string} opts.method - GET, POST, PUT, DELETE
 * @param {string} opts.path - e.g. /v1.0/iot-03/devices/{id}
 * @param {Record<string, string>} [opts.query]
 * @param {object|string} [opts.body] - JSON body for POST/PUT
 */
export async function signedRequest({
  baseUrl,
  clientId,
  secret,
  accessToken,
  method,
  path,
  query = {},
  body,
}) {
  const url = buildSignedUrl(path, query);
  const t = String(Date.now());
  const nonce = randomNonce();
  const bodyStr = body === undefined ? '' : (typeof body === 'string' ? body : JSON.stringify(body));
  const contentSha = contentSha256(bodyStr);
  const stringToSignValue = stringToSign(method, contentSha, '', url);
  const sign = signGeneralRequest(clientId, accessToken, secret, t, nonce, stringToSignValue);

  const fullUrl = `${baseUrl.replace(/\/$/, '')}${url}`;
  const headers = {
    client_id: clientId,
    access_token: accessToken,
    sign,
    sign_method: 'HMAC-SHA256',
    t,
    nonce,
  };

  const config = { method, url: fullUrl, headers, validateStatus: () => true };
  if (bodyStr) {
    config.data = bodyStr;
    headers['Content-Type'] = 'application/json';
  }

  const res = await axios(config);

  if (res.status !== 200) {
    const err = new Error(res.data?.msg || `Tuya API error: ${res.status}`);
    err.status = res.status;
    err.code = res.data?.code;
    throw err;
  }

  if (res.data?.success === false) {
    const err = new Error(res.data?.msg || 'Tuya API returned success: false');
    err.code = res.data?.code;
    throw err;
  }

  return res.data;
}
