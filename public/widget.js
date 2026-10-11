/*
  widget.js — Chat UI, quick buttons, mic/speaker (voice).
  Built in: Phase 1 (Fri Soft demo site), Step 2 — mocked reply, no API.

  Content (greeting, quick buttons + answers, note) is a static copy of the
  same text in server/config.json — see the "config vs static HTML" decision
  in the Step 2 report. Keep the two in sync by hand until Step 3.

  sendToAgent(messages) is the ONLY function Step 3 will change, to call
  POST /api/chat instead of returning a canned reply.
*/
(function () {
  'use strict';

  var WIDGET_CONTENT = {
    greeting: "Hi, how can I help you? I'm Fri Soft's AI assistant, so I can answer questions about our service in a few seconds.",
    quickButtons: [
      {
        label: 'Our service',
        answer: "Fri Soft builds websites with an AI agent that chats and talks with your visitors, answers questions about your business, and captures leads. We also offer an agent add-on if you'd rather keep your current website. Want pricing, or would you like to book a call?"
      },
      {
        label: 'Pricing',
        answer: "Setup is a one-time fee, then a monthly plan covers hosting, usage within a fair limit, and lead reports. TODO: confirm — Fri Soft is still finalising exact numbers. Want me to connect you with the team for a quote?"
      },
      {
        label: 'Book a call',
        answer: "I'd love to set that up. Could I get your name and a phone number or email so the team can call you back?"
      },
      {
        label: 'Contact',
        answer: "You can reach Fri Soft by email at frisoftltd@gmail.com, in Kigali, Rwanda. TODO: confirm phone and WhatsApp numbers. Would you like to leave your details instead and have us reach out?"
      }
    ],
    note: 'You are chatting with an AI. We only ask for what we need to contact you.'
  };

  var MAX_MESSAGE_LENGTH = 500;
  var MAX_HISTORY = 10;
  var AUTO_OPEN_DELAY_MS = 2000;
  var AUTO_OPEN_SESSION_KEY = 'fs_widget_autoopened';
  var LAUNCHER_APPEAR_DELAY_MS = 1000;
  var TEASER_DELAY_MS = 4000;
  var TEASER_SESSION_KEY = 'fs_launcher_teaser_shown';
  var TEASER_TEXT = 'Hi! Ask me anything about our service.';

  var LAUNCHER_CHAT_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"></path></svg>';
  var LAUNCHER_CLOSE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>';

  var conversation = []; // { role: 'user' | 'assistant', text: string } — memory only, never persisted
  var greetingShown = false;
  var chatEverOpened = false; // true once the greeting has been shown anywhere (hero or floating)
  var isTyping = false;
  var speakerOn = false;
  var recognizing = false;
  var activeMicPlacement = null;
  var floatingOpen = false;
  var heroCurrentlyVisible = false; // tracked for teaser gating only — launcher itself is always visible

  var prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var widgets = {}; // placement -> { root, messagesEl, inputEl, micBtn, speakerBtn, sendBtn }

  var synthSupported = !!window.speechSynthesis;
  var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = null;
  if (SpeechRecognitionCtor) {
    try {
      recognition = new SpeechRecognitionCtor();
      recognition.lang = 'en-US'; // TODO: confirm — switch by detected visitor language later
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
    } catch (e) {
      recognition = null;
    }
  }

  function cap(str, max) {
    return typeof str === 'string' && str.length > max ? str.slice(0, max) : str;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function recentMessages() {
    return conversation.slice(-MAX_HISTORY);
  }

  function pushMessage(role, text) {
    conversation.push({ role: role, text: text });
    if (conversation.length > MAX_HISTORY) {
      conversation.splice(0, conversation.length - MAX_HISTORY);
    }
  }

  // ---------------------------------------------------------------------
  // The one function Step 3 changes: swap this body for a relative
  // fetch('/api/chat', { method: 'POST', body: JSON.stringify({ messages }) }).
  // ---------------------------------------------------------------------
  function sendToAgent(messages) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve("Thanks for your message! I'm a placeholder reply for now — the real AI agent connects in Step 3. In the meantime, reach the team at frisoftltd@gmail.com.");
      }, 900);
    });
  }

  function buildShell(placement) {
    var isFloating = placement === 'floating';
    var html = '';
    html += '<div class="chat-widget-header">';
    html += '<span class="icon-circle"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B2A57" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"></path></svg></span>';
    html += '<span class="chat-widget-header-text"><span class="name">Fri Soft assistant</span><span class="status"><span class="dot"></span>AI · replies in seconds</span></span>';
    if (isFloating) {
      html += '<button type="button" class="chat-widget-close" aria-label="Close chat">&times;</button>';
    }
    html += '</div>';
    html += '<div class="chat-messages" aria-live="polite" role="log"></div>';
    html += '<div class="chat-input-row">';
    html += '<label class="visually-hidden" for="chat-input-' + placement + '">Type your question</label>';
    html += '<input type="text" id="chat-input-' + placement + '" class="chat-input" placeholder="Type your question…" maxlength="' + MAX_MESSAGE_LENGTH + '">';
    html += '<button type="button" class="chat-icon-btn chat-mic-btn" aria-label="Speak your question" aria-pressed="false"' + (recognition ? '' : ' hidden') + '>';
    html += '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14529B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3"></path></svg>';
    html += '</button>';
    html += '<button type="button" class="chat-icon-btn chat-speaker-btn" aria-label="Read replies aloud" aria-pressed="false"' + (synthSupported ? '' : ' hidden') + '>';
    html += '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14529B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"></path><path d="M19 12a4 4 0 0 0-2-3.5M19 12a4 4 0 0 1-2 3.5"></path></svg>';
    html += '</button>';
    html += '<button type="button" class="chat-send-btn" aria-label="Send">';
    html += '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B2A57" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
    html += '</button>';
    html += '</div>';
    html += '<div class="chat-note">' + escapeHtml(WIDGET_CONTENT.note) + '</div>';
    return html;
  }

  function makeBubble(text, role) {
    var div = document.createElement('div');
    div.className = 'chat-bubble is-entering' + (role === 'user' ? ' from-user' : '');
    div.textContent = text;
    return div;
  }

  function makeTypingBubble() {
    var div = document.createElement('div');
    div.className = 'chat-bubble typing';
    div.setAttribute('aria-label', 'Assistant is typing');
    div.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    return div;
  }

  function makeQuickButtonsRow(placement) {
    var row = document.createElement('div');
    row.className = 'chat-quick-buttons';
    WIDGET_CONTENT.quickButtons.forEach(function (qb) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-quick-btn';
      btn.textContent = qb.label;
      btn.addEventListener('click', function () { handleQuickButton(qb); });
      row.appendChild(btn);
    });
    return row;
  }

  function renderMessages() {
    Object.keys(widgets).forEach(function (placement) {
      var w = widgets[placement];
      if (!w) return;
      var el = w.messagesEl;
      el.innerHTML = '';
      if (greetingShown) {
        el.appendChild(makeBubble(WIDGET_CONTENT.greeting, 'assistant'));
        el.appendChild(makeQuickButtonsRow(placement));
      }
      conversation.forEach(function (msg) {
        el.appendChild(makeBubble(msg.text, msg.role));
      });
      if (isTyping) {
        el.appendChild(makeTypingBubble());
      }
      el.scrollTop = el.scrollHeight;
    });
  }

  function showGreeting() {
    if (greetingShown) return;
    greetingShown = true;
    chatEverOpened = true;
    hideLauncherUnreadDot();
    renderMessages();
  }

  function handleQuickButton(qb) {
    if (!greetingShown) showGreeting();
    pushMessage('user', qb.label);
    pushMessage('assistant', qb.answer);
    renderMessages();
    maybeSpeak(qb.answer);
  }

  function handleSend(placement) {
    var w = widgets[placement];
    if (!w) return;
    var text = cap(w.inputEl.value.trim(), MAX_MESSAGE_LENGTH);
    if (!text) return;
    if (!greetingShown) showGreeting();
    pushMessage('user', text);
    w.inputEl.value = '';
    isTyping = true;
    renderMessages();
    sendToAgent(recentMessages()).then(function (reply) {
      isTyping = false;
      pushMessage('assistant', reply);
      renderMessages();
      maybeSpeak(reply);
    }).catch(function () {
      isTyping = false;
      pushMessage('assistant', 'Sorry, something went wrong. Please try again or use the contact details below.');
      renderMessages();
    });
  }

  function maybeSpeak(text) {
    // Never called for the greeting — only for replies to a message the
    // visitor actually sent, so audio never plays automatically on load.
    if (!speakerOn || !synthSupported) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch (e) { /* ignore */ }
  }

  function syncSpeakerButtons() {
    Object.keys(widgets).forEach(function (placement) {
      var btn = widgets[placement] && widgets[placement].speakerBtn;
      if (btn) btn.setAttribute('aria-pressed', speakerOn ? 'true' : 'false');
    });
    if (!speakerOn && synthSupported) {
      window.speechSynthesis.cancel();
    }
  }

  function setMicPressed(pressed) {
    Object.keys(widgets).forEach(function (placement) {
      var btn = widgets[placement] && widgets[placement].micBtn;
      if (btn) btn.setAttribute('aria-pressed', pressed && placement === activeMicPlacement ? 'true' : 'false');
    });
  }

  function toggleMic(placement) {
    if (!recognition) return;
    if (recognizing) {
      recognition.stop();
      return;
    }
    activeMicPlacement = placement;
    try {
      recognition.start();
    } catch (e) { /* recognition already running; ignore */ }
  }

  if (recognition) {
    recognition.addEventListener('start', function () {
      recognizing = true;
      setMicPressed(true);
    });
    recognition.addEventListener('result', function (event) {
      var transcript = event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript;
      if (transcript && activeMicPlacement && widgets[activeMicPlacement]) {
        widgets[activeMicPlacement].inputEl.value = cap(transcript, MAX_MESSAGE_LENGTH);
        widgets[activeMicPlacement].inputEl.focus();
      }
    });
    recognition.addEventListener('end', function () {
      recognizing = false;
      setMicPressed(false);
      activeMicPlacement = null;
    });
    recognition.addEventListener('error', function () {
      recognizing = false;
      setMicPressed(false);
      activeMicPlacement = null;
    });
  }

  var launcherBtn = document.getElementById('chat-launcher');
  var launcherIconGlyph = launcherBtn && launcherBtn.querySelector('.chat-launcher-icon-glyph');
  var launcherUnreadDot = launcherBtn && launcherBtn.querySelector('.chat-launcher-unread-dot');
  var teaserEl = document.getElementById('chat-launcher-teaser');
  var teaserCloseBtn = teaserEl && teaserEl.querySelector('.chat-launcher-teaser-close');
  var heroChatFrame = document.getElementById('chat');

  function hideLauncherUnreadDot() {
    if (launcherUnreadDot) launcherUnreadDot.hidden = true;
  }

  // aria-expanded, aria-label and the icon glyph all reflect open/closed state.
  // Decision: the launcher ITSELF becomes the close control while the panel
  // is open (compact circle, "x" icon) rather than hiding — see Step report.
  function updateLauncherOpenState(isOpen) {
    if (!launcherBtn) return;
    launcherBtn.classList.toggle('is-open', isOpen);
    launcherBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    launcherBtn.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat with Fri Soft AI assistant');
    if (launcherIconGlyph) {
      launcherIconGlyph.innerHTML = isOpen ? LAUNCHER_CLOSE_ICON : LAUNCHER_CHAT_ICON;
    }
  }

  function openFloating() {
    var w = widgets.floating;
    if (!w) return;
    w.root.hidden = false;
    floatingOpen = true;
    updateLauncherOpenState(true);
    hideTeaser();
    if (!greetingShown) showGreeting();
    renderMessages();
    setTimeout(function () { w.inputEl.focus(); }, 50);
  }

  function closeFloating() {
    var w = widgets.floating;
    if (!w) return;
    w.root.hidden = true;
    floatingOpen = false;
    updateLauncherOpenState(false);
    if (launcherBtn) launcherBtn.focus();
  }

  if (launcherBtn) {
    launcherBtn.addEventListener('click', function () {
      if (floatingOpen) { closeFloating(); } else { openFloating(); }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && floatingOpen) {
      closeFloating();
    }
  });

  // Hero visibility is tracked only to gate the teaser bubble now — the
  // launcher itself is always visible from load (see showLauncher below).
  if (heroChatFrame && 'IntersectionObserver' in window) {
    var heroObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        heroCurrentlyVisible = entry.isIntersecting;
        if (heroCurrentlyVisible) hideTeaser();
      });
    }, { threshold: 0.15 });
    heroObserver.observe(heroChatFrame);
  }

  function heroInView() {
    if (!heroChatFrame) return true;
    if ('IntersectionObserver' in window) return heroCurrentlyVisible;
    var rect = heroChatFrame.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom > 0 && rect.top < viewportHeight;
  }

  function scheduleAutoOpen() {
    var already = null;
    try { already = sessionStorage.getItem(AUTO_OPEN_SESSION_KEY); } catch (e) { already = null; }
    if (already) return;
    setTimeout(function () {
      try { sessionStorage.setItem(AUTO_OPEN_SESSION_KEY, '1'); } catch (e) { /* ignore */ }
      showGreeting();
      if (!heroInView()) {
        openFloating();
      }
    }, AUTO_OPEN_DELAY_MS);
  }

  // Launcher appears ~1s after load and stays visible at every scroll
  // position. A short attention pulse (3 rings, CSS-limited, no JS loop)
  // plays once right after it appears, unless reduced motion is requested.
  function showLauncher() {
    if (!launcherBtn) return;
    launcherBtn.classList.add('is-visible');
    if (!prefersReducedMotion) {
      launcherBtn.classList.add('is-pulsing');
      launcherBtn.addEventListener('animationend', function onPulseEnd(e) {
        if (e.target === launcherBtn.querySelector('.chat-launcher-ring')) {
          launcherBtn.classList.remove('is-pulsing');
          launcherBtn.removeEventListener('animationend', onPulseEnd);
        }
      });
    }
  }

  // Teaser bubble: once per session, hidden if the panel is open or the
  // hero chat card (which already shows the same greeting) is in view.
  function teaserAlreadyShownThisSession() {
    var already = null;
    try { already = sessionStorage.getItem(TEASER_SESSION_KEY); } catch (e) { already = null; }
    return !!already;
  }

  function showTeaser() {
    if (!teaserEl || teaserAlreadyShownThisSession()) return;
    if (floatingOpen || heroInView()) return;
    teaserEl.hidden = false;
    // Force a reflow so the transition plays, then trigger it.
    void teaserEl.offsetWidth;
    teaserEl.classList.add('is-visible');
    try { sessionStorage.setItem(TEASER_SESSION_KEY, '1'); } catch (e) { /* ignore */ }
    if (!chatEverOpened && launcherUnreadDot) launcherUnreadDot.hidden = false;
  }

  function hideTeaser() {
    if (!teaserEl || teaserEl.hidden) return;
    teaserEl.hidden = true;
    teaserEl.classList.remove('is-visible');
  }

  function scheduleTeaser() {
    if (teaserAlreadyShownThisSession()) return;
    setTimeout(showTeaser, TEASER_DELAY_MS);
  }

  if (teaserCloseBtn) {
    teaserCloseBtn.addEventListener('click', hideTeaser);
  }

  function initWidget(placement, rootEl) {
    rootEl.innerHTML = buildShell(placement);
    var widget = {
      root: rootEl,
      messagesEl: rootEl.querySelector('.chat-messages'),
      inputEl: rootEl.querySelector('.chat-input'),
      micBtn: rootEl.querySelector('.chat-mic-btn'),
      speakerBtn: rootEl.querySelector('.chat-speaker-btn'),
      sendBtn: rootEl.querySelector('.chat-send-btn')
    };
    widgets[placement] = widget;

    widget.sendBtn.addEventListener('click', function () { handleSend(placement); });
    widget.inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend(placement);
      }
    });
    widget.inputEl.addEventListener('input', function () {
      if (widget.inputEl.value.length > MAX_MESSAGE_LENGTH) {
        widget.inputEl.value = widget.inputEl.value.slice(0, MAX_MESSAGE_LENGTH);
      }
    });
    if (widget.speakerBtn) {
      widget.speakerBtn.addEventListener('click', function () {
        speakerOn = !speakerOn;
        syncSpeakerButtons();
      });
    }
    if (widget.micBtn) {
      widget.micBtn.addEventListener('click', function () { toggleMic(placement); });
    }
    var closeBtn = rootEl.querySelector('.chat-widget-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeFloating);
    }
  }

  function init() {
    var heroRoot = document.getElementById('chat-widget-hero');
    var floatingRoot = document.getElementById('chat-widget-floating');
    if (heroRoot) initWidget('hero', heroRoot);
    if (floatingRoot) initWidget('floating', floatingRoot);
    renderMessages();
    scheduleAutoOpen();
    setTimeout(showLauncher, LAUNCHER_APPEAR_DELAY_MS);
    scheduleTeaser();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
