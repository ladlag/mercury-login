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
 * GET  /public-key           - Get RSA public key for password encryption
 *   Response: { "code": "200", "message": "获取成功",
 *               "data": { "publicKey": "-----BEGIN PUBLIC KEY-----\n..." } }
 *
 * POST /password/login       - Login with username + RSA-encrypted password (+ optional captcha)
 *   Request:  { "username": "admin", "password": "<RSA-encrypted>",
 *               "captchaId": "...", "captchaCode": "..." }
 *   Response (success): { "code": "200", "message": "登录成功",
 *               "data": { "token": "...", "tenantId": "...", "userId": "...", "username": "..." } }
 *   Response (fail, captcha needed): { "code": "400001", "message": "用户名或密码错误",
 *               "data": { "captchaRequired": true } }
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
  mockPasswordLogin,
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

// ---- Captcha APIs ----

/**
 * Get a new captcha image.
 * Response data: { captchaId: "...", captchaImage: "data:image/..." }
 */
export function getCaptcha() {
  if (USE_MOCK) return mockGetCaptcha()
  return get('/captcha')
}

// ---- Password APIs ----

/**
 * Get RSA public key for password encryption.
 * Response data: { publicKey: "-----BEGIN PUBLIC KEY-----\n..." }
 */
export function getPublicKey() {
  if (USE_MOCK) return mockGetPublicKey()
  return get('/public-key')
}

/** Login with username + RSA-encrypted password (+ optional captcha) */
export async function passwordLogin(username, encryptedPassword, captchaId, captchaCode) {
  if (USE_MOCK) return checkMockResponse(await mockPasswordLogin(username, encryptedPassword, captchaId, captchaCode))
  const body = { username, password: encryptedPassword }
  if (captchaId) {
    body.captchaId = captchaId
    body.captchaCode = captchaCode
  }
  return post('/password/login', body)
}

// ---- SMS APIs ----

/** Send SMS verification code */
export function sendSmsCode(phone) {
  if (USE_MOCK) return mockSendSmsCode(phone)
  return post('/sms/send', { phone })
}

/** Login with phone + verification code (+ optional captcha) */
export async function smsLogin(phone, code, captchaId, captchaCode) {
  if (USE_MOCK) return checkMockResponse(await mockSmsLogin(phone, code, captchaId, captchaCode))
  const body = { phone, code }
  if (captchaId) {
    body.captchaId = captchaId
    body.captchaCode = captchaCode
  }
  return post('/sms/login', body)
}

// ---- Email APIs ----

/** Send email verification code */
export function sendEmailCode(email) {
  if (USE_MOCK) return mockSendEmailCode(email)
  return post('/email/send', { email })
}

/** Login with email + verification code (+ optional captcha) */
export async function emailLogin(email, code, captchaId, captchaCode) {
  if (USE_MOCK) return checkMockResponse(await mockEmailLogin(email, code, captchaId, captchaCode))
  const body = { email, code }
  if (captchaId) {
    body.captchaId = captchaId
    body.captchaCode = captchaCode
  }
  return post('/email/login', body)
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
