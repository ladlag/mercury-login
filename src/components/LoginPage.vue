<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Iphone,
  Message,
  ChatDotRound,
  Promotion,
  Refresh,
} from '@element-plus/icons-vue'
import {
  sendSmsCode,
  smsLogin,
  sendEmailCode as apiSendEmailCode,
  emailLogin,
  generateWechatQr,
  pollWechatQr,
  generateWechatMp,
  pollWechatMp,
  getCaptcha,
} from '../api/auth.js'
import { QR_POLL_INTERVAL } from '../api/config.js'

// Current login method: phone | email | wechat-qr | wechat-mp
const activeTab = ref('phone')

// Loading states to prevent duplicate submissions
const phoneCodeLoading = ref(false)
const phoneLoginLoading = ref(false)
const emailCodeLoading = ref(false)
const emailLoginLoading = ref(false)

// Captcha state (shared between phone and email login)
const captchaRequired = ref(false)
const captchaId = ref('')
const captchaCode = ref('')
const captchaImage = ref('')
const captchaLoading = ref(false)

// Phone login form
const phoneForm = reactive({
  phone: '',
  code: '',
})
const phoneCodeCountdown = ref(0)
let phoneTimer = null
const phoneTouched = reactive({ phone: false, code: false })

// Email login form
const emailForm = reactive({
  email: '',
  code: '',
})
const emailCodeCountdown = ref(0)
let emailTimer = null
const emailTouched = reactive({ email: false, code: false })

// WeChat QR login
const wechatQrExpired = ref(false)
const wechatQrScanned = ref(false)
let wechatQrTimer = null
let wechatQrPollTimer = null
let wechatQrTicket = null

// WeChat MP (public account) login
const wechatMpExpired = ref(false)
const wechatMpScanned = ref(false)
let wechatMpTimer = null
let wechatMpPollTimer = null
let wechatMpTicket = null

// Get redirect URL from query params
const redirectUrl = computed(() => {
  const params = new URLSearchParams(window.location.search)
  return params.get('redirect') || ''
})

// Phone validation
const isValidPhone = computed(() => {
  return /^1[3-9]\d{9}$/.test(phoneForm.phone)
})

// Phone error message
const phoneError = computed(() => {
  if (!phoneTouched.phone || !phoneForm.phone) return ''
  if (!/^\d*$/.test(phoneForm.phone)) return '手机号码只能包含数字'
  if (phoneForm.phone.length < 11) return '请输入11位手机号码'
  if (!isValidPhone.value) return '手机号码格式不正确'
  return ''
})

// Phone code error message
const phoneCodeError = computed(() => {
  if (!phoneTouched.code || !phoneForm.code) return ''
  if (!/^\d*$/.test(phoneForm.code)) return '验证码只能包含数字'
  if (phoneForm.code.length < 4) return '请输入4-6位验证码'
  return ''
})

// Email validation
const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email)
})

// Email error message
const emailError = computed(() => {
  if (!emailTouched.email || !emailForm.email) return ''
  if (!isValidEmail.value) return '请输入正确的邮箱地址'
  return ''
})

// Email code error message
const emailCodeError = computed(() => {
  if (!emailTouched.code || !emailForm.code) return ''
  if (!/^\d*$/.test(emailForm.code)) return '验证码只能包含数字'
  if (emailForm.code.length < 4) return '请输入4-6位验证码'
  return ''
})

/**
 * Handle API errors with user-friendly messages.
 * Shows backend error message for business errors, friendly fallback for 500s.
 * If the error carries captchaRequired, triggers captcha flow.
 */
function handleApiError(error) {
  // Check if captcha is now required (from error.data)
  if (error && error.data && error.data.captchaRequired) {
    captchaRequired.value = true
    captchaCode.value = ''
    fetchCaptcha()
  }

  if (error && error.httpStatus >= 500) {
    ElMessage.error('服务器繁忙，请稍后重试')
  } else if (error && error.message) {
    ElMessage.error(error.message)
  } else {
    ElMessage.error('操作失败，请稍后重试')
  }
}

// Fetch a new captcha image
async function fetchCaptcha() {
  captchaLoading.value = true
  try {
    const res = await getCaptcha()
    captchaId.value = res.data.captchaId
    captchaImage.value = res.data.captchaImage
    captchaCode.value = ''
  } catch (err) {
    ElMessage.error('获取图形验证码失败，请重试')
    if (import.meta.env.DEV) {
      console.warn('[Captcha] Error:', err.message || err)
    }
  } finally {
    captchaLoading.value = false
  }
}

// Refresh captcha image (click handler)
function refreshCaptcha() {
  fetchCaptcha()
}

// Start countdown timer for code resend
function startCountdown(type) {
  if (type === 'phone') {
    phoneCodeCountdown.value = 60
    phoneTimer = setInterval(() => {
      phoneCodeCountdown.value--
      if (phoneCodeCountdown.value <= 0) {
        clearInterval(phoneTimer)
        phoneTimer = null
      }
    }, 1000)
  } else {
    emailCodeCountdown.value = 60
    emailTimer = setInterval(() => {
      emailCodeCountdown.value--
      if (emailCodeCountdown.value <= 0) {
        clearInterval(emailTimer)
        emailTimer = null
      }
    }, 1000)
  }
}

// Send phone verification code
async function sendPhoneCode() {
  phoneTouched.phone = true
  if (!isValidPhone.value) {
    ElMessage.warning('请输入正确的手机号码')
    return
  }
  if (phoneCodeCountdown.value > 0 || phoneCodeLoading.value) return

  phoneCodeLoading.value = true
  try {
    const res = await sendSmsCode(phoneForm.phone)
    ElMessage.success(res.message || '验证码已发送')
    startCountdown('phone')
  } catch (error) {
    handleApiError(error)
  } finally {
    phoneCodeLoading.value = false
  }
}

