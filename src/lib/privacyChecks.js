// وظائف فحص الخصوصية والمراقبة

export class PrivacyChecker {
  constructor() {
    this.results = {}
  }

  // فحص إعدادات DNS
  async checkDNS() {
    try {
      // فحص DNS over HTTPS
      const dnsServers = [
        '1.1.1.1', // Cloudflare
        '8.8.8.8', // Google
        '9.9.9.9'  // Quad9
      ]

      const results = []
      
      for (const server of dnsServers) {
        try {
          const start = performance.now()
          await fetch(`https://${server}`, { mode: 'no-cors' })
          const end = performance.now()
          results.push({ server, time: end - start, accessible: true })
        } catch (error) {
          results.push({ server, time: null, accessible: false })
        }
      }

      const blockedServers = results.filter(r => !r.accessible).length
      
      if (blockedServers === 0) {
        return {
          status: 'safe',
          message: 'إعدادات DNS آمنة - لا توجد خوادم مفلترة',
          details: results
        }
      } else if (blockedServers < dnsServers.length) {
        return {
          status: 'warning',
          message: 'تم اكتشاف خوادم DNS مخصصة - قد تكون مفلترة',
          details: results
        }
      } else {
        return {
          status: 'danger',
          message: 'تم اكتشاف خوادم DNS مفلترة - يتم حجب المحتوى',
          details: results
        }
      }
    } catch (error) {
      return {
        status: 'warning',
        message: 'لا يمكن فحص إعدادات DNS',
        details: { error: error.message }
      }
    }
  }

  // فحص الوكيل (Proxy)
  async checkProxy() {
    try {
      // فحص WebRTC للكشف عن IP الحقيقي
      const rtcResult = await this.checkWebRTC()
      
      // فحص HTTP headers
      const response = await fetch('https://httpbin.org/headers', {
        method: 'GET'
      })
      const data = await response.json()
      
      const headers = data.headers
      const proxyHeaders = [
        'X-Forwarded-For',
        'X-Real-IP',
        'X-Proxy-Authorization',
        'Via',
        'Forwarded'
      ]

      const foundProxyHeaders = proxyHeaders.filter(header => 
        headers[header] || headers[header.toLowerCase()]
      )

      if (foundProxyHeaders.length > 0 || rtcResult.hasProxy) {
        return {
          status: 'danger',
          message: 'تم اكتشاف وكيل إجباري - قد يتم مراقبة الأنشطة',
          details: { proxyHeaders: foundProxyHeaders, webrtc: rtcResult }
        }
      } else {
        return {
          status: 'safe',
          message: 'لا يوجد وكيل (Proxy) مكتشف',
          details: { headers, webrtc: rtcResult }
        }
      }
    } catch (error) {
      return {
        status: 'warning',
        message: 'تم اكتشاف وكيل محتمل',
        details: { error: error.message }
      }
    }
  }

