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

// Current login method: phone | email | wechat-qr | wechat-mp
const activeTab = ref('phone')

// Phone login form
const phoneForm = reactive({
  phone: '',
  code: '',
})
const phoneCodeCountdown = ref(0)
let phoneTimer = null

// Email login form
const emailForm = reactive({
  email: '',
  code: '',
})
const emailCodeCountdown = ref(0)
let emailTimer = null

// WeChat QR login
const wechatQrExpired = ref(false)
const wechatQrScanned = ref(false)
let wechatQrTimer = null

// WeChat MP (public account) login
const wechatMpExpired = ref(false)
const wechatMpScanned = ref(false)
let wechatMpTimer = null

// Get redirect URL from query params
const redirectUrl = computed(() => {
  const params = new URLSearchParams(window.location.search)
  return params.get('redirect') || ''
})

// Phone validation
const isValidPhone = computed(() => {
  return /^1[3-9]\d{9}$/.test(phoneForm.phone)
})

// Email validation
const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email)
})

// Send phone verification code
function sendPhoneCode() {
  if (!isValidPhone.value) {
    ElMessage.warning('请输入正确的手机号码')
    return
  }
  if (phoneCodeCountdown.value > 0) return

  // Simulate sending code
  ElMessage.success('验证码已发送至 ' + phoneForm.phone)
  phoneCodeCountdown.value = 60
  phoneTimer = setInterval(() => {
    phoneCodeCountdown.value--
    if (phoneCodeCountdown.value <= 0) {
      clearInterval(phoneTimer)
      phoneTimer = null
    }
  }, 1000)
}

// Send email verification code
function sendEmailCode() {
  if (!isValidEmail.value) {
    ElMessage.warning('请输入正确的邮箱地址')
    return
  }
  if (emailCodeCountdown.value > 0) return

  // Simulate sending code
  ElMessage.success('验证码已发送至 ' + emailForm.email)
  emailCodeCountdown.value = 60
  emailTimer = setInterval(() => {
    emailCodeCountdown.value--
    if (emailCodeCountdown.value <= 0) {
      clearInterval(emailTimer)
      emailTimer = null
    }
  }, 1000)
}

// Phone login submit
function handlePhoneLogin() {
  if (!isValidPhone.value) {
    ElMessage.warning('请输入正确的手机号码')
    return
  }
  if (!phoneForm.code || phoneForm.code.length < 4) {
    ElMessage.warning('请输入验证码')
    return
  }
  // Simulate login success
  ElMessage.success('登录成功')
  handleLoginSuccess('mock-token-phone-' + Date.now())
}

// Email login submit
function handleEmailLogin() {
  if (!isValidEmail.value) {
    ElMessage.warning('请输入正确的邮箱地址')
    return
  }
  if (!emailForm.code || emailForm.code.length < 4) {
    ElMessage.warning('请输入验证码')
    return
  }
  // Simulate login success
  ElMessage.success('登录成功')
  handleLoginSuccess('mock-token-email-' + Date.now())
}

// Handle login success - redirect with token
function handleLoginSuccess(token) {
  if (redirectUrl.value) {
    const separator = redirectUrl.value.includes('?') ? '&' : '?'
    window.location.href = redirectUrl.value + separator + 'token=' + encodeURIComponent(token)
  } else {
    ElMessage.info('登录成功，Token: ' + token)
  }
}

// Switch to WeChat QR tab
function initWechatQr() {
  wechatQrExpired.value = false
  wechatQrScanned.value = false
  clearTimeout(wechatQrTimer)
  // Simulate QR code expiration after 120 seconds
  wechatQrTimer = setTimeout(() => {
    if (!wechatQrScanned.value) {
      wechatQrExpired.value = true
      ElMessage.warning('二维码已过期，请刷新')
    }
  }, 120000)
}

// Refresh WeChat QR
function refreshWechatQr() {
  initWechatQr()
  ElMessage.success('二维码已刷新')
}

// Switch to WeChat MP tab
function initWechatMp() {
  wechatMpExpired.value = false
  wechatMpScanned.value = false
  clearTimeout(wechatMpTimer)
  // Simulate QR code expiration after 120 seconds
  wechatMpTimer = setTimeout(() => {
    if (!wechatMpScanned.value) {
      wechatMpExpired.value = true
      ElMessage.warning('二维码已过期，请刷新')
    }
  }, 120000)
}

// Refresh WeChat MP QR
function refreshWechatMp() {
  initWechatMp()
  ElMessage.success('二维码已刷新')
}

// Handle tab change
function handleTabChange(tab) {
  activeTab.value = tab
  if (tab === 'wechat-qr') {
    initWechatQr()
  } else if (tab === 'wechat-mp') {
    initWechatMp()
  }
}