// Send email verification code
async function sendEmailCode() {
  emailTouched.email = true
  if (!isValidEmail.value) {
    ElMessage.warning('请输入正确的邮箱地址')
    return
  }
  if (emailCodeCountdown.value > 0 || emailCodeLoading.value) return

  emailCodeLoading.value = true
  try {
    const res = await apiSendEmailCode(emailForm.email)
    ElMessage.success(res.message || '验证码已发送')
    startCountdown('email')
  } catch (error) {
    handleApiError(error)
  } finally {
    emailCodeLoading.value = false
  }
}

// Phone login submit
async function handlePhoneLogin() {
  phoneTouched.phone = true
  phoneTouched.code = true
  if (!isValidPhone.value) {
    ElMessage.warning('请输入正确的手机号码')
    return
  }
  if (!phoneForm.code || phoneForm.code.length < 4) {
    ElMessage.warning('请输入验证码')
    return
  }
  if (captchaRequired.value && !captchaCode.value) {
    ElMessage.warning('请输入图形验证码')
    return
  }
  if (phoneLoginLoading.value) return

  phoneLoginLoading.value = true
  try {
    const res = await smsLogin(
      phoneForm.phone, phoneForm.code,
      captchaRequired.value ? captchaId.value : undefined,
      captchaRequired.value ? captchaCode.value : undefined
    )
    ElMessage.success(res.message || '登录成功')
    captchaRequired.value = false
    handleLoginSuccess(res.data)
  } catch (error) {
    handleApiError(error)
  } finally {
    phoneLoginLoading.value = false
  }
}

// Email login submit
async function handleEmailLogin() {
  emailTouched.email = true
  emailTouched.code = true
  if (!isValidEmail.value) {
    ElMessage.warning('请输入正确的邮箱地址')
    return
  }
  if (!emailForm.code || emailForm.code.length < 4) {
    ElMessage.warning('请输入验证码')
    return
  }
  if (captchaRequired.value && !captchaCode.value) {
    ElMessage.warning('请输入图形验证码')
    return
  }
  if (emailLoginLoading.value) return

  emailLoginLoading.value = true
  try {
    const res = await emailLogin(
      emailForm.email, emailForm.code,
      captchaRequired.value ? captchaId.value : undefined,
      captchaRequired.value ? captchaCode.value : undefined
    )
    ElMessage.success(res.message || '登录成功')
    captchaRequired.value = false
    handleLoginSuccess(res.data)
  } catch (error) {
    handleApiError(error)
  } finally {
    emailLoginLoading.value = false
  }
}

// Handle login success - redirect with token and tenant info
function handleLoginSuccess(data) {
  const { token, tenantId } = data
  if (redirectUrl.value) {
    try {
      const url = new URL(redirectUrl.value)
      url.searchParams.set('token', token)
      if (tenantId) {
        url.searchParams.set('tenantId', tenantId)
      }
      window.location.href = url.toString()
    } catch {
      // Fallback for relative or malformed URLs
      const separator = redirectUrl.value.includes('?') ? '&' : '?'
      let params = 'token=' + encodeURIComponent(token)
      if (tenantId) {
        params += '&tenantId=' + encodeURIComponent(tenantId)
      }
      window.location.href = redirectUrl.value + separator + params
    }
  } else {
    ElMessage.info('登录成功，Token: ' + token)
  }
}

// Stop polling for QR code status
function stopQrPolling(type) {
  if (type === 'qr') {
    clearInterval(wechatQrPollTimer)
    wechatQrPollTimer = null
  } else {
    clearInterval(wechatMpPollTimer)
    wechatMpPollTimer = null
  }
}

// Start polling for WeChat QR scan status
function startQrPolling(type) {
  stopQrPolling(type)
  const pollFn = type === 'qr' ? pollWechatQr : pollWechatMp
  const ticket = type === 'qr' ? wechatQrTicket : wechatMpTicket
  const scannedRef = type === 'qr' ? wechatQrScanned : wechatMpScanned
  const expiredRef = type === 'qr' ? wechatQrExpired : wechatMpExpired

  const timerId = setInterval(async () => {
    if (expiredRef.value) {
      stopQrPolling(type)
      return
    }
    try {
      const res = await pollFn(ticket)
      const status = res.data?.status
      if (status === 'scanned') {
        scannedRef.value = true
      } else if (status === 'confirmed') {
        stopQrPolling(type)
        ElMessage.success(res.message || '登录成功')
        handleLoginSuccess(res.data)
      }
    } catch (err) {
      // Log poll errors in development for debugging; retry on next interval
      if (import.meta.env.DEV) {
        console.warn('[QR Poll] Error:', err.message || err)
      }
    }
  }, QR_POLL_INTERVAL)

  if (type === 'qr') {
    wechatQrPollTimer = timerId
  } else {
    wechatMpPollTimer = timerId
  }
}

// Initialize WeChat QR code
async function initWechatQr() {
  wechatQrExpired.value = false
  wechatQrScanned.value = false
  stopQrPolling('qr')
  clearTimeout(wechatQrTimer)

  try {
    const res = await generateWechatQr()
    wechatQrTicket = res.data.ticket
    const expireSeconds = res.data.expireSeconds || 120

    // Set expiration timer
    wechatQrTimer = setTimeout(() => {
      if (!wechatQrScanned.value) {
        wechatQrExpired.value = true
        stopQrPolling('qr')
        ElMessage.warning('二维码已过期，请刷新')
      }
    }, expireSeconds * 1000)

    // Start polling for scan status
    startQrPolling('qr')
  } catch (error) {
    handleApiError(error)
  }
}

