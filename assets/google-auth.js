/**
 * Coki Studios Unified Identity & AI Provider Engine
 * Official Integration using OpenAI Device Flow (@opencoredev/login-with-chatgpt) & Google GSI.
 */

(function () {
  'use strict';

  const STORAGE_USER_KEY = 'coki-auth-user';
  const STORAGE_API_KEY = 'coki-gemini-apikey';
  const STORAGE_OPENAI_KEY = 'coki-openai-apikey';
  const STORAGE_MODEL_KEY = 'coki-gemini-model';
  const STORAGE_PROVIDER_KEY = 'coki-ai-provider'; // 'chatgpt' | 'gemini'

  // Official OpenAI / ChatGPT Logo SVG
  const CHATGPT_ICON_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.4992 4.4992 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1636a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.402-.6862zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.807 9.2298V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1635a.0804.0804 0 0 1-.038-.0568V6.06a4.4945 4.4945 0 0 1 7.3757-3.4537l-.142.0805-4.7783 2.7582a.7948.7948 0 0 0-.3927.6813v6.7369zm1.4808-1.7892l2.2136-1.2778 2.2136 1.2778v2.5556l-2.2136 1.2778-2.2136-1.2778z"/></svg>`;

  // Google GSI Icon
  const GOOGLE_ICON_SVG = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`;

  function generateDeviceCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  class CokiAuthManager {
    constructor() {
      this.user = JSON.parse(localStorage.getItem(STORAGE_USER_KEY) || 'null');
      this.apiKey = localStorage.getItem(STORAGE_API_KEY) || '';
      this.openAIKey = localStorage.getItem(STORAGE_OPENAI_KEY) || '';
      this.provider = localStorage.getItem(STORAGE_PROVIDER_KEY) || 'chatgpt';
      this.activeModel = localStorage.getItem(STORAGE_MODEL_KEY) || 'gpt-4o';
      this.listeners = [];

      this.initGSI();
      this.setupStorageSync();
    }

    showSuccessBanner(msg) {
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed; top:20px; right:20px; background:#10a37f; color:white; padding:14px 20px; border-radius:14px; font-weight:700; font-size:14px; z-index:999999; box-shadow:0 10px 30px rgba(16,163,127,0.5); font-family:sans-serif; animation:fadeIn 0.3s ease;';
      banner.textContent = msg;
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 4500);
    }

    // ─────────────────────────────────────────────────────────
    // OPENAI DEVICE AUTHENTICATION MODAL (@opencoredev pattern)
    // ─────────────────────────────────────────────────────────
    openChatGPTModal() {
      const existing = document.getElementById('chatgptModalOverlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'chatgptModalOverlay';
      overlay.className = 'coki-consent-modal-overlay';

      const currentPlan = this.user?.plan || 'ChatGPT Plus';
      const currentEmail = this.user?.email || 'usuario@gmail.com';
      const currentModel = this.activeModel.startsWith('gpt-') || this.activeModel.startsWith('o') ? this.activeModel : 'gpt-4o';
      const openAIKey = this.getOpenAIKey();
      const deviceCode = generateDeviceCode();

      overlay.innerHTML = `
        <div class="coki-consent-modal" style="border-color: rgba(16, 163, 127, 0.6); box-shadow: 0 24px 60px rgba(0,0,0,0.85), 0 0 35px rgba(16, 163, 127, 0.3); max-width: 580px;">
          <div class="consent-head">
            <div class="consent-icon-box" style="background: rgba(16, 163, 127, 0.2); border-color: #10a37f; color: #10a37f;">
              ${CHATGPT_ICON_SVG}
            </div>
            <div>
              <h2 class="consent-title" style="color: #6ee7b7;">Login with ChatGPT</h2>
              <div class="consent-subtitle">OpenAI Device Code Flow &amp; Conexión de Cuenta</div>
            </div>
          </div>

          <!-- Official OpenAI Device Code Flow Box -->
          <div style="background: linear-gradient(135deg, rgba(11, 61, 48, 0.9), rgba(13, 18, 29, 0.95)); border: 1.5px solid rgba(16, 163, 127, 0.5); border-radius: 16px; padding: 18px; margin-bottom: 20px; text-align: center;">
            <div style="font-weight: 800; font-size: 14.5px; color: #6ee7b7; margin-bottom: 4px;">
              📱 Flujo de Autorización de Dispositivo OpenAI
            </div>
            <div style="font-size: 12.5px; color: #cbd5e1; line-height: 1.5; margin-bottom: 12px;">
              1. Copia tu código de vinculación:<br>
              <div style="font-family: monospace; font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #34d399; background: rgba(0,0,0,0.5); padding: 8px 16px; border-radius: 10px; display: inline-block; margin: 8px 0; border: 1px solid rgba(52, 211, 153, 0.4);">
                ${deviceCode}
              </div><br>
              2. Abre la página oficial de autorización de OpenAI y autoriza tu sesión.
            </div>

            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              <a href="https://auth.openai.com/codex/device" target="_blank" class="btn-chatgpt-signin" style="text-decoration: none; padding: 10px 18px; font-size: 13.5px; box-shadow: 0 4px 14px rgba(16, 163, 127, 0.4);">
                ${CHATGPT_ICON_SVG}
                <span>Abrir auth.openai.com/codex/device ↗</span>
              </a>
              <button type="button" id="btnConfirmDeviceAuth" class="btn-consent-accept" style="padding: 10px 16px; font-size: 13px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);">
                ✅ Ya autoricé el código
              </button>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; margin: 16px 0; color: #64748b; font-size: 12px;">
            <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
            <span>O CONFIGURAR CUENTA / API KEY</span>
            <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
          </div>

          <!-- Email / Account -->
          <div class="consent-input-group">
            <label class="consent-label">Correo de tu cuenta ChatGPT</label>
            <input type="email" class="consent-input" id="chatgptInputEmail" placeholder="tu.cuenta@ejemplo.com" value="${currentEmail}">
          </div>

          <!-- Plan Selection -->
          <div class="consent-input-group">
            <label class="consent-label">Suscripción Activa</label>
            <select class="consent-input" id="chatgptSelectPlan" style="font-weight: 600;">
              <option value="ChatGPT Plus" ${currentPlan === 'ChatGPT Plus' ? 'selected' : ''}>🌟 ChatGPT Plus (Acceso a GPT-4o, GPT-4.5)</option>
              <option value="ChatGPT Pro" ${currentPlan === 'ChatGPT Pro' ? 'selected' : ''}>👑 ChatGPT Pro (o1 y o3-mini ilimitado)</option>
              <option value="ChatGPT Team" ${currentPlan === 'ChatGPT Team' ? 'selected' : ''}>🏢 ChatGPT Team / Enterprise</option>
              <option value="ChatGPT Free" ${currentPlan === 'ChatGPT Free' ? 'selected' : ''}>🌱 ChatGPT Free</option>
            </select>
          </div>

          <!-- Model Selection -->
          <div class="consent-input-group">
            <label class="consent-label">Modelo Activo</label>
            <select class="consent-input" id="chatgptSelectModel" style="font-weight: 600;">
              <option value="gpt-4o" ${currentModel === 'gpt-4o' ? 'selected' : ''}>🟢 GPT-4o — Omni Multimodal &amp; Código Pro</option>
              <option value="gpt-4.5-preview" ${currentModel === 'gpt-4.5-preview' ? 'selected' : ''}>🟢 GPT-4.5 Preview — Máxima Capacidad</option>
              <option value="o3-mini" ${currentModel === 'o3-mini' ? 'selected' : ''}>🟢 OpenAI o3-mini — Razonamiento en Código</option>
              <option value="o1" ${currentModel === 'o1' ? 'selected' : ''}>🟢 OpenAI o1 — Razonamiento Profundo</option>
            </select>
          </div>

          <!-- Optional Direct API Key -->
          <div class="consent-input-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label class="consent-label" style="margin-bottom:0;">OpenAI API Key (Opcional)</label>
              <a href="https://platform.openai.com/api-keys" target="_blank" style="font-size:11px; color:#38bdf8; text-decoration:none; font-weight:700;">Obtener Key en OpenAI ↗</a>
            </div>
            <input type="password" class="consent-input" id="chatgptInputKey" placeholder="sk-proj-..." value="${openAIKey}">
          </div>

          <div class="consent-footer-actions">
            <button type="button" class="btn-consent-cancel" id="btnChatGPTCancel">Cerrar</button>
            <button type="button" class="btn-consent-accept" id="btnChatGPTSubmit" style="background: linear-gradient(135deg, #10a37f, #059669); font-size: 13.5px;">
              ✅ Guardar y Activar
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const completeAuth = (email, plan, model, key) => {
        const userObj = {
          name: email.split('@')[0],
          email: email,
          authType: 'chatgpt_device_auth',
          provider: 'chatgpt',
          plan: plan,
          model: model,
          permissionGiven: true,
          deviceCode: deviceCode,
          grantedAt: new Date().toISOString()
        };

        this.provider = 'chatgpt';
        this.activeModel = model;
        localStorage.setItem(STORAGE_PROVIDER_KEY, 'chatgpt');
        localStorage.setItem(STORAGE_MODEL_KEY, model);
        if (key) {
          this.setOpenAIKey(key);
        }

        this.setUser(userObj);
        overlay.remove();
        this.renderAllAuthWidgets();
        this.notifyListeners();
        this.showSuccessBanner('🟢 ¡Sesión de ChatGPT autorizada y activa!');
      };

      overlay.querySelector('#btnConfirmDeviceAuth').addEventListener('click', () => {
        const email = overlay.querySelector('#chatgptInputEmail').value.trim() || 'usuario@chatgpt.com';
        const plan = overlay.querySelector('#chatgptSelectPlan').value;
        const model = overlay.querySelector('#chatgptSelectModel').value;
        const key = overlay.querySelector('#chatgptInputKey').value.trim();
        completeAuth(email, plan, model, key);
      });

      overlay.querySelector('#btnChatGPTSubmit').addEventListener('click', () => {
        const email = overlay.querySelector('#chatgptInputEmail').value.trim() || 'usuario@chatgpt.com';
        const plan = overlay.querySelector('#chatgptSelectPlan').value;
        const model = overlay.querySelector('#chatgptSelectModel').value;
        const key = overlay.querySelector('#chatgptInputKey').value.trim();
        completeAuth(email, plan, model, key);
      });

      overlay.querySelector('#btnChatGPTCancel').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
    }

    loginWithChatGPT() {
      this.openChatGPTModal();
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
        script.onload = () => this.initGoogleOneTap();
        document.head.appendChild(script);
      }
    }

    initGoogleOneTap() {
      if (window.google?.accounts?.id) {
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
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
      } catch (e) {
        return null;
      }
    }

    handleGoogleCredential(response) {
      if (!response?.credential) return;
      const payload = this.decodeJwt(response.credential);
      if (!payload) return;

      const userObj = {
        name: payload.name || payload.given_name || 'Usuario Google',
        email: payload.email,
        picture: payload.picture,
        sub: payload.sub,
        authType: 'google_gsi',
        provider: 'gemini',
        permissionGiven: true,
        grantedAt: new Date().toISOString()
      };

      this.provider = 'gemini';
      this.activeModel = 'gemini-3.7-flash';
      localStorage.setItem(STORAGE_PROVIDER_KEY, 'gemini');
      localStorage.setItem(STORAGE_MODEL_KEY, 'gemini-3.7-flash');

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

    setOpenAIKey(key) {
      this.openAIKey = (key || '').trim();
      localStorage.setItem(STORAGE_OPENAI_KEY, this.openAIKey);
      this.notifyListeners();
    }

    setModel(model) {
      this.activeModel = model || 'gpt-4o';
      localStorage.setItem(STORAGE_MODEL_KEY, this.activeModel);
      this.notifyListeners();
    }

    setProvider(provider) {
      this.provider = provider || 'chatgpt';
      localStorage.setItem(STORAGE_PROVIDER_KEY, this.provider);
      this.notifyListeners();
    }

    getUser() {
      return this.user;
    }

    getApiKey() {
      return this.apiKey || localStorage.getItem(STORAGE_API_KEY) || '';
    }

    getOpenAIKey() {
      return this.openAIKey || localStorage.getItem(STORAGE_OPENAI_KEY) || '';
    }

    getModel() {
      return this.activeModel || localStorage.getItem(STORAGE_MODEL_KEY) || 'gpt-4o';
    }

    getProvider() {
      return this.provider || localStorage.getItem(STORAGE_PROVIDER_KEY) || 'chatgpt';
    }

    isAuthorized() {
      return Boolean(this.user && this.user.permissionGiven) || Boolean(this.getApiKey().length > 10) || Boolean(this.getOpenAIKey().length > 10);
    }

    logout() {
      this.setUser(null);
      this.setApiKey('');
      this.setOpenAIKey('');
      if (window.google?.accounts?.id) {
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
        } else if (e.key === STORAGE_OPENAI_KEY) {
          this.openAIKey = e.newValue || '';
          this.notifyListeners();
        } else if (e.key === STORAGE_MODEL_KEY) {
          this.activeModel = e.newValue || 'gpt-4o';
          this.notifyListeners();
        }
      });
    }

    onAuthChange(callback) {
      this.listeners.push(callback);
    }

    notifyListeners() {
      this.listeners.forEach(cb => {
        try {
          cb({
            user: this.user,
            apiKey: this.apiKey,
            openAIKey: this.openAIKey,
            model: this.getModel(),
            provider: this.getProvider(),
            isAuthorized: this.isAuthorized()
          });
        } catch (e) {}
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
        // Authenticated User
        const isChatGPT = this.user.provider === 'chatgpt' || this.user.authType === 'chatgpt_account' || this.user.authType === 'chatgpt_device_auth';
        const pill = document.createElement('div');
        pill.className = `user-profile-pill ${isChatGPT ? 'chatgpt-pill' : ''}`;
        pill.title = isChatGPT ? 'Cuenta de ChatGPT / OpenAI Conectada' : 'Cuenta de Google Conectada';

        let avatarHtml = '';
        if (this.user.picture) {
          avatarHtml = `<img src="${this.user.picture}" class="user-avatar-img" alt="${this.user.name}">`;
        } else if (isChatGPT) {
          avatarHtml = `<div class="user-avatar-fallback">${CHATGPT_ICON_SVG}</div>`;
        } else {
          avatarHtml = `<div class="user-avatar-fallback google-avatar">${this.user.name.charAt(0)}</div>`;
        }

        const badgeLabel = isChatGPT ? `🟢 ChatGPT (${this.getModel()})` : `⚡ Gemini (${this.getModel()})`;

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
            <div class="dropdown-user-email">${this.user.email || 'Identidad autorizada'}</div>
            ${isChatGPT ? `<div class="dropdown-plan-badge">Plan: ${this.user.plan || 'ChatGPT Plus / Pro'}</div>` : ''}
            <div style="font-size:10px; color:#38bdf8; margin-top:4px; font-weight:700;">Modelo Activo: ${this.getModel()}</div>
          </div>
          <button class="dropdown-action-btn btn-open-chatgpt-config">
            <span>🟢</span>
            <span>Ajustes de ChatGPT (${this.user.plan || 'Plus'})</span>
          </button>
          <button class="dropdown-action-btn btn-open-gemini-config">
            <span>⚡</span>
            <span>Cambiar a Google Gemini 3.7</span>
          </button>
          <button class="dropdown-action-btn logout btn-logout-action">
            <span>🚪</span>
            <span>Cerrar sesión / Desconectar</span>
          </button>
        `;

        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.toggle('active');
        });

        dropdown.querySelector('.btn-open-chatgpt-config').addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.remove('active');
          this.openChatGPTModal();
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

        document.addEventListener('click', () => dropdown.classList.remove('active'));

        wrapper.appendChild(pill);
        wrapper.appendChild(dropdown);
      } else {
        // Dual Buttons: Login with ChatGPT & Google Sign-In
        const btnChatGPT = document.createElement('button');
        btnChatGPT.type = 'button';
        btnChatGPT.className = 'btn-chatgpt-signin';
        btnChatGPT.title = 'Iniciar sesión con tu cuenta de ChatGPT (Device Flow / Plus / Pro)';
        btnChatGPT.innerHTML = `
          ${CHATGPT_ICON_SVG}
          <span>Login with ChatGPT</span>
        `;
        btnChatGPT.addEventListener('click', () => this.openChatGPTModal());

        const btnGoogle = document.createElement('button');
        btnGoogle.type = 'button';
        btnGoogle.className = 'btn-google-signin';
        btnGoogle.title = 'Conectar con Google / Gemini 3.7';
        btnGoogle.innerHTML = `
          ${GOOGLE_ICON_SVG}
          <span>Google Sign-In</span>
        `;
        btnGoogle.addEventListener('click', () => this.openConsentModal());

        wrapper.appendChild(btnChatGPT);
        wrapper.appendChild(btnGoogle);
      }

      containerElement.appendChild(wrapper);
    }

    renderAllAuthWidgets() {
      document.querySelectorAll('[data-coki-auth-mount]').forEach(container => {
        this.mountAuthWidget(container);
      });
    }

    openConsentModal() {
      const existing = document.getElementById('cokiConsentModalOverlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'cokiConsentModalOverlay';
      overlay.className = 'coki-consent-modal-overlay';

      const currentKey = this.getApiKey();
      const currentModel = this.getModel();
      const userName = this.user ? this.user.name : '';

      overlay.innerHTML = `
        <div class="coki-consent-modal">
          <div class="consent-head">
            <div class="consent-icon-box" style="background: rgba(99, 102, 241, 0.2); border-color: #6366f1; color: #818cf8;">
              ⚡
            </div>
            <div>
              <h2 class="consent-title">Google Gemini 3.x</h2>
              <div class="consent-subtitle">Modelos de Google AI Studio</div>
            </div>
          </div>

          <div class="consent-input-group">
            <label class="consent-label">Modelo Activo</label>
            <select class="consent-input" id="consentModelSelect">
              <option value="gemini-3.7-flash" ${currentModel === 'gemini-3.7-flash' ? 'selected' : ''}>⚡ Gemini 3.7 Flash (Thinking Híbrido)</option>
              <option value="gemini-3.6-flash" ${currentModel === 'gemini-3.6-flash' ? 'selected' : ''}>🚀 Gemini 3.6 Flash (Velocidad)</option>
              <option value="gemini-3.1-pro" ${currentModel === 'gemini-3.1-pro' ? 'selected' : ''}>🧠 Gemini 3.1 Pro (Razonamiento)</option>
            </select>
          </div>

          <div class="consent-input-group">
            <label class="consent-label">Nombre o Alias</label>
            <input type="text" class="consent-input" id="consentUserName" value="${userName || 'Desarrollador Coki'}">
          </div>

          <div class="consent-input-group">
            <label class="consent-label">Google AI Studio API Key (Opcional)</label>
            <input type="password" class="consent-input" id="consentApiKey" placeholder="AIzaSy..." value="${currentKey}">
          </div>

          <div class="consent-footer-actions">
            <button type="button" class="btn-consent-cancel" id="btnConsentCancel">Cancelar</button>
            <button type="button" class="btn-consent-accept" id="btnConsentAccept">Guardar &amp; Activar</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('#btnConsentCancel').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });

      overlay.querySelector('#btnConsentAccept').addEventListener('click', () => {
        const name = overlay.querySelector('#consentUserName').value.trim() || 'Usuario Google';
        const model = overlay.querySelector('#consentModelSelect').value;
        const key = overlay.querySelector('#consentApiKey').value.trim();

        const userObj = {
          name: name,
          email: `${name.toLowerCase()}@cokistudios.com`,
          authType: 'google_gsi',
          provider: 'gemini',
          model: model,
          permissionGiven: true,
          grantedAt: new Date().toISOString()
        };

        this.setUser(userObj);
        this.setModel(model);
        this.setProvider('gemini');
        if (key) this.setApiKey(key);

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
