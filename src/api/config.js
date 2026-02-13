/**
 * API Configuration
 *
 * Development Guide:
 * -----------------
 * 1. Set VITE_API_BASE_URL in .env files or environment variables to your backend URL.
 *    Example: VITE_API_BASE_URL=http://192.168.1.100:8080/api/auth
 *
 * 2. Set VITE_API_MOCK=true to use mock data during development (default: true).
 *    Set VITE_API_MOCK=false to call real backend APIs.
 *
 * 3. All API endpoints are relative to the base URL. For example:
 *    GET  {baseURL}/captcha   -> Get captcha image
 *    GET  {baseURL}/public-key -> Get RSA public key for encrypting sensitive data
 *    POST {baseURL}/sms/send    -> Send phone verification code
 *    POST {baseURL}/sms/login   -> Phone login
 *    POST {baseURL}/email/send  -> Send email verification code
 *    POST {baseURL}/email/login -> Email login
 *    POST {baseURL}/wechat/qr/generate   -> Generate WeChat QR code
 *    GET  {baseURL}/wechat/qr/poll/{ticket} -> Poll WeChat QR login status
 *    POST {baseURL}/wechat/mp/generate    -> Generate WeChat MP QR code
 *    GET  {baseURL}/wechat/mp/poll/{ticket} -> Poll WeChat MP login status
 *
 * 4. Backend response format:
 *    HTTP Status: 200 (success) / 400 (client error) / 500 (server error)
 *    Body: { "code": "200", "message": "提示信息", "data": { ... } }
 *
 * 5. On login success, data contains:
 *    { "token": "jwt-token", "tenantId": "tenant-001", "userId": "user-001", ... }
 */

// Base URL for all API requests (matches backend @RequestMapping("/api/auth"))
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/auth'

// Whether to use mock data (for development without backend)
export const USE_MOCK = import.meta.env.VITE_API_MOCK !== 'false'

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 15000

// WeChat QR code polling interval in milliseconds
export const QR_POLL_INTERVAL = 2000
