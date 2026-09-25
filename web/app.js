/**
 * Cosmic RAG Assistant - Application Logic
 */

// Application State
const state = {
  activeDoc: { id: "doc-gru-pdf", filename: "GRU.pdf", pages: 15, chunks: 74 },
  currentChatId: null,
  currentChatTitle: "New Conversation",
  messages: [],
  chats: [],
  documents: [],
  isGenerating: false,
  webSearchEnabled: false
};

// DOM Elements
const DOM = {
  // Navigation & Header
  greetingTitle: document.getElementById('greeting-title'),
  searchBarTrigger: document.getElementById('search-bar-trigger'),
  themeBtn: document.getElementById('theme-btn'),
  userProfileBtn: document.getElementById('user-profile-btn'),
  brandLogoBtn: document.getElementById('brand-logo-btn'),

  // Sidebar
  newChatBtn: document.getElementById('new-chat-btn'),
  navHome: document.getElementById('nav-home'),
  navDocuments: document.getElementById('nav-documents'),
  navHistory: document.getElementById('nav-history'),
  navSaved: document.getElementById('nav-saved'),
  navTemplates: document.getElementById('nav-templates'),
  navSettings: document.getElementById('nav-settings'),
  docsCountBadge: document.getElementById('docs-count-badge'),
  savedCountBadge: document.getElementById('saved-count-badge'),
  recentChatsList: document.getElementById('recent-chats-list'),
  seeAllChatsBtn: document.getElementById('see-all-chats-btn'),
  helpBtn: document.getElementById('help-btn'),
  feedbackBtn: document.getElementById('feedback-btn'),

  // Banner
  activeDocBanner: document.getElementById('active-doc-banner'),
  activeDocName: document.getElementById('active-doc-name'),
  activeDocStats: document.getElementById('active-doc-stats'),
  switchDocBtn: document.getElementById('switch-doc-btn'),
  quickUploadBannerBtn: document.getElementById('quick-upload-banner-btn'),

  // Views
  heroSection: document.getElementById('hero-section'),
  conversationSection: document.getElementById('conversation-section'),
  currentChatTitle: document.getElementById('current-chat-title'),
  messagesContainer: document.getElementById('messages-container'),
  backHomeBtn: document.getElementById('back-home-btn'),
  saveCurrentChatBtn: document.getElementById('save-current-chat-btn'),
  saveBtnText: document.getElementById('save-btn-text'),
  clearCurrentChatBtn: document.getElementById('clear-current-chat-btn'),

  // Action Cards
  cardUploadDoc: document.getElementById('card-upload-doc'),
  cardAskQuestions: document.getElementById('card-ask-questions'),
  cardSaveChats: document.getElementById('card-save-chats'),
  cardGetInsights: document.getElementById('card-get-insights'),

  // Input Box
  userMessageInput: document.getElementById('user-message-input'),
  attachFileBtn: document.getElementById('attach-file-btn'),
  hiddenFileInput: document.getElementById('hidden-file-input'),
  webSearchCheckbox: document.getElementById('web-search-checkbox'),
  sendMsgBtn: document.getElementById('send-msg-btn'),
  voiceInputBtn: document.getElementById('voice-input-btn'),

  // Modals
  uploadModal: document.getElementById('upload-modal'),
  closeUploadModal: document.getElementById('close-upload-modal'),
  dropZone: document.getElementById('drop-zone'),
  browseFileBtn: document.getElementById('browse-file-btn'),
  modalFilePicker: document.getElementById('modal-file-picker'),
  uploadProgressContainer: document.getElementById('upload-progress-container'),
  uploadingFilename: document.getElementById('uploading-filename'),
  uploadStageText: document.getElementById('upload-stage-text'),
  uploadProgressFill: document.getElementById('upload-progress-fill'),

  documentsModal: document.getElementById('documents-modal'),
  closeDocumentsModal: document.getElementById('close-documents-modal'),
  docModalUploadBtn: document.getElementById('doc-modal-upload-btn'),
  documentsTableBody: document.getElementById('documents-table-body'),

  savedChatsModal: document.getElementById('saved-chats-modal'),
  closeSavedModal: document.getElementById('close-saved-modal'),
  savedChatsModalList: document.getElementById('saved-chats-modal-list'),

  cmdKModal: document.getElementById('cmd-k-modal'),
  closeCmdkBtn: document.getElementById('close-cmdk-btn'),
  paletteSearchInput: document.getElementById('palette-search-input'),
  paletteResults: document.getElementById('palette-results'),

  toastContainer: document.getElementById('toast-container')
};

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initGreeting();
  setupEventListeners();
  loadDocuments();
  loadChats();
});

