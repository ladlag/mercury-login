/**
 * Auth API Module
 *
 * All API endpoints for the authentication system.
 * When VITE_API_MOCK=true (default), uses mock implementations.
 * When VITE_API_MOCK=false, calls real backend at VITE_API_BASE_URL.
 *
 * Backend API Endpoints:
 * ----------------------
 * GET  /captcha              - Get a new captcha image
 *   Response: { "code": "200", "message": "验证码获取成功",
 *               "data": { "captchaId": "...", "captchaImage": "data:image/..." } }
 *
 * GET  /public-key           - Get RSA public key for encrypting sensitive data
 *   Response: { "code": "200", "message": "获取成功",
 *               "data": { "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
 *                         "encrypt": true } }
 *   When encrypt=true, sensitive fields (phone, email, code) are RSA-encrypted
 *   before sending to the backend.
 *
 * POST /sms/send           - Send SMS verification code
 *   Request:  { "phone": "13800138000" }
 *   Response: { "code": "200", "message": "验证码已发送", "data": null }
 *
 * POST /sms/login          - Login with phone + code (+ optional captcha)
 *   Request:  { "phone": "13800138000", "code": "123456",
 *               "captchaId": "...", "captchaCode": "..." }
 *   Response (success): { "code": "200", "message": "登录成功",
 *               "data": { "token": "...", "tenantId": "...", "userId": "...", "username": "..." } }
 *   Response (fail, captcha needed): { "code": "400001", "message": "验证码错误或已过期",
 *               "data": { "captchaRequired": true } }
 *
 * POST /email/send         - Send email verification code
 *   Request:  { "email": "user@example.com" }
 *   Response: { "code": "200", "message": "验证码已发送", "data": null }
 *
 * POST /email/login        - Login with email + code (+ optional captcha)
 *   Request:  { "email": "user@example.com", "code": "123456",
 *               "captchaId": "...", "captchaCode": "..." }
 *   Response (success): { "code": "200", "message": "登录成功",
 *               "data": { "token": "...", "tenantId": "...", "userId": "...", "username": "..." } }
 *   Response (fail, captcha needed): { "code": "400001", "message": "验证码错误或已过期",
 *               "data": { "captchaRequired": true } }
 *
 * POST /wechat/qr/generate - Generate WeChat QR code for scanning
 *   Request:  (none)
 *   Response: { "code": "200", "message": "二维码生成成功",
 *               "data": { "ticket": "...", "expireSeconds": 120, "url": "..." } }
 *
 * GET  /wechat/qr/poll/:ticket - Poll WeChat QR scan status
 *   Response: { "code": "200", "message": "...",
 *               "data": { "status": "pending|scanned|confirmed",
 *                         "token": "...", "tenantId": "...", ... } }
 *
 * POST /wechat/mp/generate - Generate WeChat MP (public account) QR code
 *   Request:  (none)
 *   Response: { "code": "200", "message": "公众号二维码生成成功",
 *               "data": { "ticket": "...", "expireSeconds": 120, "url": "..." } }
 *
 * GET  /wechat/mp/poll/:ticket - Poll WeChat MP scan status
 *   Response: { "code": "200", "message": "...",
 *               "data": { "status": "pending|scanned|confirmed",
 *                         "token": "...", "tenantId": "...", ... } }
 *
 * Business Error Handling:
 * ------------------------
 * When users trigger rate limiting, blacklist, or other restrictions:
 *   HTTP Status: 200, Body: { "code": "400xxx", "message": "提示信息", "data": ... }
 * The frontend displays the `message` from the response.
 * If `data.captchaRequired` is true, the frontend shows a captcha input.
 */

import { USE_MOCK } from './config.js'
import { post, get, ApiError } from './request.js'
import {
  mockSendSmsCode,
  mockSmsLogin,
  mockSendEmailCode,
  mockEmailLogin,
  mockWechatQrGenerate,
  mockWechatQrPoll,
  mockWechatMpGenerate,
  mockWechatMpPoll,
  mockGetCaptcha,
  mockGetPublicKey,
} from './mock.js'

/**
 * Check mock response and throw ApiError if the response code is not '200'.
 * This ensures mock responses are handled the same way as real HTTP responses.
 */
function checkMockResponse(result) {
  if (result.code && String(result.code) !== '200') {
    throw new ApiError(
      result.message || '操作失败',
      200,
      result.code,
      result.data
    )
  }
  return result
}

// ---- Encryption Support ----

/** Cached public key info: { publicKey, encrypt } */
let cachedKeyInfo = null
let keyInfoPromise = null

/**
 * Fetch public key from backend and cache it.
 * Response data: { publicKey: "...", encrypt: true/false }
 * The `encrypt` flag indicates whether the backend requires sensitive data encryption.
 * Uses promise-based locking to avoid duplicate concurrent fetches.
 */
