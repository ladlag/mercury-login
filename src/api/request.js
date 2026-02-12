import { API_BASE_URL, REQUEST_TIMEOUT } from './config.js'

/**
 * Centralized HTTP request utility using native fetch.
 * Handles request/response interceptors, error normalization, and security headers.
 */

/** Business-level success code returned by the backend */
const SUCCESS_CODE = '200'

/**
 * Make an HTTP request to the backend API.
 *
 * @param {string} url - API endpoint path (relative to base URL)
 * @param {Object} options - Fetch options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.body] - Request body (will be JSON-serialized)
 * @param {Object} [options.headers] - Additional headers
 * @returns {Promise<{code: string, message: string, data: any}>} Parsed response
 * @throws {ApiError} On network or API errors
 */
export async function request(url, options = {}) {
  const { method = 'GET', body, headers = {} } = options

  const fullUrl = `${API_BASE_URL}${url}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    }

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(fullUrl, fetchOptions)

    let result
    try {
      result = await response.json()
    } catch {
      throw new ApiError(
        '服务器响应格式异常',
        response.status,
        'PARSE_ERROR'
      )
    }

    // Handle non-2xx HTTP status
    if (!response.ok) {
      throw new ApiError(
        result.message || getDefaultErrorMessage(response.status),
        response.status,
        result.code || String(response.status)
      )
    }

    // Handle business-level error codes in response body
    if (result.code && String(result.code) !== SUCCESS_CODE) {
      throw new ApiError(
        result.message || '操作失败',
        response.status,
        result.code,
        result.data
      )
    }

    return result
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error.name === 'AbortError') {
      throw new ApiError('请求超时，请稍后重试', 0, 'TIMEOUT')
    }
    throw new ApiError('网络连接失败，请检查网络设置', 0, 'NETWORK_ERROR')
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Custom error class for API errors.
 * Carries `data` from the response body so callers can inspect business-level
 * fields (e.g. captchaRequired) even on error responses.
 */
export class ApiError extends Error {
  constructor(message, httpStatus, code, data) {
    super(message)
    this.name = 'ApiError'
    this.httpStatus = httpStatus
    this.code = code
    this.data = data ?? null
  }
}

/**
 * Get a user-friendly error message for common HTTP status codes.
 * Used as fallback when backend doesn't provide a message.
 */
function getDefaultErrorMessage(status) {
  const messages = {
    400: '请求参数有误，请检查后重试',
    401: '登录已过期，请重新登录',
    403: '没有操作权限',
    404: '请求的资源不存在',
    429: '操作过于频繁，请稍后重试',
    500: '服务器繁忙，请稍后重试',
    502: '服务器繁忙，请稍后重试',
    503: '服务暂时不可用，请稍后重试',
  }
  return messages[status] || '服务器繁忙，请稍后重试'
}

// Convenience methods
export const get = (url, options) => request(url, { ...options, method: 'GET' })
export const post = (url, body, options) => request(url, { ...options, method: 'POST', body })