// Update dynamic greeting based on time of day
function initGreeting() {
  const hour = new Date().getHours();
  let timeGreeting = "Good Evening";
  if (hour >= 5 && hour < 12) {
    timeGreeting = "Good Morning";
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = "Good Afternoon";
  }
  DOM.greetingTitle.innerHTML = `${timeGreeting}, <span class="gradient-name">Prem</span>`;
}

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListeners() {
  // Input Handling & Resizing
  DOM.userMessageInput.addEventListener('input', () => {
    DOM.userMessageInput.style.height = 'auto';
    DOM.userMessageInput.style.height = Math.min(DOM.userMessageInput.scrollHeight, 160) + 'px';
    DOM.sendMsgBtn.disabled = DOM.userMessageInput.value.trim().length === 0 || state.isGenerating;
  });

  DOM.userMessageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!DOM.sendMsgBtn.disabled) {
        sendMessage();
      }
    }
  });

  DOM.sendMsgBtn.addEventListener('click', sendMessage);

  // Web Search Toggle
  DOM.webSearchCheckbox.addEventListener('change', (e) => {
    state.webSearchEnabled = e.target.checked;
    showToast(state.webSearchEnabled ? "Web search grounding enabled" : "Document-only mode active", "info");
  });

  // Action Cards
  DOM.cardUploadDoc.addEventListener('click', () => openModal(DOM.uploadModal));
  DOM.cardAskQuestions.addEventListener('click', () => {
    DOM.userMessageInput.focus();
    DOM.userMessageInput.placeholder = "Ask anything about GRU vs LSTM or your uploaded docs...";
  });
  DOM.cardSaveChats.addEventListener('click', () => openModal(DOM.savedChatsModal));
  DOM.cardGetInsights.addEventListener('click', () => {
    DOM.userMessageInput.value = "Provide a comprehensive summary and key takeaways from the document.";
    DOM.userMessageInput.dispatchEvent(new Event('input'));
    sendMessage();
  });

  // Navigation Links
  DOM.newChatBtn.addEventListener('click', startNewChat);
  DOM.brandLogoBtn.addEventListener('click', switchToHeroView);
  DOM.navHome.addEventListener('click', () => {
    setActiveNav('home');
    switchToHeroView();
  });
  DOM.navDocuments.addEventListener('click', () => {
    setActiveNav('documents');
    openModal(DOM.documentsModal);
  });
  DOM.navSaved.addEventListener('click', () => {
    setActiveNav('saved');
    openModal(DOM.savedChatsModal);
  });
  DOM.navHistory.addEventListener('click', () => {
    setActiveNav('history');
    openModal(DOM.savedChatsModal);
  });
  DOM.navSettings.addEventListener('click', () => {
    showToast("Settings: Google Gemini 2.5 Flash & Embedding-2 Active", "info");
  });
  DOM.navTemplates.addEventListener('click', () => {
    showToast("Templates library coming soon!", "info");
  });

  DOM.seeAllChatsBtn.addEventListener('click', () => openModal(DOM.savedChatsModal));
  DOM.helpBtn.addEventListener('click', () => showToast("Help: Upload any PDF, ask questions, and save conversations.", "info"));
  DOM.feedbackBtn.addEventListener('click', () => showToast("Thank you for using Cosmic RAG Assistant!", "success"));

  // Banner Actions
  DOM.switchDocBtn.addEventListener('click', () => openModal(DOM.documentsModal));
  DOM.quickUploadBannerBtn.addEventListener('click', () => openModal(DOM.uploadModal));

  // Conversation Toolbar
  DOM.backHomeBtn.addEventListener('click', switchToHeroView);
  DOM.saveCurrentChatBtn.addEventListener('click', saveCurrentConversation);
  DOM.clearCurrentChatBtn.addEventListener('click', clearCurrentConversation);

  // File Upload Handlers
  DOM.attachFileBtn.addEventListener('click', () => DOM.hiddenFileInput.click());
  DOM.hiddenFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
  });

  DOM.browseFileBtn.addEventListener('click', () => DOM.modalFilePicker.click());
  DOM.modalFilePicker.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
  });
  DOM.docModalUploadBtn.addEventListener('click', () => {
    closeModal(DOM.documentsModal);
    openModal(DOM.uploadModal);
  });

  // Drag & Drop
  ['dragenter', 'dragover'].forEach(name => {
    DOM.dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      DOM.dropZone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(name => {
    DOM.dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      DOM.dropZone.classList.remove('dragover');
    });
  });
  DOM.dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  // Modal Closures
  DOM.closeUploadModal.addEventListener('click', () => closeModal(DOM.uploadModal));
  DOM.closeDocumentsModal.addEventListener('click', () => closeModal(DOM.documentsModal));
  DOM.closeSavedModal.addEventListener('click', () => closeModal(DOM.savedChatsModal));
  DOM.closeCmdkBtn.addEventListener('click', () => closeModal(DOM.cmdKModal));

  [DOM.uploadModal, DOM.documentsModal, DOM.savedChatsModal, DOM.cmdKModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Quick Command Palette (⌘ K)
  DOM.searchBarTrigger.addEventListener('click', () => openModal(DOM.cmdKModal));
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openModal(DOM.cmdKModal);
    }
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Palette Actions
  document.querySelectorAll('.palette-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      closeModal(DOM.cmdKModal);
      if (action === 'new-chat') startNewChat();
      if (action === 'upload-doc') openModal(DOM.uploadModal);
      if (action === 'view-docs') openModal(DOM.documentsModal);
    });
  });

  DOM.paletteSearchInput.addEventListener('input', (e) => {
    filterPaletteResults(e.target.value.toLowerCase());
  });

  // Voice Input Simulation
  DOM.voiceInputBtn.addEventListener('click', () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.onstart = () => showToast("Listening... Speak now", "info");
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        DOM.userMessageInput.value = transcript;
        DOM.userMessageInput.dispatchEvent(new Event('input'));
      };
      recognition.onerror = () => showToast("Voice recognition error or permission denied", "error");
      recognition.start();
    } else {
      showToast("Voice input not supported in this browser.", "info");
    }
  });
}