async function fetchKeyInfo() {
  if (cachedKeyInfo) return cachedKeyInfo
  if (keyInfoPromise) return keyInfoPromise
  keyInfoPromise = (async () => {
    try {
      const res = await getPublicKey()
      cachedKeyInfo = res.data
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[Auth] Failed to fetch public key, encryption disabled:', err.message || err)
      }
      cachedKeyInfo = { publicKey: null, encrypt: false }
    } finally {
      keyInfoPromise = null
    }
    return cachedKeyInfo
  })()
  return keyInfoPromise
}

/**
 * Encrypt a string value with the RSA public key using Web Crypto API.
 * Returns the base64-encoded ciphertext.
 */
async function rsaEncrypt(publicKeyPem, plaintext) {
  const pemContents = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    binaryDer.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    cryptoKey,
    encoded
  )
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}

/**
 * Encrypt sensitive fields in a request body based on the backend's encrypt flag.
 * Only encrypts when the backend public-key response has { encrypt: true }.
 *
 * @param {Object} body - Request body object
 * @param {string[]} fields - Field names to encrypt (e.g. ['phone', 'code'])
 * @returns {Promise<Object>} Body with sensitive fields encrypted if required
 */
async function encryptSensitiveFields(body, fields) {
  const keyInfo = await fetchKeyInfo()
  if (!keyInfo.encrypt || !keyInfo.publicKey) {
    return body
  }
  const encrypted = { ...body }
  for (const field of fields) {
    if (encrypted[field]) {
      encrypted[field] = await rsaEncrypt(keyInfo.publicKey, encrypted[field])
    }
  }
  return encrypted
}

// ---- Captcha APIs ----

/**
 * Get a new captcha image.
 * Response data: { captchaId: "...", captchaImage: "data:image/..." }
 */
export function getCaptcha() {
  if (USE_MOCK) return mockGetCaptcha()
  return get('/captcha')
}

// ---- Public Key APIs ----

/**
 * Get the RSA public key for encrypting sensitive data (e.g. passwords).
 * Response data: { publicKey: "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----" }
 */
export function getPublicKey() {
  if (USE_MOCK) return mockGetPublicKey()
  return get('/public-key')
}

// ---- SMS APIs ----

/** Send SMS verification code */
export async function sendSmsCode(phone) {
  if (USE_MOCK) return mockSendSmsCode(phone)
  const body = await encryptSensitiveFields({ phone }, ['phone'])
  return post('/sms/send', body)
}

/** Login with phone + verification code (+ optional captcha) */
export async function smsLogin(phone, code, captchaId, captchaCode) {
  if (USE_MOCK) return checkMockResponse(await mockSmsLogin(phone, code, captchaId, captchaCode))
  const body = { phone, code }
  if (captchaId) {
    body.captchaId = captchaId
    body.captchaCode = captchaCode
  }
  const encrypted = await encryptSensitiveFields(body, ['phone', 'code'])
  return post('/sms/login', encrypted)
}

// ---- Email APIs ----

/** Send email verification code */
export async function sendEmailCode(email) {
  if (USE_MOCK) return mockSendEmailCode(email)
  const body = await encryptSensitiveFields({ email }, ['email'])
  return post('/email/send', body)
}

/** Login with email + verification code (+ optional captcha) */
export async function emailLogin(email, code, captchaId, captchaCode) {
  if (USE_MOCK) return checkMockResponse(await mockEmailLogin(email, code, captchaId, captchaCode))
  const body = { email, code }
  if (captchaId) {
    body.captchaId = captchaId
    body.captchaCode = captchaCode
  }
  const encrypted = await encryptSensitiveFields(body, ['email', 'code'])
  return post('/email/login', encrypted)
}

// ---- WeChat QR APIs ----

/** Generate a WeChat QR code for scanning */
export function generateWechatQr() {
  if (USE_MOCK) return mockWechatQrGenerate()
  return post('/wechat/qr/generate')
}

/** Poll WeChat QR scan status */
export function pollWechatQr(ticket) {
  if (USE_MOCK) return mockWechatQrPoll(ticket)
  return get(`/wechat/qr/poll/${encodeURIComponent(ticket)}`)
}

// ---- WeChat MP APIs ----

/** Generate a WeChat MP (public account) QR code */
export function generateWechatMp() {
  if (USE_MOCK) return mockWechatMpGenerate()
  return post('/wechat/mp/generate')
}

/** Poll WeChat MP scan status */
export function pollWechatMp(ticket) {
  if (USE_MOCK) return mockWechatMpPoll(ticket)
  return get(`/wechat/mp/poll/${encodeURIComponent(ticket)}`)
}