// Refresh WeChat QR
function refreshWechatQr() {
  initWechatQr()
}

// Initialize WeChat MP QR code
async function initWechatMp() {
  wechatMpExpired.value = false
  wechatMpScanned.value = false
  stopQrPolling('mp')
  clearTimeout(wechatMpTimer)

  try {
    const res = await generateWechatMp()
    wechatMpTicket = res.data.ticket
    const expireSeconds = res.data.expireSeconds || 120

    // Set expiration timer
    wechatMpTimer = setTimeout(() => {
      if (!wechatMpScanned.value) {
        wechatMpExpired.value = true
        stopQrPolling('mp')
        ElMessage.warning('二维码已过期，请刷新')
      }
    }, expireSeconds * 1000)

    // Start polling for scan status
    startQrPolling('mp')
  } catch (error) {
    handleApiError(error)
  }
}

// Refresh WeChat MP QR
function refreshWechatMp() {
  initWechatMp()
}

// Handle tab change
function handleTabChange(tab) {
  // Stop polling when switching away from QR tabs
  if (activeTab.value === 'wechat-qr' && tab !== 'wechat-qr') {
    stopQrPolling('qr')
    clearTimeout(wechatQrTimer)
  }
  if (activeTab.value === 'wechat-mp' && tab !== 'wechat-mp') {
    stopQrPolling('mp')
    clearTimeout(wechatMpTimer)
  }

  activeTab.value = tab
  if (tab === 'wechat-qr') {
    initWechatQr()
  } else if (tab === 'wechat-mp') {
    initWechatMp()
  }
}

// Phone code button text
const phoneCodeBtnText = computed(() => {
  if (phoneCodeLoading.value) return '发送中...'
  return phoneCodeCountdown.value > 0
    ? `${phoneCodeCountdown.value}s 后重发`
    : '获取验证码'
})

// Email code button text
const emailCodeBtnText = computed(() => {
  if (emailCodeLoading.value) return '发送中...'
  return emailCodeCountdown.value > 0
    ? `${emailCodeCountdown.value}s 后重发`
    : '获取验证码'
})

// Cleanup timers
onBeforeUnmount(() => {
  clearInterval(phoneTimer)
  clearInterval(emailTimer)
  clearTimeout(wechatQrTimer)
  clearTimeout(wechatMpTimer)
  stopQrPolling('qr')
  stopQrPolling('mp')
})

// Agreement / Privacy dialog
const showAgreement = ref(false)
const showPrivacy = ref(false)
</script>