// ==========================================================================
// Navigation & Views
// ==========================================================================
function setActiveNav(navKey) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`nav-${navKey}`);
  if (target) target.classList.add('active');
}

function switchToHeroView() {
  DOM.conversationSection.style.display = 'none';
  DOM.heroSection.style.display = 'flex';
  setActiveNav('home');
}

function switchToConversationView() {
  DOM.heroSection.style.display = 'none';
  DOM.conversationSection.style.display = 'flex';
  DOM.userMessageInput.focus();
}

function startNewChat() {
  state.currentChatId = null;
  state.currentChatTitle = "New Conversation";
  state.messages = [];
  DOM.currentChatTitle.textContent = "New Conversation";
  DOM.saveBtnText.textContent = "Save Chat";
  DOM.saveCurrentChatBtn.classList.remove('saved');
  DOM.messagesContainer.innerHTML = '';
  document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active'));
  switchToHeroView();
  DOM.userMessageInput.value = '';
  DOM.userMessageInput.style.height = 'auto';
  DOM.sendMsgBtn.disabled = true;
  DOM.userMessageInput.focus();
}

// ==========================================================================
// Documents Management & Upload
// ==========================================================================
async function loadDocuments() {
  try {
    const res = await fetch('/api/documents');
    const data = await res.json();
    state.documents = data.documents || [];
    
    // Update badge count
    DOM.docsCountBadge.textContent = state.documents.length;

    // Set first doc as active if none
    if (state.documents.length > 0 && !state.activeDoc) {
      setActiveDocument(state.documents[0]);
    } else if (state.documents.length > 0) {
      const matched = state.documents.find(d => d.filename === state.activeDoc.filename);
      if (matched) setActiveDocument(matched);
    }

    renderDocumentsTable();
  } catch (err) {
    console.error("Failed to load documents:", err);
  }
}

function setActiveDocument(doc) {
  state.activeDoc = doc;
  DOM.activeDocName.textContent = doc.filename;
  DOM.activeDocStats.textContent = `${doc.pages} pages • ${doc.chunks} indexed chunks`;
}

