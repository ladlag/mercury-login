/**
 * Mock API implementations for development.
 *
 * These mocks simulate backend responses using the same format:
 * { code: '200', message: '...', data: { ... } }
 *
 * Development Guide:
 * ------------------
 * When VITE_API_MOCK=false, these mocks are bypassed and real HTTP requests
 * are made to the backend. No other changes needed.
 */

/** Simulate network delay */
function delay(ms = 500) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Generate a mock JWT-like token */
function generateMockToken() {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({
    sub: 'user-001',
    tenantId: 'tenant-001',
    exp: Math.floor(Date.now() / 1000) + 7200,
    iat: Math.floor(Date.now() / 1000),
  }))
  const signature = btoa('mock-signature-' + Date.now())
  return `${header}.${payload}.${signature}`
}

/** Mock login success response */
function mockLoginSuccess() {
  return {
    code: '200',
    message: '登录成功',
    data: {
      token: generateMockToken(),
      tenantId: 'tenant-001',
      userId: 'user-001',
      username: 'mock-user',
    },
  }
}

/** Store for mock verification codes (phone/email -> code) */
const mockCodes = new Map()

/** Track login failure counts per account to trigger captcha */
const loginFailures = new Map()
const CAPTCHA_THRESHOLD = 3

/** Store for mock captcha (captchaId -> expected text) */
const mockCaptchas = new Map()
let captchaIdCounter = 0

// ---- Captcha APIs ----

export async function mockGetCaptcha() {
  await delay(300)
  captchaIdCounter++
  const captchaId = `captcha-${captchaIdCounter}`
  const captchaText = String(Math.floor(1000 + Math.random() * 9000))
  mockCaptchas.set(captchaId, captchaText)
  console.info(`[Mock] Captcha ${captchaId}: ${captchaText}`)
  return {
    code: '200',
    message: '验证码获取成功',
    data: {
      captchaId,
      // In real backend this would be a base64 image; here we use a simple SVG
      captchaImage: generateMockCaptchaSvg(captchaText),
    },
  }
}

/** Generate a simple SVG captcha image for mock purposes */
function generateMockCaptchaSvg(text) {
  const chars = text.split('')
  const textElements = chars.map((ch, i) => {
    const x = 20 + i * 28
    const y = 28 + Math.floor(Math.random() * 10)
    const rotate = Math.floor(Math.random() * 30) - 15
    return `<text x="${x}" y="${y}" font-size="24" font-weight="bold" fill="#335" transform="rotate(${rotate},${x},${y})">${ch}</text>`
  }).join('')
  const lines = Array.from({ length: 3 }, () => {
    const x1 = Math.floor(Math.random() * 120)
    const y1 = Math.floor(Math.random() * 40)
    const x2 = Math.floor(Math.random() * 120)
    const y2 = Math.floor(Math.random() * 40)
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#aab" stroke-width="1"/>`
  }).join('')
  return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="130" height="40"><rect width="130" height="40" fill="#e8ecf0" rx="4"/>${lines}${textElements}</svg>`)}`
}

/** Validate captcha and remove it from the store */
function validateMockCaptcha(captchaId, captchaCode) {
  if (!captchaId || !captchaCode) return false
  const expected = mockCaptchas.get(captchaId)
  mockCaptchas.delete(captchaId)
  return expected === captchaCode
}

/** Get the failure key for tracking */
function failureKey(type, account) {
  return `${type}:${account}`
}

/** Check if captcha is required and build the login-failure response */
function buildLoginFailure(type, account, message, captchaId, captchaCode) {
  const key = failureKey(type, account)
  const failures = (loginFailures.get(key) || 0) + 1
  loginFailures.set(key, failures)

  // If captcha was required but not provided or invalid, always require captcha
  const needCaptcha = failures >= CAPTCHA_THRESHOLD

  // If captcha was supplied, validate it
  if (captchaId && needCaptcha) {
    if (!validateMockCaptcha(captchaId, captchaCode)) {
      return {
        code: '400002',
        message: '图形验证码错误',
        data: { captchaRequired: true },
      }
    }
  }

  const response = {
    code: '400001',
    message,
    data: needCaptcha ? { captchaRequired: true } : null,
  }
  return response
}

/** Reset failure count on successful login */
function clearFailures(type, account) {
  loginFailures.delete(failureKey(type, account))
}

// ---- Public Key APIs ----

export async function mockGetPublicKey() {
  await delay(200)
  return {
    code: '200',
    message: '获取成功',
    data: {
      publicKey: '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDMOCK...(mock-key)\n-----END PUBLIC KEY-----',
      encrypt: false,
    },
  }
}

// ---- SMS APIs ----