// Phone code button text
const phoneCodeBtnText = computed(() => {
  return phoneCodeCountdown.value > 0
    ? `${phoneCodeCountdown.value}s 后重发`
    : '获取验证码'
})

// Email code button text
const emailCodeBtnText = computed(() => {
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
})
</script>

<template>
  <div class="login-container">
    <!-- Left decorative area -->
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

    <!-- Right login area -->
    <div class="login-panel">
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
            <el-form-item>
              <el-input
                v-model="phoneForm.phone"
                placeholder="请输入手机号码"
                maxlength="11"
                clearable
              >
                <template #prefix>
                  <span class="input-prefix">+86</span>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <div class="code-input-group">
                <el-input
                  v-model="phoneForm.code"
                  placeholder="请输入验证码"
                  maxlength="6"
                  clearable
                  @keyup.enter="handlePhoneLogin"
                />
                <el-button
                  type="primary"
                  plain
                  :disabled="!isValidPhone || phoneCodeCountdown > 0"
                  @click="sendPhoneCode"
                  class="code-btn"
                >
                  {{ phoneCodeBtnText }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                class="login-btn"
                :disabled="!isValidPhone || !phoneForm.code"
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
            <el-form-item>
              <el-input
                v-model="emailForm.email"
                placeholder="请输入邮箱地址"
                clearable
              >
                <template #prefix>
                  <el-icon><Message /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <div class="code-input-group">
                <el-input
                  v-model="emailForm.code"
                  placeholder="请输入验证码"
                  maxlength="6"
                  clearable
                  @keyup.enter="handleEmailLogin"
                />
                <el-button
                  type="primary"
                  plain
                  :disabled="!isValidEmail || emailCodeCountdown > 0"
                  @click="sendEmailCode"
                  class="code-btn"
                >
                  {{ emailCodeBtnText }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                class="login-btn"
                :disabled="!isValidEmail || !emailForm.code"
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
          <a href="javascript:void(0)">《用户服务协议》</a>
          和
          <a href="javascript:void(0)">《隐私政策》</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="login-footer">
        <span>© {{ new Date().getFullYear() }} Mercury · 统一登录平台</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  width: 100%;
  height: 100vh;
  background: #f5f7fa;
}

/* Left banner */
.login-banner {
  flex: 0 0 420px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 30px 30px;
}

.banner-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #fff;
  padding: 40px;
}

.brand-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
}

.brand-icon svg {
  width: 100%;
  height: 100%;
}

.brand-title {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.brand-subtitle {
  font-size: 16px;
  opacity: 0.85;
  margin-bottom: 48px;
}

.brand-features {
  text-align: left;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 16px;
}

.feature-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

/* Right panel */
.login-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 40px;
  min-height: 100vh;
}

.login-card {
  width: 100%;
  max-width: 520px;
  background: #fff;
  border-radius: 16px;
  padding: 48px 44px 36px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.login-desc {
  font-size: 14px;
  color: #8e8ea0;
  margin-bottom: 32px;
}

/* Tabs */
.login-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 32px;
  background: #f5f7fa;
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
  color: #666;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  white-space: nowrap;
}

.tab-item:hover {
  color: #667eea;
}

.tab-item.active {
  background: #fff;
  color: #667eea;
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
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

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  letter-spacing: 4px;
}

.login-btn:hover,
.login-btn:focus {
  background: linear-gradient(135deg, #5a72d8 0%, #6a4294 100%);
}

.input-prefix {
  color: #333;
  font-size: 14px;
  font-weight: 500;
  padding-right: 8px;
  border-right: 1px solid #dcdfe6;
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
  color: #666;
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
  color: #909399;
  cursor: pointer;
  transition: color 0.2s;
  text-decoration: none;
}

.alt-link:hover {
  color: #667eea;
}

.alt-link:focus {
  outline: 2px solid #667eea;
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
  color: #667eea;
  text-decoration: none;
}

.login-agreement a:hover {
  text-decoration: underline;
}

/* Footer */
.login-footer {
  margin-top: 40px;
  font-size: 12px;
  color: #c0c4cc;
}

/* Responsive */
@media (max-width: 900px) {
  .login-banner {
    display: none;
  }

  .login-panel {
    padding: 20px;
  }

  .login-card {
    padding: 32px 24px 28px;
  }
}

@media (max-width: 480px) {
  .code-input-group {
    flex-direction: column;
  }

  .code-btn {
    width: 100%;
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
  --el-button-hover-bg-color: #667eea;
  --el-button-hover-border-color: #667eea;
  color: #667eea;
  border-color: #667eea;
}
</style>