<template>
  <div class="login-container">
    <div class="login-wrapper">
      <!-- Left decorative banner (inside card) -->
      <div class="login-banner">
        <div class="banner-content">
          <div class="brand-icon">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="30" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.15)" />
              <path d="M20 32 L28 40 L44 24" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            </svg>
          </div>
          <h1 class="brand-title">Mercury</h1>
          <p class="brand-subtitle">统一身份认证平台</p>
          <div class="brand-features">
            <div class="feature-item">
              <span class="feature-dot"></span>
              <span>安全可靠的登录认证</span>
            </div>
            <div class="feature-item">
              <span class="feature-dot"></span>
              <span>多种登录方式自由选择</span>
            </div>
            <div class="feature-item">
              <span class="feature-dot"></span>
              <span>一次登录，多端通行</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right login card -->
      <div class="login-card">
        <h2 class="login-title">欢迎登录</h2>
        <p class="login-desc">请选择以下方式登录您的账号</p>

        <!-- Primary login method tabs (phone + wechat-mp) -->
        <div class="login-tabs">
          <div
            class="tab-item"
            :class="{ active: activeTab === 'phone' }"
            @click="handleTabChange('phone')"
          >
            <el-icon><Iphone /></el-icon>
            <span>手机验证码登录</span>
          </div>
          <div
            class="tab-item"
            :class="{ active: activeTab === 'wechat-mp' }"
            @click="handleTabChange('wechat-mp')"
          >
            <el-icon><Promotion /></el-icon>
            <span>微信公众号登录</span>
          </div>
        </div>

        <!-- Phone login form -->
        <div v-if="activeTab === 'phone'" class="login-form">
          <el-form :model="phoneForm" size="large">
            <el-form-item :error="phoneError">
              <el-input
                v-model="phoneForm.phone"
                placeholder="请输入手机号码"
                maxlength="11"
                clearable
                @blur="phoneTouched.phone = true"
              >
                <template #prefix>
                  <span class="input-prefix">+86</span>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item :error="phoneCodeError">
              <div class="code-input-group">
                <el-input
                  v-model="phoneForm.code"
                  placeholder="请输入验证码"
                  maxlength="6"
                  clearable
                  @blur="phoneTouched.code = true"
                  @keyup.enter="handlePhoneLogin"
                />
                <el-button
                  type="primary"
                  plain
                  :disabled="!isValidPhone || phoneCodeCountdown > 0"
                  :loading="phoneCodeLoading"
                  @click="sendPhoneCode"
                  class="code-btn"
                >
                  {{ phoneCodeBtnText }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item v-if="captchaRequired">
              <div class="captcha-input-group">
                <el-input
                  v-model="captchaCode"
                  placeholder="请输入图形验证码"
                  maxlength="6"
                  clearable
                  @keyup.enter="handlePhoneLogin"
                />
                <div class="captcha-image-wrapper" @click="refreshCaptcha">
                  <img
                    v-if="captchaImage"
                    :src="captchaImage"
                    alt="图形验证码"
                    class="captcha-image"
                  />
                  <div v-else class="captcha-placeholder">
                    <el-icon :loading="captchaLoading"><Refresh /></el-icon>
                  </div>
                </div>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                class="login-btn"
                :disabled="!isValidPhone || !phoneForm.code || (captchaRequired && !captchaCode)"
                :loading="phoneLoginLoading"
                @click="handlePhoneLogin"
              >
                登 录
              </el-button>
            </el-form-item>
          </el-form>

          <!-- Secondary login methods -->
          <div class="alt-login">
            <span class="alt-login-label">其他登录方式</span>
            <div class="alt-login-links">
              <a class="alt-link" role="button" tabindex="0" @click="handleTabChange('email')" @keyup.enter="handleTabChange('email')">
                <el-icon><Message /></el-icon>
                <span>邮箱验证码登录</span>
              </a>
              <a class="alt-link" role="button" tabindex="0" @click="handleTabChange('wechat-qr')" @keyup.enter="handleTabChange('wechat-qr')">
                <el-icon><ChatDotRound /></el-icon>
                <span>微信扫码登录</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Email login form -->
        <div v-if="activeTab === 'email'" class="login-form">
          <el-form :model="emailForm" size="large">
            <el-form-item :error="emailError">
              <el-input
                v-model="emailForm.email"
                placeholder="请输入邮箱地址"
                clearable
                @blur="emailTouched.email = true"
              >
                <template #prefix>
                  <el-icon><Message /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item :error="emailCodeError">
              <div class="code-input-group">
                <el-input
                  v-model="emailForm.code"
                  placeholder="请输入验证码"
                  maxlength="6"
                  clearable
                  @blur="emailTouched.code = true"
                  @keyup.enter="handleEmailLogin"
                />
                <el-button
                  type="primary"
                  plain
                  :disabled="!isValidEmail || emailCodeCountdown > 0"
                  :loading="emailCodeLoading"
                  @click="sendEmailCode"
                  class="code-btn"
                >
                  {{ emailCodeBtnText }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item v-if="captchaRequired">
              <div class="captcha-input-group">
                <el-input
                  v-model="captchaCode"
                  placeholder="请输入图形验证码"
                  maxlength="6"
                  clearable
                  @keyup.enter="handleEmailLogin"
                />
                <div class="captcha-image-wrapper" @click="refreshCaptcha">
                  <img
                    v-if="captchaImage"
                    :src="captchaImage"
                    alt="图形验证码"
                    class="captcha-image"
                  />
                  <div v-else class="captcha-placeholder">
                    <el-icon :loading="captchaLoading"><Refresh /></el-icon>
                  </div>
                </div>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                class="login-btn"
                :disabled="!isValidEmail || !emailForm.code || (captchaRequired && !captchaCode)"
                :loading="emailLoginLoading"
                @click="handleEmailLogin"
              >
                登 录
              </el-button>
            </el-form-item>
          </el-form>

          <!-- Back to primary methods -->
          <div class="alt-login">
            <span class="alt-login-label">其他登录方式</span>
            <div class="alt-login-links">
              <a class="alt-link" role="button" tabindex="0" @click="handleTabChange('phone')" @keyup.enter="handleTabChange('phone')">
                <el-icon><Iphone /></el-icon>
                <span>手机验证码登录</span>
              </a>
              <a class="alt-link" role="button" tabindex="0" @click="handleTabChange('wechat-qr')" @keyup.enter="handleTabChange('wechat-qr')">
                <el-icon><ChatDotRound /></el-icon>
                <span>微信扫码登录</span>
              </a>
            </div>
          </div>
        </div>

        <!-- WeChat QR code login -->
        <div v-if="activeTab === 'wechat-qr'" class="login-form qr-form">
          <p class="qr-tip">请使用微信扫描二维码登录</p>
          <div class="qr-wrapper">
            <div class="qr-placeholder">
              <!-- QR code placeholder -->
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="qr-svg">
                <rect width="200" height="200" fill="#fff"/>
                <g fill="#333">
                  <!-- Top-left positioning pattern -->
                  <rect x="10" y="10" width="50" height="50" rx="4"/>
                  <rect x="15" y="15" width="40" height="40" rx="2" fill="#fff"/>
                  <rect x="22" y="22" width="26" height="26" rx="2"/>
                  <!-- Top-right positioning pattern -->
                  <rect x="140" y="10" width="50" height="50" rx="4"/>
                  <rect x="145" y="15" width="40" height="40" rx="2" fill="#fff"/>
                  <rect x="152" y="22" width="26" height="26" rx="2"/>
                  <!-- Bottom-left positioning pattern -->
                  <rect x="10" y="140" width="50" height="50" rx="4"/>
                  <rect x="15" y="145" width="40" height="40" rx="2" fill="#fff"/>
                  <rect x="22" y="152" width="26" height="26" rx="2"/>
                  <!-- Data modules -->
                  <rect x="70" y="10" width="8" height="8"/>
                  <rect x="86" y="10" width="8" height="8"/>
                  <rect x="102" y="10" width="8" height="8"/>
                  <rect x="118" y="10" width="8" height="8"/>
                  <rect x="70" y="26" width="8" height="8"/>
                  <rect x="102" y="26" width="8" height="8"/>
                  <rect x="70" y="42" width="8" height="8"/>
                  <rect x="86" y="42" width="8" height="8"/>
                  <rect x="118" y="42" width="8" height="8"/>
                  <rect x="10" y="70" width="8" height="8"/>
                  <rect x="26" y="70" width="8" height="8"/>
                  <rect x="42" y="70" width="8" height="8"/>
                  <rect x="70" y="70" width="8" height="8"/>
                  <rect x="86" y="70" width="8" height="8"/>
                  <rect x="102" y="70" width="8" height="8"/>
                  <rect x="118" y="70" width="8" height="8"/>
                  <rect x="150" y="70" width="8" height="8"/>
                  <rect x="166" y="70" width="8" height="8"/>
                  <rect x="182" y="70" width="8" height="8"/>
                  <rect x="10" y="86" width="8" height="8"/>
                  <rect x="42" y="86" width="8" height="8"/>
                  <rect x="70" y="86" width="8" height="8"/>
                  <rect x="118" y="86" width="8" height="8"/>
                  <rect x="150" y="86" width="8" height="8"/>
                  <rect x="182" y="86" width="8" height="8"/>
                  <rect x="26" y="102" width="8" height="8"/>
                  <rect x="42" y="102" width="8" height="8"/>
                  <rect x="70" y="102" width="8" height="8"/>
                  <rect x="86" y="102" width="8" height="8"/>
                  <rect x="102" y="102" width="8" height="8"/>
                  <rect x="150" y="102" width="8" height="8"/>
                  <rect x="166" y="102" width="8" height="8"/>
                  <rect x="10" y="118" width="8" height="8"/>
                  <rect x="26" y="118" width="8" height="8"/>
                  <rect x="86" y="118" width="8" height="8"/>
                  <rect x="118" y="118" width="8" height="8"/>
                  <rect x="150" y="118" width="8" height="8"/>
                  <rect x="182" y="118" width="8" height="8"/>
                  <rect x="70" y="140" width="8" height="8"/>
                  <rect x="86" y="140" width="8" height="8"/>
                  <rect x="118" y="140" width="8" height="8"/>
                  <rect x="150" y="140" width="8" height="8"/>
                  <rect x="166" y="140" width="8" height="8"/>
                  <rect x="70" y="156" width="8" height="8"/>
                  <rect x="102" y="156" width="8" height="8"/>
                  <rect x="150" y="156" width="8" height="8"/>
                  <rect x="182" y="156" width="8" height="8"/>
                  <rect x="70" y="172" width="8" height="8"/>
                  <rect x="86" y="172" width="8" height="8"/>
                  <rect x="102" y="172" width="8" height="8"/>
                  <rect x="118" y="172" width="8" height="8"/>
                  <rect x="140" y="172" width="8" height="8"/>
                  <rect x="166" y="172" width="8" height="8"/>
                  <rect x="182" y="172" width="8" height="8"/>
                </g>
                <!-- Center icon -->
                <rect x="75" y="75" width="50" height="50" rx="8" fill="#07c160"/>
                <text x="100" y="107" text-anchor="middle" fill="white" font-size="24" font-weight="bold">W</text>
              </svg>
            </div>
            <!-- Expired overlay -->
            <div v-if="wechatQrExpired" class="qr-overlay">
              <p>二维码已过期</p>
              <el-button type="primary" size="small" :icon="Refresh" @click="refreshWechatQr">
                点击刷新
              </el-button>
            </div>
            <!-- Scanned overlay -->
            <div v-if="wechatQrScanned" class="qr-overlay scanned">
              <el-icon class="scanned-icon"><ChatDotRound /></el-icon>
              <p>扫描成功</p>
              <p class="scan-sub">请在微信中确认登录</p>
            </div>
          </div>

          <!-- Back to primary methods -->
          <div class="alt-login">
            <span class="alt-login-label">其他登录方式</span>
            <div class="alt-login-links">
              <a class="alt-link" role="button" tabindex="0" @click="handleTabChange('phone')" @keyup.enter="handleTabChange('phone')">
                <el-icon><Iphone /></el-icon>
                <span>手机验证码登录</span>
              </a>
              <a class="alt-link" role="button" tabindex="0" @click="handleTabChange('email')" @keyup.enter="handleTabChange('email')">
                <el-icon><Message /></el-icon>
                <span>邮箱验证码登录</span>
              </a>
            </div>
          </div>
        </div>

        <!-- WeChat MP (public account) login -->
        <div v-if="activeTab === 'wechat-mp'" class="login-form qr-form">
          <p class="qr-tip">请使用微信扫码关注公众号完成登录</p>
          <div class="qr-wrapper">
            <div class="qr-placeholder">
              <!-- QR code placeholder for MP -->
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="qr-svg">
                <rect width="200" height="200" fill="#fff"/>
                <g fill="#333">
                  <rect x="10" y="10" width="50" height="50" rx="4"/>
                  <rect x="15" y="15" width="40" height="40" rx="2" fill="#fff"/>
                  <rect x="22" y="22" width="26" height="26" rx="2"/>
                  <rect x="140" y="10" width="50" height="50" rx="4"/>
                  <rect x="145" y="15" width="40" height="40" rx="2" fill="#fff"/>
                  <rect x="152" y="22" width="26" height="26" rx="2"/>
                  <rect x="10" y="140" width="50" height="50" rx="4"/>
                  <rect x="15" y="145" width="40" height="40" rx="2" fill="#fff"/>
                  <rect x="22" y="152" width="26" height="26" rx="2"/>
                  <rect x="70" y="10" width="8" height="8"/>
                  <rect x="86" y="18" width="8" height="8"/>
                  <rect x="102" y="10" width="8" height="8"/>
                  <rect x="118" y="26" width="8" height="8"/>
                  <rect x="70" y="34" width="8" height="8"/>
                  <rect x="102" y="42" width="8" height="8"/>
                  <rect x="70" y="50" width="8" height="8"/>
                  <rect x="86" y="42" width="8" height="8"/>
                  <rect x="118" y="50" width="8" height="8"/>
                  <rect x="10" y="70" width="8" height="8"/>
                  <rect x="26" y="78" width="8" height="8"/>
                  <rect x="42" y="70" width="8" height="8"/>
                  <rect x="70" y="78" width="8" height="8"/>
                  <rect x="86" y="70" width="8" height="8"/>
                  <rect x="102" y="78" width="8" height="8"/>
                  <rect x="118" y="70" width="8" height="8"/>
                  <rect x="150" y="78" width="8" height="8"/>
                  <rect x="166" y="70" width="8" height="8"/>
                  <rect x="182" y="78" width="8" height="8"/>
                  <rect x="10" y="94" width="8" height="8"/>
                  <rect x="42" y="94" width="8" height="8"/>
                  <rect x="70" y="94" width="8" height="8"/>
                  <rect x="118" y="94" width="8" height="8"/>
                  <rect x="150" y="94" width="8" height="8"/>
                  <rect x="182" y="94" width="8" height="8"/>
                  <rect x="26" y="110" width="8" height="8"/>
                  <rect x="42" y="110" width="8" height="8"/>
                  <rect x="70" y="118" width="8" height="8"/>
                  <rect x="86" y="110" width="8" height="8"/>
                  <rect x="102" y="118" width="8" height="8"/>
                  <rect x="150" y="110" width="8" height="8"/>
                  <rect x="166" y="118" width="8" height="8"/>
                  <rect x="10" y="126" width="8" height="8"/>
                  <rect x="26" y="126" width="8" height="8"/>
                  <rect x="86" y="126" width="8" height="8"/>
                  <rect x="118" y="126" width="8" height="8"/>
                  <rect x="150" y="126" width="8" height="8"/>
                  <rect x="182" y="126" width="8" height="8"/>
                  <rect x="70" y="148" width="8" height="8"/>
                  <rect x="86" y="140" width="8" height="8"/>
                  <rect x="118" y="148" width="8" height="8"/>
                  <rect x="150" y="140" width="8" height="8"/>
                  <rect x="166" y="148" width="8" height="8"/>
                  <rect x="70" y="164" width="8" height="8"/>
                  <rect x="102" y="156" width="8" height="8"/>
                  <rect x="150" y="164" width="8" height="8"/>
                  <rect x="182" y="156" width="8" height="8"/>
                  <rect x="70" y="180" width="8" height="8"/>
                  <rect x="86" y="180" width="8" height="8"/>
                  <rect x="102" y="180" width="8" height="8"/>
                  <rect x="118" y="172" width="8" height="8"/>
                  <rect x="140" y="180" width="8" height="8"/>
                  <rect x="166" y="172" width="8" height="8"/>
                  <rect x="182" y="180" width="8" height="8"/>
                </g>
                <rect x="75" y="75" width="50" height="50" rx="8" fill="#576b95"/>
                <text x="100" y="107" text-anchor="middle" fill="white" font-size="20" font-weight="bold">公</text>
              </svg>
            </div>
            <!-- Expired overlay -->
            <div v-if="wechatMpExpired" class="qr-overlay">
              <p>二维码已过期</p>
              <el-button type="primary" size="small" :icon="Refresh" @click="refreshWechatMp">
                点击刷新
              </el-button>
            </div>
            <!-- Scanned overlay -->
            <div v-if="wechatMpScanned" class="qr-overlay scanned">
              <el-icon class="scanned-icon"><Promotion /></el-icon>
              <p>扫描成功</p>
              <p class="scan-sub">请在微信中关注公众号完成登录</p>
            </div>
          </div>

          <!-- Secondary login methods -->
          <div class="alt-login">
            <span class="alt-login-label">其他登录方式</span>
            <div class="alt-login-links">
              <a class="alt-link" role="button" tabindex="0" @click="handleTabChange('email')" @keyup.enter="handleTabChange('email')">
                <el-icon><Message /></el-icon>
                <span>邮箱验证码登录</span>
              </a>
              <a class="alt-link" role="button" tabindex="0" @click="handleTabChange('wechat-qr')" @keyup.enter="handleTabChange('wechat-qr')">
                <el-icon><ChatDotRound /></el-icon>
                <span>微信扫码登录</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Agreement -->
        <div class="login-agreement">
          登录即表示同意
          <a href="javascript:void(0)" @click.prevent="showAgreement = true">《用户服务协议》</a>
          和
          <a href="javascript:void(0)" @click.prevent="showPrivacy = true">《隐私政策》</a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="login-footer">
      <span>© {{ new Date().getFullYear() }} Mercury · 统一登录平台</span>
    </div>

    <!-- 用户服务协议 Dialog -->
    <el-dialog v-model="showAgreement" title="用户服务协议" width="680px" top="5vh" destroy-on-close>
      <div class="agreement-content">
        <h3>Mercury 统一登录平台用户服务协议</h3>
        <p><strong>生效日期：</strong>2026年1月1日</p>
        <p>欢迎您使用 Mercury 统一登录平台（以下简称"本平台"）。请您在使用前仔细阅读本协议的全部内容。一旦您使用本平台服务，即视为您已阅读、理解并同意接受本协议的约束。</p>

        <h4>一、服务说明</h4>
        <p>本平台为用户提供统一身份认证服务，包括但不限于手机验证码登录、邮箱验证码登录、微信扫码登录等方式。本平台仅提供身份认证服务，不直接提供其他业务功能。</p>

        <h4>二、账号注册与使用</h4>
        <p>1. 您在使用本平台时，需提供真实、准确、完整的个人信息，并在信息变更时及时更新。</p>
        <p>2. 您应妥善保管自己的账号和密码信息，因您个人原因导致账号信息泄露所造成的损失由您自行承担。</p>
        <p>3. 您不得将账号转让、出借或以任何方式提供给他人使用。</p>

        <h4>三、用户行为规范</h4>
        <p>1. 您在使用本平台服务时，应遵守国家法律法规及相关规定。</p>
        <p>2. 您不得利用本平台从事任何违法、违规或侵害他人合法权益的行为。</p>
        <p>3. 您不得对本平台进行反向工程、反编译或以其他方式尝试获取本平台的源代码。</p>
        <p>4. 您不得以任何方式干扰本平台的正常运行，包括但不限于恶意攻击、传播病毒等。</p>

        <h4>四、知识产权</h4>
        <p>本平台的所有内容，包括但不限于文字、图片、界面设计、程序代码等，均受知识产权法律保护。未经本平台书面许可，任何人不得以任何方式使用。</p>

        <h4>五、服务变更与中断</h4>
        <p>1. 本平台有权根据业务需要修改或中断服务，并在合理时间内通知用户。</p>
        <p>2. 因不可抗力或系统维护等原因导致的服务中断，本平台不承担责任。</p>

        <h4>六、免责声明</h4>
        <p>1. 本平台不对因网络中断、系统故障等非本平台原因造成的损失承担责任。</p>
        <p>2. 本平台对通过本服务获取的信息的准确性、完整性不作保证。</p>

        <h4>七、协议修改</h4>
        <p>本平台有权随时修改本协议内容，修改后的协议将在本平台公布。您继续使用本平台服务即表示同意接受修改后的协议。</p>

        <h4>八、联系方式</h4>
        <p>如您对本协议有任何疑问，请通过本平台提供的联系方式与我们取得联系。</p>
      </div>
    </el-dialog>

    <!-- 隐私政策 Dialog -->
    <el-dialog v-model="showPrivacy" title="隐私政策" width="680px" top="5vh" destroy-on-close>
      <div class="agreement-content">
        <h3>Mercury 统一登录平台隐私政策</h3>
        <p><strong>生效日期：</strong>2026年1月1日</p>
        <p>Mercury 统一登录平台（以下简称"本平台"）非常重视用户的隐私保护。本隐私政策旨在说明我们如何收集、使用、存储和保护您的个人信息。</p>

        <h4>一、信息收集</h4>
        <p>我们可能收集以下类型的信息：</p>
        <p>1. <strong>手机号码：</strong>用于手机验证码登录、账号绑定和安全验证。</p>
        <p>2. <strong>邮箱地址：</strong>用于邮箱验证码登录、账号绑定和通知发送。</p>
        <p>3. <strong>微信标识信息：</strong>用于微信扫码登录，包括微信 OpenID 等必要标识。</p>
        <p>4. <strong>设备信息：</strong>包括设备型号、操作系统版本、浏览器类型等，用于安全风控和服务优化。</p>
        <p>5. <strong>日志信息：</strong>包括登录时间、IP 地址等，用于安全审计和异常检测。</p>

        <h4>二、信息使用</h4>
        <p>我们收集的信息将用于以下目的：</p>
        <p>1. 提供身份认证和登录服务。</p>
        <p>2. 保障账号安全，进行风险检测和防范。</p>
        <p>3. 改善和优化我们的服务。</p>
        <p>4. 遵守法律法规的要求。</p>

        <h4>三、信息存储与保护</h4>
        <p>1. 我们采用加密传输（如 RSA、HTTPS）等安全措施保护您的信息在传输过程中的安全。</p>
        <p>2. 您的个人信息存储在安全的服务器上，我们采取严格的数据访问控制措施。</p>
        <p>3. 我们仅在实现服务目的所必需的期限内保留您的个人信息。</p>

        <h4>四、信息共享</h4>
        <p>1. 未经您的同意，我们不会向第三方共享您的个人信息，但以下情况除外：</p>
        <p>&nbsp;&nbsp;&nbsp;a. 根据法律法规的要求或政府主管部门的要求提供。</p>
        <p>&nbsp;&nbsp;&nbsp;b. 为维护本平台的合法权益所必需。</p>
        <p>2. 当您使用本平台登录第三方应用时，我们仅向第三方应用提供认证结果（Token），不会传输您的原始个人信息。</p>

        <h4>五、您的权利</h4>
        <p>1. 您有权访问和更正您的个人信息。</p>
        <p>2. 您有权删除您的账号及相关信息。</p>
        <p>3. 您有权撤回对个人信息处理的同意。</p>

        <h4>六、Cookie 和类似技术</h4>
        <p>本平台可能使用 Cookie 和类似技术来维持登录状态和改善用户体验。您可以通过浏览器设置管理 Cookie。</p>

        <h4>七、未成年人保护</h4>
        <p>我们非常重视对未成年人信息的保护。如您是未满 18 周岁的未成年人，请在监护人指导下使用本平台服务。</p>

        <h4>八、隐私政策更新</h4>
        <p>我们可能会不时更新本隐私政策。更新后的政策将在本平台公布，请您定期查阅。</p>

        <h4>九、联系我们</h4>
        <p>如您对本隐私政策有任何疑问或建议，请通过本平台提供的联系方式与我们取得联系。</p>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  background: #eef1f6;
  padding: 24px;
}

/* Wrapper: banner + card side by side */
.login-wrapper {
  display: flex;
  max-width: 920px;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1);
}

