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

export async function mockSmsLogin(phone, code) {
  await delay(800)
  const storedCode = mockCodes.get(`sms:${phone}`)
  // Accept any code in mock mode if no code was stored (for convenience)
  if (storedCode && storedCode !== code) {
    return {
      code: '400001',
      message: '验证码错误或已过期',
      data: null,
    }
  }
  mockCodes.delete(`sms:${phone}`)
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

export async function mockEmailLogin(email, code) {
  await delay(800)
  const storedCode = mockCodes.get(`email:${email}`)
  if (storedCode && storedCode !== code) {
    return {
      code: '400001',
      message: '验证码错误或已过期',
      data: null,
    }
  }
  mockCodes.delete(`email:${email}`)
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