  // فحص WebRTC
  async checkWebRTC() {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })

        const ips = []
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const ip = event.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1]
            if (ip && !ips.includes(ip)) {
              ips.push(ip)
            }
          }
        }

        pc.createDataChannel('')
        pc.createOffer().then(offer => pc.setLocalDescription(offer))

        setTimeout(() => {
          pc.close()
          resolve({
            hasProxy: ips.length === 0,
            ips: ips,
            details: 'WebRTC IP detection'
          })
        }, 3000)
      } catch (error) {
        resolve({
          hasProxy: false,
          ips: [],
          details: 'WebRTC not supported'
        })
      }
    })
  }

  // فحص إعدادات المتصفح
  async checkBrowser() {
    try {
      const browserInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        plugins: Array.from(navigator.plugins).map(p => p.name),
        webdriver: navigator.webdriver
      }

      // فحص الإضافات المشبوهة
      const suspiciousPlugins = browserInfo.plugins.filter(plugin => 
        plugin.toLowerCase().includes('parental') ||
        plugin.toLowerCase().includes('filter') ||
        plugin.toLowerCase().includes('monitor') ||
        plugin.toLowerCase().includes('control')
      )

      // فحص WebDriver (أتمتة المتصفح)
      const isAutomated = browserInfo.webdriver || 
                         window.navigator.webdriver ||
                         window.callPhantom ||
                         window._phantom

      if (suspiciousPlugins.length > 0 || isAutomated) {
        return {
          status: 'danger',
          message: 'تم اكتشاف برامج مراقبة في المتصفح',
          details: { suspiciousPlugins, isAutomated, browserInfo }
        }
      } else if (browserInfo.plugins.length > 10) {
        return {
          status: 'warning',
          message: 'توجد إضافات قد تؤثر على الخصوصية',
          details: { pluginCount: browserInfo.plugins.length, browserInfo }
        }
      } else {
        return {
          status: 'safe',
          message: 'إعدادات المتصفح آمنة',
          details: browserInfo
        }
      }
    } catch (error) {
      return {
        status: 'warning',
        message: 'لا يمكن فحص إعدادات المتصفح',
        details: { error: error.message }
      }
    }
  }

  // فحص الشبكة والاتصال
  async checkNetwork() {
    try {
      const testSites = [
        'https://www.google.com',
        'https://www.facebook.com',
        'https://www.youtube.com',
        'https://www.twitter.com'
      ]

      const results = []
      
      for (const site of testSites) {
        try {
          const start = performance.now()
          await fetch(site, { 
            mode: 'no-cors',
            cache: 'no-cache'
          })
          const end = performance.now()
          results.push({ 
            site, 
            time: end - start, 
            accessible: true,
            blocked: false
          })
        } catch (error) {
          results.push({ 
            site, 
            time: null, 
            accessible: false,
            blocked: true,
            error: error.message
          })
        }
      }

      const blockedSites = results.filter(r => r.blocked).length
      const avgTime = results
        .filter(r => r.time)
        .reduce((sum, r) => sum + r.time, 0) / results.filter(r => r.time).length

      if (blockedSites > 0) {
        return {
          status: 'danger',
          message: 'تم اكتشاف حجب على مستوى الشبكة',
          details: { blockedSites, avgTime, results }
        }
      } else if (avgTime > 3000) {
        return {
          status: 'warning',
          message: 'سرعة الشبكة بطيئة - قد تكون مفلترة',
          details: { avgTime, results }
        }
      } else {
        return {
          status: 'safe',
          message: 'الشبكة آمنة - لا توجد قيود مكتشفة',
          details: { avgTime, results }
        }
      }
    } catch (error) {
      return {
        status: 'warning',
        message: 'لا يمكن فحص الشبكة',
        details: { error: error.message }
      }
    }
  }

  // فحص التشفير والأمان
  async checkSecurity() {
    try {
      const securityInfo = {
        https: location.protocol === 'https:',
        secureContext: window.isSecureContext,
        crypto: !!window.crypto,
        webCrypto: !!window.crypto?.subtle,
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
        indexedDB: !!window.indexedDB
      }

      // فحص CSP (Content Security Policy)
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      securityInfo.csp = !!cspMeta

      // فحص HSTS
      securityInfo.hsts = document.location.protocol === 'https:' && 
                         document.location.hostname !== 'localhost'

      const securityScore = Object.values(securityInfo).filter(Boolean).length
      const totalChecks = Object.keys(securityInfo).length

      if (securityScore >= totalChecks * 0.8) {
        return {
          status: 'safe',
          message: 'الاتصالات مشفرة بشكل صحيح',
          details: { score: securityScore, total: totalChecks, securityInfo }
        }
      } else if (securityScore >= totalChecks * 0.6) {
        return {
          status: 'warning',
          message: 'بعض الاتصالات غير مشفرة',
          details: { score: securityScore, total: totalChecks, securityInfo }
        }
      } else {
        return {
          status: 'danger',
          message: 'تم اكتشاف مشاكل في التشفير',
          details: { score: securityScore, total: totalChecks, securityInfo }
        }
      }
    } catch (error) {
      return {
        status: 'warning',
        message: 'لا يمكن فحص الأمان',
        details: { error: error.message }
      }
    }
  }

  // فحص برامج الرقابة
  async checkMonitoring() {
    try {
      const monitoringIndicators = {
        // فحص متغيرات النظام المشبوهة
        suspiciousGlobals: [],
        // فحص الأحداث المراقبة
        eventListeners: [],
        // فحص التعديلات على الكائنات الأساسية
        modifiedObjects: []
      }

      // فحص المتغيرات العامة المشبوهة
      const suspiciousNames = [
        'parentalControl',
        'monitoring',
        'filter',
        'blocker',
        'guardian',
        'supervisor',
        'watcher',
        'tracker'
      ]

      for (const name of suspiciousNames) {
        if (window[name]) {
          monitoringIndicators.suspiciousGlobals.push(name)
        }
      }

      // فحص تعديلات على console
      if (console.log.toString().includes('native code') === false) {
        monitoringIndicators.modifiedObjects.push('console')
      }

      // فحص تعديلات على XMLHttpRequest
      if (XMLHttpRequest.prototype.open.toString().includes('native code') === false) {
        monitoringIndicators.modifiedObjects.push('XMLHttpRequest')
      }

      // فحص تعديلات على fetch
      if (fetch.toString().includes('native code') === false) {
        monitoringIndicators.modifiedObjects.push('fetch')
      }

      const totalIndicators = 
        monitoringIndicators.suspiciousGlobals.length +
        monitoringIndicators.modifiedObjects.length

      if (totalIndicators >= 3) {
        return {
          status: 'danger',
          message: 'تم اكتشاف برامج رقابة أبوية نشطة',
          details: monitoringIndicators
        }
      } else if (totalIndicators >= 1) {
        return {
          status: 'warning',
          message: 'توجد عمليات مشبوهة',
          details: monitoringIndicators
        }
      } else {
        return {
          status: 'safe',
          message: 'لم يتم اكتشاف برامج مراقبة',
          details: monitoringIndicators
        }
      }
    } catch (error) {
      return {
        status: 'warning',
        message: 'لا يمكن فحص برامج المراقبة',
        details: { error: error.message }
      }
    }
  }

  // تشغيل جميع الفحوصات
  async runAllChecks(onProgress) {
    const checks = [
      { name: 'فحص إعدادات DNS', method: 'checkDNS', key: 'dns' },
      { name: 'فحص الوكيل (Proxy)', method: 'checkProxy', key: 'proxy' },
      { name: 'فحص إعدادات المتصفح', method: 'checkBrowser', key: 'browser' },
      { name: 'فحص الشبكة والاتصال', method: 'checkNetwork', key: 'network' },
      { name: 'فحص التشفير والأمان', method: 'checkSecurity', key: 'security' },
      { name: 'فحص برامج الرقابة', method: 'checkMonitoring', key: 'monitoring' }
    ]

    const results = {}

    for (let i = 0; i < checks.length; i++) {
      const check = checks[i]
      
      if (onProgress) {
        onProgress({
          current: check.name,
          progress: (i / checks.length) * 100,
          completed: i,
          total: checks.length
        })
      }

      try {
        results[check.key] = await this[check.method]()
      } catch (error) {
        results[check.key] = {
          status: 'warning',
          message: `خطأ في ${check.name}`,
          details: { error: error.message }
        }
      }

      // تأخير قصير بين الفحوصات
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (onProgress) {
      onProgress({
        current: 'اكتمل الفحص',
        progress: 100,
        completed: checks.length,
        total: checks.length
      })
    }

    return results
  }
}