/* Left banner (inside wrapper, same height as card) */
.login-banner {
  flex: 0 0 320px;
  background: linear-gradient(135deg, #7c8cf5 0%, #a78bfa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-banner::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 28px 28px;
}

.banner-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #fff;
  padding: 40px 32px;
}

.brand-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
}

.brand-icon svg {
  width: 100%;
  height: 100%;
}

.brand-title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 6px;
}

.brand-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 40px;
}

.brand-features {
  text-align: left;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 14px;
}

.feature-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

/* Right login card */
.login-card {
  flex: 1;
  background: #fff;
  padding: 48px 44px 36px;
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.login-desc {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 32px;
}

/* Tabs */
.login-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 32px;
  background: #e8ecf1;
  border-radius: 10px;
  padding: 4px;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  font-size: 14px;
  color: #4b5563;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  white-space: nowrap;
}

.tab-item:hover {
  color: #6366f1;
}

.tab-item.active {
  background: #fff;
  color: #6366f1;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.tab-item .el-icon {
  font-size: 16px;
}

/* Form */
.login-form {
  min-height: 200px;
}

.code-input-group {
  display: flex;
  gap: 12px;
  width: 100%;
}

.code-input-group .el-input {
  flex: 1;
}

.code-btn {
  flex-shrink: 0;
  width: 120px;
  font-size: 13px;
}