export async function mockSendSmsCode(phone) {
  await delay(600)
  const code = String(Math.floor(100000 + Math.random() * 900000))
  mockCodes.set(`sms:${phone}`, code)
  console.info(`[Mock] SMS code for ${phone}: ${code}`)
  return {
    code: '200',
    message: '验证码已发送',
    data: null,
  }
}

export async function mockSmsLogin(phone, code, captchaId, captchaCode) {
  await delay(800)
  const storedCode = mockCodes.get(`sms:${phone}`)
  // Accept any code in mock mode if no code was stored (for convenience)
  if (storedCode && storedCode !== code) {
    return buildLoginFailure('sms', phone, '验证码错误或已过期', captchaId, captchaCode)
  }

  // If captcha is required, validate it
  const key = failureKey('sms', phone)
  const failures = loginFailures.get(key) || 0
  if (failures >= CAPTCHA_THRESHOLD) {
    if (!captchaId || !captchaCode) {
      return {
        code: '400002',
        message: '请输入图形验证码',
        data: { captchaRequired: true },
      }
    }
    if (!validateMockCaptcha(captchaId, captchaCode)) {
      return {
        code: '400002',
        message: '图形验证码错误',
        data: { captchaRequired: true },
      }
    }
  }

  mockCodes.delete(`sms:${phone}`)
  clearFailures('sms', phone)
  return mockLoginSuccess()
}

// ---- Email APIs ----

export async function mockSendEmailCode(email) {
  await delay(600)
  const code = String(Math.floor(100000 + Math.random() * 900000))
  mockCodes.set(`email:${email}`, code)
  console.info(`[Mock] Email code for ${email}: ${code}`)
  return {
    code: '200',
    message: '验证码已发送',
    data: null,
  }
}

export async function mockEmailLogin(email, code, captchaId, captchaCode) {
  await delay(800)
  const storedCode = mockCodes.get(`email:${email}`)
  if (storedCode && storedCode !== code) {
    return buildLoginFailure('email', email, '验证码错误或已过期', captchaId, captchaCode)
  }

  // If captcha is required, validate it
  const key = failureKey('email', email)
  const failures = loginFailures.get(key) || 0
  if (failures >= CAPTCHA_THRESHOLD) {
    if (!captchaId || !captchaCode) {
      return {
        code: '400002',
        message: '请输入图形验证码',
        data: { captchaRequired: true },
      }
    }
    if (!validateMockCaptcha(captchaId, captchaCode)) {
      return {
        code: '400002',
        message: '图形验证码错误',
        data: { captchaRequired: true },
      }
    }
  }

  mockCodes.delete(`email:${email}`)
  clearFailures('email', email)
  return mockLoginSuccess()
}

// ---- WeChat QR APIs ----

let mockQrTicketCounter = 0

export async function mockWechatQrGenerate() {
  await delay(400)
  mockQrTicketCounter++
  return {
    code: '200',
    message: '二维码生成成功',
    data: {
      ticket: `mock-qr-ticket-${mockQrTicketCounter}`,
      expireSeconds: 120,
      url: `https://example.com/wechat/qr/${mockQrTicketCounter}`,
    },
  }
}

let mockQrPollCount = 0

export async function mockWechatQrPoll(_ticket) {
  await delay(300)
  mockQrPollCount++
  // Simulate: after 10 polls, return scanned; after 15, return confirmed
  if (mockQrPollCount > 15) {
    mockQrPollCount = 0
    return {
      code: '200',
      message: '登录成功',
      data: {
        status: 'confirmed',
        ...mockLoginSuccess().data,
      },
    }
  }
  if (mockQrPollCount > 10) {
    return {
      code: '200',
      message: '已扫码，待确认',
      data: { status: 'scanned' },
    }
  }
  return {
    code: '200',
    message: '等待扫码',
    data: { status: 'pending' },
  }
}

// ---- WeChat MP APIs ----

let mockMpTicketCounter = 0

export async function mockWechatMpGenerate() {
  await delay(400)
  mockMpTicketCounter++
  return {
    code: '200',
    message: '公众号二维码生成成功',
    data: {
      ticket: `mock-mp-ticket-${mockMpTicketCounter}`,
      expireSeconds: 120,
      url: `https://example.com/wechat/mp/${mockMpTicketCounter}`,
    },
  }
}

let mockMpPollCount = 0

export async function mockWechatMpPoll(_ticket) {
  await delay(300)
  mockMpPollCount++
  if (mockMpPollCount > 15) {
    mockMpPollCount = 0
    return {
      code: '200',
      message: '登录成功',
      data: {
        status: 'confirmed',
        ...mockLoginSuccess().data,
      },
    }
  }
  if (mockMpPollCount > 10) {
    return {
      code: '200',
      message: '已扫码，待确认',
      data: { status: 'scanned' },
    }
  }
  return {
    code: '200',
    message: '等待扫码',
    data: { status: 'pending' },
  }
}
