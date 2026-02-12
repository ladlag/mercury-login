/**
 * Auth API Module
 *
 * All API endpoints for the authentication system.
 * When VITE_API_MOCK=true (default), uses mock implementations.
 * When VITE_API_MOCK=false, calls real backend at VITE_API_BASE_URL.
 *
 * Backend API Endpoints:
 * ----------------------
 * POST /sms/send           - Send SMS verification code
 *   Request:  { "phone": "13800138000" }
 *   Response: { "code": "200", "message": "验证码已发送", "data": null }
 *
 * POST /sms/login          - Login with phone + code
 *   Request:  { "phone": "13800138000", "code": "123456" }
 *   Response: { "code": "200", "message": "登录成功",
 *               "data": { "token": "...", "tenantId": "...", "userId": "...", "username": "..." } }
 *
 * POST /email/send         - Send email verification code
 *   Request:  { "email": "user@example.com" }
 *   Response: { "code": "200", "message": "验证码已发送", "data": null }
 *
 * POST /email/login        - Login with email + code
 *   Request:  { "email": "user@example.com", "code": "123456" }
 *   Response: { "code": "200", "message": "登录成功",
 *               "data": { "token": "...", "tenantId": "...", "userId": "...", "username": "..." } }
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
 */

import { USE_MOCK } from './config.js'
import { post, get } from './request.js'
import {
  mockSendSmsCode,
  mockSmsLogin,
  mockSendEmailCode,
  mockEmailLogin,
  mockWechatQrGenerate,
  mockWechatQrPoll,
  mockWechatMpGenerate,
  mockWechatMpPoll,
} from './mock.js'

// ---- SMS APIs ----

/** Send SMS verification code */
export function sendSmsCode(phone) {
  if (USE_MOCK) return mockSendSmsCode(phone)
  return post('/sms/send', { phone })
}

/** Login with phone + verification code */
export function smsLogin(phone, code) {
  if (USE_MOCK) return mockSmsLogin(phone, code)
  return post('/sms/login', { phone, code })
}

// ---- Email APIs ----

/** Send email verification code */
export function sendEmailCode(email) {
  if (USE_MOCK) return mockSendEmailCode(email)
  return post('/email/send', { email })
}

/** Login with email + verification code */
export function emailLogin(email, code) {
  if (USE_MOCK) return mockEmailLogin(email, code)
  return post('/email/login', { email, code })
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