.captcha-input-group {
  display: flex;
  gap: 12px;
  width: 100%;
  align-items: stretch;
}

.captcha-input-group .el-input {
  flex: 1;
}

.captcha-image-wrapper {
  flex-shrink: 0;
  width: 120px;
  cursor: pointer;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  transition: border-color 0.2s;
}

.captcha-image-wrapper:hover {
  border-color: #6366f1;
}

.captcha-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.captcha-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 20px;
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 10px;
  background: linear-gradient(135deg, #7c8cf5 0%, #a78bfa 100%);
  border: none;
  letter-spacing: 4px;
}

.login-btn:hover,
.login-btn:focus {
  background: linear-gradient(135deg, #6d7ef0 0%, #9b7bf5 100%);
}

.input-prefix {
  color: #1f2937;
  font-size: 14px;
  font-weight: 500;
  padding-right: 8px;
  border-right: 1px solid #d1d5db;
  margin-right: 4px;
}

/* QR code */
.qr-form {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-tip {
  font-size: 14px;
  color: #4b5563;
  margin-bottom: 24px;
}

.qr-wrapper {
  position: relative;
  width: 220px;
  height: 220px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}

.qr-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.qr-svg {
  width: 180px;
  height: 180px;
}

.qr-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.qr-overlay p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.qr-overlay.scanned {
  background: rgba(255, 255, 255, 0.97);
}

.scanned-icon {
  font-size: 48px;
  color: #67c23a;
  margin-bottom: 8px;
}

.scan-sub {
  font-size: 12px !important;
  color: #999 !important;
}

/* Alternative login methods */
.alt-login {
  margin-top: 8px;
  text-align: center;
}

.alt-login-label {
  display: block;
  font-size: 12px;
  color: #c0c4cc;
  margin-bottom: 12px;
  position: relative;
}

.alt-login-label::before,
.alt-login-label::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 60px;
  height: 1px;
  background: #e4e7ed;
}

.alt-login-label::before {
  left: 20%;
}

.alt-login-label::after {
  right: 20%;
}

.alt-login-links {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.alt-link {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: color 0.2s;
  text-decoration: none;
}

.alt-link:hover {
  color: #6366f1;
}

.alt-link:focus {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
  border-radius: 4px;
}

.alt-link .el-icon {
  font-size: 16px;
}

/* Agreement */
.login-agreement {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 24px;
  line-height: 1.8;
}

.login-agreement a {
  color: #6366f1;
  text-decoration: none;
}

.login-agreement a:hover {
  text-decoration: underline;
}

/* Footer */
.login-footer {
  margin-top: 24px;
  font-size: 12px;
  color: #9ca3af;
}

/* Responsive - Tablet (iPad) */
@media (max-width: 900px) {
  .login-banner {
    flex: 0 0 240px;
  }

  .banner-content {
    padding: 32px 20px;
  }

  .brand-title {
    font-size: 26px;
  }

  .brand-subtitle {
    margin-bottom: 28px;
  }

  .login-card {
    padding: 36px 28px 28px;
  }
}

/* Responsive - Mobile */
@media (max-width: 640px) {
  .login-container {
    padding: 16px;
  }

  .login-wrapper {
    flex-direction: column;
  }

  .login-banner {
    flex: none;
    padding: 14px 20px;
  }

  .banner-content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0;
    text-align: left;
  }

  .brand-icon {
    width: 32px;
    height: 32px;
    margin: 0;
    flex-shrink: 0;
  }

  .brand-title {
    font-size: 18px;
    margin-bottom: 0;
  }

  .brand-subtitle {
    display: none;
  }

  .brand-features {
    display: none;
  }

  .login-card {
    padding: 32px 24px 28px;
  }

  .code-input-group {
    flex-direction: column;
  }

  .code-btn {
    width: 100%;
  }

  .captcha-input-group {
    flex-direction: column;
  }

  .captcha-image-wrapper {
    width: 100%;
    height: 44px;
  }

  .alt-login-label::before,
  .alt-login-label::after {
    width: 40px;
  }

  .alt-login-label::before {
    left: 10%;
  }

  .alt-login-label::after {
    right: 10%;
  }
}

/* Element Plus overrides */
:deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 16px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-button--primary.is-plain) {
  --el-button-hover-bg-color: #6366f1;
  --el-button-hover-border-color: #6366f1;
  color: #6366f1;
  border-color: #6366f1;
}

.agreement-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 8px;
  line-height: 1.8;
  color: #333;
  font-size: 14px;
}

.agreement-content h3 {
  text-align: center;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.agreement-content h4 {
  margin: 20px 0 8px;
  color: #1a1a1a;
}

.agreement-content p {
  margin: 6px 0;
  text-indent: 0;
}
</style>