function renderDocumentsTable() {
  DOM.documentsTableBody.innerHTML = '';
  if (state.documents.length === 0) {
    DOM.documentsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No documents indexed yet.</td></tr>';
    return;
  }

  state.documents.forEach(doc => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="doc-name-cell">
          <span>📄</span>
          <span>${escapeHTML(doc.filename)}</span>
        </div>
      </td>
      <td>${doc.pages}</td>
      <td>${doc.chunks}</td>
      <td>${doc.uploaded_at || "Recent"}</td>
      <td>
        <button class="pill-action-btn ${state.activeDoc && state.activeDoc.id === doc.id ? 'primary-gradient' : ''}" 
          onclick="selectActiveDoc('${doc.id}')">
          ${state.activeDoc && state.activeDoc.id === doc.id ? 'Active' : 'Select'}
        </button>
      </td>
    `;
    DOM.documentsTableBody.appendChild(tr);
  });
}

window.selectActiveDoc = function(docId) {
  const doc = state.documents.find(d => d.id === docId);
  if (doc) {
    setActiveDocument(doc);
    renderDocumentsTable();
    closeModal(DOM.documentsModal);
    showToast(`Active document set to ${doc.filename}`, "success");
  }
};

async function handleFileUpload(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'txt', 'md'].includes(ext)) {
    showToast("Unsupported file type. Please upload a PDF, TXT, or MD.", "error");
    return;
  }

  // Open modal and show progress animation
  openModal(DOM.uploadModal);
  DOM.uploadProgressContainer.style.display = 'block';
  DOM.uploadingFilename.textContent = file.name;
  DOM.uploadStageText.textContent = "Uploading document...";
  DOM.uploadProgressFill.style.width = "30%";

  const formData = new FormData();
  formData.append('file', file);

  try {
    DOM.uploadStageText.textContent = "Parsing pages & generating Chroma embeddings...";
    DOM.uploadProgressFill.style.width = "65%";

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.detail || "Upload failed");
    }

    DOM.uploadProgressFill.style.width = "100%";
    DOM.uploadStageText.textContent = "Document indexed successfully!";

    setTimeout(() => {
      closeModal(DOM.uploadModal);
      DOM.uploadProgressContainer.style.display = 'none';
      DOM.uploadProgressFill.style.width = "0%";
      loadDocuments();
      if (result.document) {
        setActiveDocument(result.document);
      }
      showToast(`'${file.name}' indexed successfully (${result.document.chunks} chunks)!`, "success");
    }, 800);

  } catch (err) {
    console.error("Upload error:", err);
    DOM.uploadStageText.textContent = "Indexing failed: " + err.message;
    DOM.uploadProgressFill.style.backgroundColor = "#ef4444";
    showToast(err.message, "error");
  }
}

// ==========================================================================
// Chats & Conversation Management
// ==========================================================================
async function loadChats() {
  try {
    const res = await fetch('/api/chats');
    const data = await res.json();
    state.chats = data.chats || [];
    
    // Count saved chats
    const savedCount = state.chats.filter(c => c.saved).length;
    DOM.savedCountBadge.textContent = savedCount;

    renderRecentChats();
    renderSavedChatsModal();
  } catch (err) {
    console.error("Failed to load chats:", err);
  }
}

function renderRecentChats() {
  DOM.recentChatsList.innerHTML = '';
  state.chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = `chat-list-item ${state.currentChatId === chat.id ? 'active' : ''}`;
    item.innerHTML = `
      <svg class="chat-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <div class="chat-item-meta">
        <span class="chat-item-title">${escapeHTML(chat.title)}</span>
        <span class="chat-item-time">${chat.timestamp || "Recently"}</span>
      </div>
      <button class="chat-item-menu-btn" title="Chat options" onclick="event.stopPropagation(); toggleChatMenu('${chat.id}')">···</button>
    `;
    item.addEventListener('click', () => loadChatSession(chat.id));
    DOM.recentChatsList.appendChild(item);
  });
}

function renderSavedChatsModal() {
  DOM.savedChatsModalList.innerHTML = '';
  const savedChats = state.chats.filter(c => c.saved);
  if (savedChats.length === 0) {
    DOM.savedChatsModalList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">No saved chats yet.</p>';
    return;
  }

  savedChats.forEach(chat => {
    const card = document.createElement('div');
    card.className = 'saved-chat-card';
    card.innerHTML = `
      <div class="saved-card-title">${escapeHTML(chat.title)}</div>
      <div class="saved-card-meta">Doc: ${chat.doc_name || "Knowledge Base"} • ${chat.messages ? chat.messages.length : 0} messages</div>
    `;
    card.addEventListener('click', () => {
      closeModal(DOM.savedChatsModal);
      loadChatSession(chat.id);
    });
    DOM.savedChatsModalList.appendChild(card);
  });
}

window.toggleChatMenu = function(chatId) {
  const chat = state.chats.find(c => c.id === chatId);
  if (!chat) return;
  const isSaved = chat.saved;
  const action = confirm(`Chat: "${chat.title}"\n\nClick OK to ${isSaved ? 'remove from' : 'add to'} Saved Chats, or Cancel to delete.`);
  if (action) {
    chat.saved = !isSaved;
    saveChatToBackend(chat);
  } else {
    if (confirm(`Are you sure you want to delete "${chat.title}"?`)) {
      deleteChatFromBackend(chatId);
    }
  }
};

async function saveChatToBackend(chat) {
  try {
    await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chat)
    });
    loadChats();
    showToast("Chat saved status updated!", "success");
  } catch (e) {
    console.error(e);
  }
}

async function deleteChatFromBackend(chatId) {
  try {
    await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
    if (state.currentChatId === chatId) {
      startNewChat();
    }
    loadChats();
    showToast("Chat deleted.", "info");
  } catch (e) {
    console.error(e);
  }
}

function loadChatSession(chatId) {
  const chat = state.chats.find(c => c.id === chatId);
  if (!chat) return;

  state.currentChatId = chat.id;
  state.currentChatTitle = chat.title;
  state.messages = chat.messages ? [...chat.messages] : [];

  DOM.currentChatTitle.textContent = chat.title;
  DOM.saveBtnText.textContent = chat.saved ? "Saved" : "Save Chat";
  if (chat.saved) {
    DOM.saveCurrentChatBtn.classList.add('saved');
  } else {
    DOM.saveCurrentChatBtn.classList.remove('saved');
  }

  // Render messages
  DOM.messagesContainer.innerHTML = '';
  state.messages.forEach(msg => {
    appendMessageUI(msg.role, msg.content, msg.sources);
  });

  switchToConversationView();
  renderRecentChats();
}

async function saveCurrentConversation() {
  if (state.messages.length === 0) {
    showToast("Cannot save an empty conversation.", "info");
    return;
  }

  const titlePrompt = prompt("Save Conversation As:", state.currentChatTitle !== "New Conversation" ? state.currentChatTitle : state.messages[0].content.slice(0, 36) + "...");
  if (!titlePrompt) return;

  const chatPayload = {
    id: state.currentChatId,
    title: titlePrompt,
    saved: true,
    doc_name: state.activeDoc ? state.activeDoc.filename : "Document",
    messages: state.messages
  };

  try {
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatPayload)
    });
    const result = await res.json();
    if (result.success) {
      state.currentChatId = result.chat.id;
      state.currentChatTitle = result.chat.title;
      DOM.currentChatTitle.textContent = result.chat.title;
      DOM.saveBtnText.textContent = "Saved";
      DOM.saveCurrentChatBtn.classList.add('saved');
      loadChats();
      showToast("Conversation saved successfully!", "success");
    }
  } catch (err) {
    showToast("Failed to save chat: " + err.message, "error");
  }
}

function clearCurrentConversation() {
  if (confirm("Clear all messages in this conversation?")) {
    state.messages = [];
    DOM.messagesContainer.innerHTML = '';
    showToast("Messages cleared.", "info");
  }
}

// ==========================================================================
// Messaging & RAG Generation
// ==========================================================================
async function sendMessage() {
  const query = DOM.userMessageInput.value.trim();
  if (!query || state.isGenerating) return;

  // Transition to chat view
  switchToConversationView();

  // Reset input field
  DOM.userMessageInput.value = '';
  DOM.userMessageInput.style.height = 'auto';
  DOM.sendMsgBtn.disabled = true;

  // Append user message
  state.messages.push({ role: 'user', content: query });
  appendMessageUI('user', query);

  // Set chat title if new
  if (state.currentChatTitle === "New Conversation") {
    state.currentChatTitle = query.slice(0, 32) + (query.length > 32 ? "..." : "");
    DOM.currentChatTitle.textContent = state.currentChatTitle;
  }

  // Show thinking indicator
  state.isGenerating = true;
  const thinkingNode = appendThinkingUI();

  try {
    const payload = {
      message: query,
      doc_id: state.activeDoc ? state.activeDoc.id : null,
      history: state.messages.slice(-5),
      search_web: state.webSearchEnabled
    };

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    thinkingNode.remove();

    if (!res.ok) {
      throw new Error(data.detail || "Error generating response");
    }

    const assistantMsg = {
      role: 'assistant',
      content: data.response,
      sources: data.sources || []
    };

    state.messages.push(assistantMsg);
    appendMessageUI('assistant', assistantMsg.content, assistantMsg.sources);

    // Auto-save recent state
    autoSyncChat();

  } catch (err) {
    thinkingNode.remove();
    appendMessageUI('assistant', `⚠️ **Error:** ${err.message}\n\nPlease verify your Google API key or try again.`);
    showToast("Failed to generate response", "error");
  } finally {
    state.isGenerating = false;
    DOM.userMessageInput.focus();
  }
}

function autoSyncChat() {
  if (state.messages.length > 0) {
    const payload = {
      id: state.currentChatId,
      title: state.currentChatTitle,
      saved: DOM.saveCurrentChatBtn.classList.contains('saved'),
      doc_name: state.activeDoc ? state.activeDoc.filename : "Document",
      messages: state.messages
    };
    fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(res => {
      if (res.chat && !state.currentChatId) {
        state.currentChatId = res.chat.id;
      }
      loadChats();
    }).catch(e => console.error("Auto-sync error", e));
  }
}

function appendMessageUI(role, text, sources = []) {
  const row = document.createElement('div');
  row.className = `message-row ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? 'P' : '✦';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = renderMarkdown(text);

  // If assistant message and has citations/sources
  if (role === 'assistant' && sources && sources.length > 0) {
    const sourcesWrapper = document.createElement('div');
    sourcesWrapper.className = 'message-sources-wrapper';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sources-toggle-btn';
    toggleBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      </svg>
      <span>Grounding: ${sources.length} Context Excerpts</span>
      <span class="chevron">▾</span>
    `;

    const sourcesList = document.createElement('div');
    sourcesList.className = 'sources-list';
    sourcesList.style.display = 'none';

    sources.forEach((s, idx) => {
      const item = document.createElement('div');
      item.className = 'source-item';
      item.innerHTML = `
        <div class="source-item-header">Source #${idx + 1}: ${escapeHTML(s.source)} (Page ${s.page})</div>
        <div class="source-item-snippet">"${escapeHTML(s.content)}"</div>
      `;
      sourcesList.appendChild(item);
    });

    toggleBtn.addEventListener('click', () => {
      const isHidden = sourcesList.style.display === 'none';
      sourcesList.style.display = isHidden ? 'flex' : 'none';
      toggleBtn.querySelector('.chevron').textContent = isHidden ? '▴' : '▾';
    });

    sourcesWrapper.appendChild(toggleBtn);
    sourcesWrapper.appendChild(sourcesList);
    bubble.appendChild(sourcesWrapper);
  }

  // Copy button
  if (role === 'assistant') {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action-btn';
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    `;
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(text);
      showToast("Copied to clipboard!", "info");
    });
    actions.appendChild(copyBtn);
    bubble.appendChild(actions);
  }

  row.appendChild(avatar);
  row.appendChild(bubble);

  DOM.messagesContainer.appendChild(row);
  DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
}

function appendThinkingUI() {
  const row = document.createElement('div');
  row.className = 'message-row assistant';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '✦';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble thinking-bubble';
  bubble.innerHTML = '<div class="dot-flashing"></div>';

  row.appendChild(avatar);
  row.appendChild(bubble);

  DOM.messagesContainer.appendChild(row);
  DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
  return row;
}

// Simple Markdown Renderer
function renderMarkdown(md) {
  if (!md) return '';
  let html = escapeHTML(md);

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  // Unordered list items
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
  // Ordered list items
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>');
  // Wrap list items
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  // Clean repeated ul tags
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  return `<p>${html}</p>`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// ==========================================================================
// Modals & UI Helpers
// ==========================================================================
function openModal(modal) {
  modal.style.display = 'flex';
}

function closeModal(modal) {
  modal.style.display = 'none';
}

function closeAllModals() {
  [DOM.uploadModal, DOM.documentsModal, DOM.savedChatsModal, DOM.cmdKModal].forEach(m => {
    m.style.display = 'none';
  });
}

function filterPaletteResults(query) {
  const items = DOM.paletteResults.querySelectorAll('.palette-item');
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(query) ? 'flex' : 'none';
  });
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
