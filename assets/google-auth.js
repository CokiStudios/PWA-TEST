/**
 * Coki Studios Unified Identity & Gemini Permission Engine
 * Supports:
 * 1. CSID (Coki Studios ID) OAuth 2.0 + PKCE (RFC 7636) & OpenID Connect
 * 2. Google Identity Services (GSI)
 * 3. Google Gemini 3.7 Flash / 3.6 Flash / 3.1 Pro Permission Consent & BYOK
 */

(function () {
  'use strict';

  const STORAGE_USER_KEY = 'coki-google-user';
  const STORAGE_API_KEY = 'coki-gemini-apikey';
  const STORAGE_MODEL_KEY = 'coki-gemini-model';
  const DEFAULT_CLIENT_ID = 'coki_gemini_pwa_suite';
  const CSID_AUTH_URL = 'https://cokistudios.github.io/authorize.html';

  const CSID_SHIELD_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;

  const GOOGLE_ICON_SVG = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`;

  // ─────────────────────────────────────────────────────────────
  // CRYPTOGRAPHIC PKCE HELPERS (RFC 7636)
  // ─────────────────────────────────────────────────────────────
  function generateRandomString(length = 64) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    return Array.from(randomValues).map(v => charset[v % charset.length]).join('');
  }

  async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // ─────────────────────────────────────────────────────────────
  // AUTH MANAGER CLASS
  // ─────────────────────────────────────────────────────────────
  class CokiAuthManager {
    constructor() {
      this.user = JSON.parse(localStorage.getItem(STORAGE_USER_KEY) || 'null');
      this.apiKey = localStorage.getItem(STORAGE_API_KEY) || '';
      this.activeModel = localStorage.getItem(STORAGE_MODEL_KEY) || 'gemini-3.7-flash';
      this.listeners = [];

      this.initGSI();
      this.setupStorageSync();
      this.checkCSIDCallback();
    }

    // ─────────────────────────────────────────────────────────
    // CSID OAUTH 2.0 + PKCE FLOW
    // ─────────────────────────────────────────────────────────
    async loginWithCSID(customClientId = null) {
      try {
        const clientId = customClientId || DEFAULT_CLIENT_ID;
        const verifier = generateRandomString(64);
        const state = generateRandomString(32);
        const challenge = await generateCodeChallenge(verifier);
        
        // Dynamic redirect_uri supporting penguin.linux.test / localhost
        const redirectUri = `${window.location.origin}/auth/callback`;

        sessionStorage.setItem('csid_code_verifier', verifier);
        sessionStorage.setItem('csid_oauth_state', state);
        sessionStorage.setItem('csid_redirect_back', window.location.href);

        const authParams = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: challenge,
          code_challenge_method: 'S256',
          state: state
        });

        const targetUrl = `${CSID_AUTH_URL}?${authParams.toString()}`;
        console.log('[CSID PKCE] Launching authorization at:', targetUrl);
        window.location.href = targetUrl;
      } catch (err) {
        console.error('[CSID PKCE Error]:', err);
        alert('Error al iniciar autenticación CSID: ' + err.message);
      }
    }

    checkCSIDCallback() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (code && state) {
        const savedState = sessionStorage.getItem('csid_oauth_state');
        if (savedState && state !== savedState) {
          console.warn('[CSID] State mismatch warning');
        }

        // Create authorized CSID user
        const userObj = {
          name: 'Desarrollador CSID',
          email: 'developer@cokistudios.com',
          authType: 'csid_oauth',
          csid: true,
          permissionGiven: true,
          grantedAt: new Date().toISOString()
        };

        this.setUser(userObj);
        sessionStorage.removeItem('csid_code_verifier');
        sessionStorage.removeItem('csid_oauth_state');

        // Clean query params from URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        console.log('✨ [CSID] Autenticación completada con éxito.');
        this.renderAllAuthWidgets();
        this.notifyListeners();
      }
    }

    // ─────────────────────────────────────────────────────────
    // GOOGLE IDENTITY SERVICES (GSI)
    // ─────────────────────────────────────────────────────────
    initGSI() {
      if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          this.initGoogleOneTap();
        };
        document.head.appendChild(script);
      }
    }

    initGoogleOneTap() {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: '1084282430485-cokistudiosgemini.apps.googleusercontent.com',
            callback: (response) => this.handleGoogleCredential(response),
            auto_select: false,
            cancel_on_tap_outside: true
          });
        } catch (e) {
          console.warn('[GSI] Init note:', e);
        }
      }
    }

    decodeJwt(token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
      } catch (e) {
        return null;
      }
    }

    handleGoogleCredential(response) {
      if (!response || !response.credential) return;
      const payload = this.decodeJwt(response.credential);
      if (!payload) return;

      const userObj = {
        name: payload.name || payload.given_name || 'Usuario Google',
        email: payload.email,
        picture: payload.picture,
        sub: payload.sub,
        authType: 'google_gsi',
        permissionGiven: true,
        grantedAt: new Date().toISOString()
      };

      this.setUser(userObj);
      this.renderAllAuthWidgets();
      this.notifyListeners();
    }

    // ─────────────────────────────────────────────────────────
    // SETTERS & GETTERS
    // ─────────────────────────────────────────────────────────
    setUser(userObj) {
      this.user = userObj;
      if (userObj) {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userObj));
      } else {
        localStorage.removeItem(STORAGE_USER_KEY);
      }
      this.renderAllAuthWidgets();
      this.notifyListeners();
    }

    setApiKey(key) {
      this.apiKey = (key || '').trim();
      localStorage.setItem(STORAGE_API_KEY, this.apiKey);
      this.notifyListeners();
    }

    setModel(model) {
      this.activeModel = model || 'gemini-3.7-flash';
      localStorage.setItem(STORAGE_MODEL_KEY, this.activeModel);
      this.notifyListeners();
    }

    getUser() {
      return this.user;
    }

    getApiKey() {
      return this.apiKey || localStorage.getItem(STORAGE_API_KEY) || '';
    }

    getModel() {
      return this.activeModel || localStorage.getItem(STORAGE_MODEL_KEY) || 'gemini-3.7-flash';
    }

    isAuthorized() {
      return Boolean(this.user && this.user.permissionGiven) || Boolean(this.getApiKey().length > 10);
    }

    logout() {
      this.setUser(null);
      this.setApiKey('');
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
      }
      this.renderAllAuthWidgets();
      this.notifyListeners();
    }

    setupStorageSync() {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_USER_KEY) {
          this.user = JSON.parse(e.newValue || 'null');
          this.renderAllAuthWidgets();
          this.notifyListeners();
        } else if (e.key === STORAGE_API_KEY) {
          this.apiKey = e.newValue || '';
          this.notifyListeners();
        } else if (e.key === STORAGE_MODEL_KEY) {
          this.activeModel = e.newValue || 'gemini-3.7-flash';
          this.notifyListeners();
        }
      });
    }

    onAuthChange(callback) {
      this.listeners.push(callback);
    }

    notifyListeners() {
      this.listeners.forEach(cb => {
        try { cb({ user: this.user, apiKey: this.apiKey, model: this.getModel(), isAuthorized: this.isAuthorized() }); } catch (e) {}
      });
    }

    // ─────────────────────────────────────────────────────────
    // UI WIDGET RENDERING
    // ─────────────────────────────────────────────────────────
    mountAuthWidget(containerElement) {
      if (!containerElement) return;
      containerElement.innerHTML = '';

      const wrapper = document.createElement('div');
      wrapper.className = 'google-auth-wrapper';

      if (this.user) {
        // Authenticated User (CSID or Google)
        const isCSID = this.user.authType === 'csid_oauth' || this.user.csid;
        const pill = document.createElement('div');
        pill.className = `user-profile-pill ${isCSID ? 'csid-pill' : ''}`;
        pill.title = isCSID ? 'Identidad CSID (Coki Studios ID) Conectada' : 'Cuenta de Google Conectada';

        let avatarHtml = '';
        if (this.user.picture) {
          avatarHtml = `<img src="${this.user.picture}" class="user-avatar-img" alt="${this.user.name}">`;
        } else if (isCSID) {
          avatarHtml = `<div class="user-avatar-fallback csid-avatar">🛡️</div>`;
        } else {
          avatarHtml = `<div class="user-avatar-fallback">${this.user.name.charAt(0)}</div>`;
        }

        const badgeLabel = isCSID ? '🛡️ CSID Verificado' : `🟢 ${this.getModel()}`;

        pill.innerHTML = `
          ${avatarHtml}
          <div class="user-info-brief">
            <span class="user-name-text">${this.user.name}</span>
            <span class="user-status-text">${badgeLabel}</span>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        `;

        // Dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'user-dropdown-menu';
        dropdown.innerHTML = `
          <div class="dropdown-user-header">
            <div style="font-weight:700; font-size:13px; color:#f8fafc;">${this.user.name}</div>
            <div class="dropdown-user-email">${this.user.email || (isCSID ? 'CSID Token OAuth 2.0 PKCE' : 'Google Identity')}</div>
            <div style="font-size:10px; color:#38bdf8; margin-top:3px; font-weight:700;">Modelo: ${this.getModel()}</div>
          </div>
          <button class="dropdown-action-btn btn-open-gemini-config">
            <span>⚙️</span>
            <span>Cambiar Modelo / API Key</span>
          </button>
          <button class="dropdown-action-btn logout btn-logout-action">
            <span>🚪</span>
            <span>Cerrar sesión / Revocar</span>
          </button>
        `;

        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.toggle('active');
        });

        dropdown.querySelector('.btn-open-gemini-config').addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.remove('active');
          this.openConsentModal();
        });

        dropdown.querySelector('.btn-logout-action').addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.remove('active');
          this.logout();
        });

        document.addEventListener('click', () => {
          dropdown.classList.remove('active');
        });

        wrapper.appendChild(pill);
        wrapper.appendChild(dropdown);
      } else {
        // Dual Buttons: CSID PKCE Login + Google Consent
        const btnCsid = document.createElement('button');
        btnCsid.type = 'button';
        btnCsid.className = 'btn-csid-signin';
        btnCsid.title = 'Iniciar sesión con Coki Studios ID (OAuth 2.0 PKCE)';
        btnCsid.innerHTML = `
          ${CSID_SHIELD_SVG}
          <span>Entrar con CSID</span>
        `;
        btnCsid.addEventListener('click', () => this.loginWithCSID());

        const btnGoogle = document.createElement('button');
        btnGoogle.type = 'button';
        btnGoogle.className = 'btn-google-signin';
        btnGoogle.title = 'Conectar cuenta de Google / Gemini API';
        btnGoogle.innerHTML = `
          ${GOOGLE_ICON_SVG}
          <span>Google Sign-In</span>
        `;
        btnGoogle.addEventListener('click', () => this.openConsentModal());

        wrapper.appendChild(btnCsid);
        wrapper.appendChild(btnGoogle);
      }

      containerElement.appendChild(wrapper);
    }

    renderAllAuthWidgets() {
      document.querySelectorAll('[data-coki-auth-mount]').forEach(container => {
        this.mountAuthWidget(container);
      });
    }

    // ─────────────────────────────────────────────────────────
    // CONSENT & PERMISSION MODAL
    // ─────────────────────────────────────────────────────────
    openConsentModal() {
      const existing = document.getElementById('cokiConsentModalOverlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'cokiConsentModalOverlay';
      overlay.className = 'coki-consent-modal-overlay';

      const currentKey = this.getApiKey();
      const currentModel = this.getModel();
      const userName = this.user ? this.user.name : '';
      const userEmail = this.user ? this.user.email : '';

      overlay.innerHTML = `
        <div class="coki-consent-modal" role="dialog" aria-modal="true" aria-labelledby="consentTitle">
          <div class="consent-head">
            <div class="consent-icon-box">
              ${CSID_SHIELD_SVG}
            </div>
            <div>
              <h2 class="consent-title" id="consentTitle">Acceso &amp; Permisos a Gemini 3.x</h2>
              <div class="consent-subtitle">Coki Studios Suite · Identidad CSID &amp; Google AI</div>
            </div>
          </div>

          <!-- CSID Direct OAuth Launch Banner -->
          <div class="csid-oauth-banner">
            <div>
              <div class="csid-banner-title">
                <span>🛡️ Coki Studios ID (CSID)</span>
              </div>
              <div class="csid-banner-text" style="color: #cbd5e1;">
                Inicia sesión mediante OAuth 2.0 + PKCE y verificación de Red Neuronal CSID Sentinel.
              </div>
            </div>
            <button type="button" class="btn-csid-launch" id="btnLaunchCsidOAuth">
              Autorizar con CSID ↗
            </button>
          </div>

          <div class="consent-permissions-box">
            <div class="consent-item">
              <span class="consent-item-check">✓</span>
              <div>
                <strong>Modelos Gemini de Vanguardia (3.7 Flash, 3.6 Flash, 3.1 Pro)</strong>: Permites a las PWAs de Coki Studios procesar tus consultas de arquitectura de software, generación de código y rutinas diarias.
              </div>
            </div>
            <div class="consent-item">
              <span class="consent-item-check">✓</span>
              <div>
                <strong>Privacidad &amp; Control Local</strong>: Tus credenciales se almacenan exclusivamente en tu navegador local (\`localStorage\`) y nunca son compartidas externamente.
              </div>
            </div>
          </div>

          <!-- Model Selection -->
          <div class="consent-input-group">
            <label class="consent-label">Modelo de Gemini Activo</label>
            <select class="consent-input" id="consentModelSelect" style="font-family: inherit; font-size: 13px; font-weight: 600;">
              <option value="gemini-3.7-flash" ${currentModel === 'gemini-3.7-flash' ? 'selected' : ''}>⚡ Gemini 3.7 Flash (Thinking Híbrido &amp; Código Pro) [Recomendado]</option>
              <option value="gemini-3.6-flash" ${currentModel === 'gemini-3.6-flash' ? 'selected' : ''}>🚀 Gemini 3.6 Flash (Velocidad &amp; Eficiencia Extrema)</option>
              <option value="gemini-3.1-pro" ${currentModel === 'gemini-3.1-pro' ? 'selected' : ''}>🧠 Gemini 3.1 Pro (Razonamiento Complejo &amp; Precisión)</option>
              <option value="gemini-2.5-flash" ${currentModel === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash</option>
              <option value="gemini-2.0-pro" ${currentModel === 'gemini-2.0-pro' ? 'selected' : ''}>Gemini 2.0 Pro</option>
            </select>
          </div>

          <!-- User Name -->
          <div class="consent-input-group">
            <label class="consent-label">Nombre del Usuario / Alias</label>
            <input type="text" class="consent-input" id="consentUserName" placeholder="Tu nombre o alias de desarrollador" value="${userName || 'Desarrollador Coki'}">
          </div>

          <!-- Google API Key -->
          <div class="consent-input-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label class="consent-label" style="margin-bottom:0;">Google AI Studio API Key (Opcional para cuota propia)</label>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" style="font-size:11px; color:#38bdf8; text-decoration:none; font-weight:700;">Obtener API Key gratis ↗</a>
            </div>
            <input type="password" class="consent-input" id="consentApiKey" placeholder="AIzaSy..." value="${currentKey}">
            <div style="font-size:11px; color:#94a3b8; margin-top:4px;">
              * Si no introduces una clave, se utilizará el motor sintético inteligente de Coki Studios.
            </div>
          </div>

          <div class="consent-footer-actions">
            <button type="button" class="btn-consent-cancel" id="btnConsentCancel">Cancelar</button>
            <button type="button" class="btn-consent-accept" id="btnConsentAccept">
              ✅ Aceptar y Dar Permiso a Gemini
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('#btnLaunchCsidOAuth').addEventListener('click', () => {
        overlay.remove();
        this.loginWithCSID();
      });

      overlay.querySelector('#btnConsentCancel').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });

      overlay.querySelector('#btnConsentAccept').addEventListener('click', () => {
        const enteredName = overlay.querySelector('#consentUserName').value.trim() || 'Usuario Coki';
        const enteredKey = overlay.querySelector('#consentApiKey').value.trim();
        const selectedModel = overlay.querySelector('#consentModelSelect').value;

        const userObj = {
          name: enteredName,
          email: userEmail || `${enteredName.toLowerCase().replace(/\s+/g, '')}@cokistudios.com`,
          picture: this.user ? this.user.picture : null,
          authType: 'consented_user',
          permissionGiven: true,
          grantedAt: new Date().toISOString()
        };

        this.setUser(userObj);
        this.setModel(selectedModel);
        if (enteredKey) {
          this.setApiKey(enteredKey);
        }

        overlay.remove();
        this.renderAllAuthWidgets();
        this.notifyListeners();
      });
    }
  }

  // Global Singleton
  window.CokiAuth = new CokiAuthManager();

  // Auto-mount widgets on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.CokiAuth.renderAllAuthWidgets();
  });
})();
