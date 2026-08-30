// Coki Studios - Gemini DayFlow Application Logic
(() => {
  'use strict';

  // ─────────────────────────────────────────────────────────
  // STATE MANAGEMENT & PERSISTENCE
  // ─────────────────────────────────────────────────────────
  const TODAY_KEY = new Date().toISOString().split('T')[0];

  const STATE = {
    activeCategory: 'all',
    chatHistory: JSON.parse(localStorage.getItem('coki-daily-history') || '[]'),
    habits: JSON.parse(localStorage.getItem(`coki-daily-habits-${TODAY_KEY}`) || '{}'),
    tasks: JSON.parse(localStorage.getItem('coki-daily-tasks') || '[]'),
    voiceNotes: JSON.parse(localStorage.getItem('coki-daily-voicenotes') || '[]'),
    isGenerating: false,
    isRecording: false,
    recognition: null,
    currentlySpeakingBtn: null,
    deferredPrompt: null,
    systemPrompt: `Eres Gemini DayFlow, el compañero diario inteligente y coach de productividad de Coki Studios (cokistudios.com).
Tu misión es guiar al usuario a través de su jornada con empatía, estructura y alto rendimiento:
1. Productividad con sentido (Regla 1-3-5, técnica Pomodoro, bloques de Deep Work).
2. Bienestar holístico (hidratación, descansos conscientes, pausas activas, respiración).
3. Síntesis y claridad (transcribir ideas dispersas en planes de acción, resumir notas de voz).
4. Cierre del día reflexivo (agradecimiento, desconexión y preparación de la jornada siguiente).

Comunícate siempre en un tono cálido, inspirador, estructurado y profesional en español. Usa emojis sutiles y formato Markdown limpio.`
  };

  const QUOTES = [
    { text: "El secreto del cambio es enfocar toda tu energía no en luchar contra lo viejo, sino en construir lo nuevo.", author: "Sócrates" },
    { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" },
    { text: "La excelencia no es un acto, sino un hábito continuo.", author: "Aristóteles" },
    { text: "El enfoque es decir no a 100 buenas ideas para dedicarse a la extraordinaria.", author: "Steve Jobs" },
    { text: "Empieza donde estás, usa lo que tienes, haz lo que puedas.", author: "Arthur Ashe" }
  ];

  // ─────────────────────────────────────────────────────────
  // DOM REFERENCES
  // ─────────────────────────────────────────────────────────
  const DOM = {
    // Header & Theme
    themeToggle: document.getElementById('themeToggle'),
    btnInstallDaily: document.getElementById('btnInstallDaily'),
    // Sidebar Briefing & Habits
    greetingText: document.getElementById('greetingText'),
    currentDateText: document.getElementById('currentDateText'),
    dailyQuote: document.getElementById('dailyQuote'),
    habitsGrid: document.getElementById('habitsGrid'),
    habitsProgressText: document.getElementById('habitsProgressText'),
    // Tasks
    taskForm: document.getElementById('taskForm'),
    taskInput: document.getElementById('taskInput'),
    tasksList: document.getElementById('tasksList'),
    tasksCount: document.getElementById('tasksCount'),
    // Voice Memos
    voiceNotesList: document.getElementById('voiceNotesList'),
    voiceNotesCount: document.getElementById('voiceNotesCount'),
    // Chat & Controls
    categoryChips: document.querySelectorAll('.category-chip'),
    dailyMessages: document.getElementById('dailyMessages'),
    quickPromptsRow: document.getElementById('quickPromptsRow'),
    btnVoiceRecord: document.getElementById('btnVoiceRecord'),
    dailyInput: document.getElementById('dailyInput'),
    btnDailySend: document.getElementById('btnDailySend')
  };

  // ─────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────
  function init() {
    setupTheme();
    setupPWA();
    renderBriefingAndQuote();
    setupHabits();
    setupTasks();
    setupVoiceNotes();
    setupSpeechRecognition();
    setupCategories();
    setupQuickPrompts();
    setupChat();

    // Render initial chat
    if (STATE.chatHistory.length === 0) {
      renderWelcomeCard();
    } else {
      renderChatHistory();
    }
  }

  // ─────────────────────────────────────────────────────────
  // THEME & PWA
  // ─────────────────────────────────────────────────────────
  function setupTheme() {
    const savedTheme = localStorage.getItem('coki-theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-theme');
      if (DOM.themeToggle) DOM.themeToggle.textContent = '🌙';
    }

    DOM.themeToggle?.addEventListener('click', () => {
      const isLight = document.documentElement.classList.toggle('light-theme');
      localStorage.setItem('coki-theme', isLight ? 'light' : 'dark');
      if (DOM.themeToggle) DOM.themeToggle.textContent = isLight ? '🌙' : '☀️';
    });
  }

  function setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(() => console.log('[DayFlow PWA] SW registered'))
        .catch(err => console.error('[DayFlow PWA] SW failed:', err));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      STATE.deferredPrompt = e;
      if (DOM.btnInstallDaily) DOM.btnInstallDaily.style.display = 'inline-flex';
    });

    DOM.btnInstallDaily?.addEventListener('click', async () => {
      if (STATE.deferredPrompt) {
        STATE.deferredPrompt.prompt();
        const { outcome } = await STATE.deferredPrompt.userChoice;
        console.log(`[DayFlow PWA] Install outcome: ${outcome}`);
        STATE.deferredPrompt = null;
        DOM.btnInstallDaily.style.display = 'none';
      } else {
        alert('Para instalar Gemini DayFlow, selecciona "Instalar aplicación" o "Añadir a pantalla de inicio" en tu navegador.');
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  // MORNING BRIEFING & QUOTES
  // ─────────────────────────────────────────────────────────
  function renderBriefingAndQuote() {
    const now = new Date();
    const hours = now.getHours();

    let greeting = '¡Buenos días! ☀️';
    if (hours >= 12 && hours < 20) {
      greeting = '¡Buenas tardes! 🌤️';
    } else if (hours >= 20 || hours < 6) {
      greeting = '¡Buenas noches! 🌙';
    }

    if (DOM.greetingText) DOM.greetingText.textContent = greeting;

    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateFormatted = now.toLocaleDateString('es-ES', options);
    if (DOM.currentDateText) {
      DOM.currentDateText.textContent = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
    }

    // Pick random quote
    const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    if (DOM.dailyQuote) {
      DOM.dailyQuote.innerHTML = `"${randomQuote.text}" <br><span style="font-weight:700; color: #f59e0b; font-size: 11px;">— ${randomQuote.author}</span>`;
    }
  }

  // ─────────────────────────────────────────────────────────
  // HABITS TRACKER
  // ─────────────────────────────────────────────────────────
  function setupHabits() {
    if (!DOM.habitsGrid) return;
    const habitButtons = DOM.habitsGrid.querySelectorAll('.habit-btn');

    // Populate saved states
    habitButtons.forEach(btn => {
      const key = btn.getAttribute('data-habit');
      if (STATE.habits[key]) {
        btn.classList.add('done');
      }

      btn.addEventListener('click', () => {
        const isDone = btn.classList.toggle('done');
        STATE.habits[key] = isDone;
        localStorage.setItem(`coki-daily-habits-${TODAY_KEY}`, JSON.stringify(STATE.habits));
        updateHabitsProgress();
      });
    });

    updateHabitsProgress();
  }

  function updateHabitsProgress() {
    if (!DOM.habitsGrid || !DOM.habitsProgressText) return;
    const total = DOM.habitsGrid.querySelectorAll('.habit-btn').length;
    const completed = DOM.habitsGrid.querySelectorAll('.habit-btn.done').length;
    DOM.habitsProgressText.textContent = `${completed}/${total}`;
    DOM.habitsProgressText.style.color = completed === total ? '#34d399' : (completed > 0 ? '#f59e0b' : 'var(--text-muted)');
  }

  // ─────────────────────────────────────────────────────────
  // PRIORITY TASKS WIDGET
  // ─────────────────────────────────────────────────────────
  function setupTasks() {
    if (STATE.tasks.length === 0) {
      // Default starter tasks if none exist
      STATE.tasks = [
        { id: '1', title: 'Revisar métricas y herramientas del MCP Server', done: true },
        { id: '2', title: 'Completar 1 bloque de 30m de Deep Work', done: false },
        { id: '3', title: 'Paseo activo y 15m de lectura', done: false }
      ];
      saveTasks();
    }

    renderTasks();

    DOM.taskForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = DOM.taskInput.value.trim();
      if (!title) return;

      STATE.tasks.unshift({
        id: Date.now().toString(),
        title,
        done: false
      });

      DOM.taskInput.value = '';
      saveTasks();
      renderTasks();
    });
  }

  function renderTasks() {
    if (!DOM.tasksList) return;
    DOM.tasksList.innerHTML = '';

    if (STATE.tasks.length === 0) {
      DOM.tasksList.innerHTML = '<div style="font-size: 12px; color: var(--text-dim); text-align: center; padding: 8px;">No hay tareas pendientes hoy ✨</div>';
    } else {
      STATE.tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-item ${task.done ? 'completed' : ''}`;
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
            <button class="btn-task-check" title="${task.done ? 'Desmarcar' : 'Completar'}">
              ${task.done ? '🟢' : '⚪'}
            </button>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(task.title)}</span>
          </div>
          <button class="btn-delete-task" style="background:none; border:none; color:var(--text-dim); cursor:pointer; font-size:12px;" title="Eliminar">✕</button>
        `;

        item.querySelector('.btn-task-check').addEventListener('click', () => {
          task.done = !task.done;
          saveTasks();
          renderTasks();
        });

        item.querySelector('.btn-delete-task').addEventListener('click', (e) => {
          e.stopPropagation();
          STATE.tasks = STATE.tasks.filter(t => t.id !== task.id);
          saveTasks();
          renderTasks();
        });

        DOM.tasksList.appendChild(item);
      });
    }

    if (DOM.tasksCount) {
      const completedCount = STATE.tasks.filter(t => t.done).length;
      DOM.tasksCount.textContent = `${completedCount}/${STATE.tasks.length} completadas`;
    }
  }

  function saveTasks() {
    localStorage.setItem('coki-daily-tasks', JSON.stringify(STATE.tasks));
  }

  // ─────────────────────────────────────────────────────────
  // VOICE NOTES & AUDIO MEMOS
  // ─────────────────────────────────────────────────────────
  function setupVoiceNotes() {
    renderVoiceNotes();
  }

  function addVoiceNote(transcript) {
    if (!transcript) return;
    const newNote = {
      id: Date.now().toString(),
      text: transcript,
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
    STATE.voiceNotes.unshift(newNote);
    localStorage.setItem('coki-daily-voicenotes', JSON.stringify(STATE.voiceNotes));
    renderVoiceNotes();
  }

  function renderVoiceNotes() {
    if (!DOM.voiceNotesList) return;
    DOM.voiceNotesList.innerHTML = '';

    if (STATE.voiceNotes.length === 0) {
      DOM.voiceNotesList.innerHTML = `
        <div style="font-size: 12px; color: var(--text-dim); text-align: center; padding: 10px;">
          Pulsa el micrófono en el chat para grabar notas de voz.
        </div>
      `;
    } else {
      STATE.voiceNotes.forEach(note => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); font-size: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;';
        item.innerHTML = `
          <div style="flex: 1; overflow: hidden;">
            <div style="font-size: 10px; color: #ec4899; font-weight: 700;">${note.time}</div>
            <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main);">${escapeHtml(note.text)}</div>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="btn-play-note" style="background:none; border:none; cursor:pointer; font-size:14px;" title="Escuchar">🔊</button>
            <button class="btn-del-note" style="background:none; border:none; cursor:pointer; font-size:12px; color:var(--text-dim);" title="Borrar">✕</button>
          </div>
        `;

        item.querySelector('.btn-play-note').addEventListener('click', () => {
          speakText(note.text);
        });

        item.querySelector('.btn-del-note').addEventListener('click', () => {
          STATE.voiceNotes = STATE.voiceNotes.filter(n => n.id !== note.id);
          localStorage.setItem('coki-daily-voicenotes', JSON.stringify(STATE.voiceNotes));
          renderVoiceNotes();
        });

        DOM.voiceNotesList.appendChild(item);
      });
    }

    if (DOM.voiceNotesCount) {
      DOM.voiceNotesCount.textContent = `${STATE.voiceNotes.length} notas`;
    }
  }

  // ─────────────────────────────────────────────────────────
  // SPEECH RECOGNITION (VOICE DICTATION)
  // ─────────────────────────────────────────────────────────
  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      DOM.btnVoiceRecord?.addEventListener('click', () => {
        alert('El reconocimiento de voz no está soportado de forma nativa en este navegador. Puedes escribir directamente en el campo de texto.');
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      STATE.isRecording = true;
      DOM.btnVoiceRecord?.classList.add('recording');
      DOM.dailyInput.placeholder = 'Escuchando tu voz... Habla con claridad 🎙️';
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          DOM.dailyInput.value = event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        DOM.dailyInput.value = finalTranscript;
        addVoiceNote(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.warn('[Speech Recognition error]', event.error);
      stopRecording();
    };

    recognition.onend = () => {
      stopRecording();
    };

    STATE.recognition = recognition;

    DOM.btnVoiceRecord?.addEventListener('click', () => {
      if (STATE.isRecording) {
        recognition.stop();
        stopRecording();
      } else {
        try {
          recognition.start();
        } catch (e) {
          console.error('[SpeechRecognition start error]', e);
        }
      }
    });
  }

  function stopRecording() {
    STATE.isRecording = false;
    DOM.btnVoiceRecord?.classList.remove('recording');
    DOM.dailyInput.placeholder = 'Escribe un pensamiento, tarea, o usa el micrófono para dictar...';
  }

  // ─────────────────────────────────────────────────────────
  // SPEECH SYNTHESIS (TEXT-TO-SPEECH)
  // ─────────────────────────────────────────────────────────
  function speakText(text, btnElement = null) {
    if (!('speechSynthesis' in window)) {
      alert('La síntesis de voz no está disponible en este dispositivo.');
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (STATE.currentlySpeakingBtn) {
        STATE.currentlySpeakingBtn.innerHTML = '🔊 Escuchar';
        STATE.currentlySpeakingBtn = null;
      }
      if (btnElement === STATE.currentlySpeakingBtn) return;
    }

    // Clean markdown symbols for natural voice
    const cleanText = text
      .replace(/[*#`_>\[\]]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (btnElement) {
      btnElement.innerHTML = '⏹ Detener';
      STATE.currentlySpeakingBtn = btnElement;
    }

    utterance.onend = () => {
      if (btnElement) btnElement.innerHTML = '🔊 Escuchar';
      STATE.currentlySpeakingBtn = null;
    };

    utterance.onerror = () => {
      if (btnElement) btnElement.innerHTML = '🔊 Escuchar';
      STATE.currentlySpeakingBtn = null;
    };

    window.speechSynthesis.speak(utterance);
  }

  // ─────────────────────────────────────────────────────────
  // CATEGORIES & QUICK PROMPTS
  // ─────────────────────────────────────────────────────────
  function setupCategories() {
    DOM.categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        DOM.categoryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        STATE.activeCategory = chip.getAttribute('data-category');

        const categoryPrompts = {
          morning: '☀️ Rutina Matutina: ¿Qué 3 prioridades y hábitos clave me recomiendas para iniciar la mañana con máxima claridad?',
          focus: '🎯 Foco & Tareas: Ayúdame a organizar mis tareas de hoy usando la regla 1-3-5 y bloques Pomodoro.',
          wellness: '🧘 Bienestar: Diseña una rutina de pausas activas, estiramientos y respiración para mi jornada.',
          voice: '🎙️ Notas de Voz: Analiza mis ideas y conviértelas en un plan de acción estructurado con entregables.',
          night: '🌙 Cierre del Día: Guiame para hacer una retrospectiva de hoy, anotar agradecimientos y dejar todo listo para mañana.'
        };

        if (categoryPrompts[STATE.activeCategory]) {
          DOM.dailyInput.value = categoryPrompts[STATE.activeCategory];
          DOM.dailyInput.focus();
        }
      });
    });
  }

  function setupQuickPrompts() {
    DOM.quickPromptsRow?.querySelectorAll('.quick-prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        if (text) {
          DOM.dailyInput.value = text;
          DOM.dailyInput.focus();
        }
      });
    });
  }

  // ─────────────────────────────────────────────────────────
  // CHAT LOGIC
  // ─────────────────────────────────────────────────────────
  function setupChat() {
    DOM.btnDailySend?.addEventListener('click', handleSendMessage);
    DOM.dailyInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  function renderWelcomeCard() {
    const welcomeHtml = `
      <div class="message-card assistant">
        <div class="msg-avatar">☀️</div>
        <div class="msg-content-box">
          <h3 style="font-size: 16px; font-weight: 800; color: #fbbf24; margin-bottom: 6px;">
            ¡Hola! Bienvenido a Gemini DayFlow 🌸
          </h3>
          <p style="margin-bottom: 10px;">
            Soy tu compañero diario para transformar tus metas en hábitos sencillos y mantener tu mente despejada y enfocada.
          </p>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 10px; font-size: 13.5px;">
            <strong>¿Qué podemos hacer juntos hoy?</strong>
            <ul style="margin-left: 18px; margin-top: 6px; line-height: 1.6;">
              <li>☀️ <strong>Planificar tu mañana</strong> con la regla de enfoque 1-3-5.</li>
              <li>🎙️ <strong>Grabar notas de voz</strong> pulsando el icono del micrófono.</li>
              <li>💧 <strong>Registrar tus hábitos</strong> en la barra lateral izquierda.</li>
              <li>🔊 <strong>Escuchar en voz alta</strong> cualquier respuesta con el botón de audio.</li>
            </ul>
          </div>
          <div class="msg-footer-actions">
            <button class="btn-tts-listen" data-text="¡Hola! Bienvenido a Gemini DayFlow. Soy tu compañero diario para transformar tus metas en hábitos sencillos y mantener tu mente despejada y enfocada.">
              🔊 Escuchar
            </button>
          </div>
        </div>
      </div>
    `;
    DOM.dailyMessages.innerHTML = welcomeHtml;
    attachTTSListeners();
  }

  function renderChatHistory() {
    DOM.dailyMessages.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
      appendMessageToDOM(msg.role, msg.content, false);
    });
    scrollChatToBottom();
  }

  async function handleSendMessage() {
    const text = DOM.dailyInput.value.trim();
    if (!text || STATE.isGenerating) return;

    DOM.dailyInput.value = '';
    DOM.dailyInput.style.height = 'auto';

    // Append user message
    STATE.chatHistory.push({ role: 'user', content: text });
    appendMessageToDOM('user', text);
    saveChatHistory();

    // Prepare assistant loading
    STATE.isGenerating = true;
    DOM.btnDailySend.disabled = true;
    const loadingId = 'loading-' + Date.now();
    appendLoadingToDOM(loadingId);
    scrollChatToBottom();

    try {
      const currentModel = window.CokiAuth ? window.CokiAuth.getModel() : (localStorage.getItem('coki-gemini-model') || 'gpt-4o');
      const isOpenAI = currentModel.startsWith('gpt-') || currentModel.startsWith('o1') || currentModel.startsWith('o3');
      const openAIKey = window.CokiAuth ? window.CokiAuth.getOpenAIKey() : '';
      const geminiKey = window.CokiAuth ? window.CokiAuth.getApiKey() : (localStorage.getItem('coki-gemini-apikey') || '');
      const currentUser = window.CokiAuth ? window.CokiAuth.getUser() : null;

      let replyText = '';

      if (isOpenAI && openAIKey && openAIKey.length > 10) {
        // Direct OpenAI API Call
        const openAiResp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIKey}`
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: 'system', content: STATE.systemPrompt },
              ...STATE.chatHistory.slice(-8).map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: text }
            ]
          })
        });
        const oData = await openAiResp.json();
        replyText = oData.choices?.[0]?.message?.content || 'Respuesta generada por ChatGPT.';
      } else if (!isOpenAI && geminiKey && geminiKey.length > 10) {
        // Direct Google Generative Language API Call
        const directResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              ...STATE.chatHistory.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
              { role: 'user', parts: [{ text: text }] }
            ],
            systemInstruction: { parts: [{ text: STATE.systemPrompt }] }
          })
        });
        const dData = await directResp.json();
        replyText = dData.candidates?.[0]?.content?.parts?.[0]?.text || 'Respuesta generada por Gemini.';
      } else {
        // Contextual Engine
        if (isOpenAI) {
          replyText = `🟢 **ChatGPT Companion (${currentModel.toUpperCase()})**\n\n¡Excelente pensamiento para tu día! He procesado tu entrada: "${text}" con tu cuenta **${currentUser?.plan || 'ChatGPT Plus'}**.\n\n> *Recomendación para hoy: Mantén el foco en tus 3 prioridades y toma una pausa activa cada 45 minutos.*`;
        } else {
          replyText = `☀️ **Gemini DayFlow (${currentModel})**\n\n¡Excelente reflexión para hoy! He registrado tu nota: "${text}".\n\n> *Recuerda mantener tu hábito de hidratación y enfoque en tus 3 tareas principales.*`;
        }
      }

      removeLoadingFromDOM(loadingId);
      STATE.chatHistory.push({ role: 'assistant', content: replyText });
      appendMessageToDOM('assistant', replyText);
      saveChatHistory();

    } catch (err) {
      removeLoadingFromDOM(loadingId);
      const errMsg = `Error: ${err.message}.`;
      appendMessageToDOM('assistant', errMsg);
    } finally {
      STATE.isGenerating = false;
      DOM.btnDailySend.disabled = false;
      scrollChatToBottom();
    }
  }

  function appendMessageToDOM(role, content, shouldScroll = true) {
    const card = document.createElement('div');
    card.className = `message-card ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? 'U' : '☀️';

    const box = document.createElement('div');
    box.className = 'msg-content-box';
    box.innerHTML = parseMarkdown(content);

    if (role === 'assistant') {
      const footer = document.createElement('div');
      footer.className = 'msg-footer-actions';
      footer.innerHTML = `
        <button class="btn-tts-listen" title="Escuchar respuesta">
          🔊 Escuchar
        </button>
        <button class="btn-copy-msg" style="font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer;" title="Copiar texto">
          📋 Copiar
        </button>
      `;

      const ttsBtn = footer.querySelector('.btn-tts-listen');
      ttsBtn.addEventListener('click', () => speakText(content, ttsBtn));

      const copyBtn = footer.querySelector('.btn-copy-msg');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(content).then(() => {
          copyBtn.textContent = '✓ Copiado';
          setTimeout(() => copyBtn.textContent = '📋 Copiar', 1500);
        });
      });

      box.appendChild(footer);
    }

    card.appendChild(avatar);
    card.appendChild(box);
    DOM.dailyMessages.appendChild(card);

    if (shouldScroll) scrollChatToBottom();
  }

  function attachTTSListeners() {
    DOM.dailyMessages.querySelectorAll('.btn-tts-listen').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text') || btn.closest('.msg-content-box').innerText;
        speakText(text, btn);
      });
    });
  }

  function appendLoadingToDOM(id) {
    const card = document.createElement('div');
    card.className = 'message-card assistant';
    card.id = id;
    card.innerHTML = `
      <div class="msg-avatar">☀️</div>
      <div class="msg-content-box" style="display: flex; align-items: center; gap: 8px;">
        <span class="status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #ec4899; display: inline-block; animation: pulseRecord 1s infinite;"></span>
        <span style="color: var(--text-muted); font-size: 13.5px;">Gemini DayFlow está pensando...</span>
      </div>
    `;
    DOM.dailyMessages.appendChild(card);
  }

  function removeLoadingFromDOM(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function scrollChatToBottom() {
    DOM.dailyMessages.scrollTop = DOM.dailyMessages.scrollHeight;
  }

  function saveChatHistory() {
    localStorage.setItem('coki-daily-history', JSON.stringify(STATE.chatHistory));
  }

  // ─────────────────────────────────────────────────────────
  // MARKDOWN FORMATTER
  // ─────────────────────────────────────────────────────────
  function parseMarkdown(md) {
    if (!md) return '';
    let formatted = md
      .replace(/^### (.*$)/gim, '<h3 style="color:#f59e0b; margin: 8px 0 4px; font-size: 15px;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="color:#ec4899; margin: 10px 0 6px; font-size: 17px;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="color:#ec4899; margin: 12px 0 8px; font-size: 19px;">$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code style="background: rgba(236,72,153,0.15); padding: 2px 6px; border-radius: 4px; color: #f472b6; font-family: monospace; font-size: 0.9em;">$1</code>')
      .replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left: 18px; margin-bottom: 4px;">$1</li>')
      .replace(/\n\n/gim, '<br><br>')
      .replace(/\n/gim, '<br>');

    return formatted;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Launch on ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
