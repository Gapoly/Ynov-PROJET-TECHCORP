const messagesEl = document.querySelector("#messages");
const formEl = document.querySelector("#chat-form");
const inputEl = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const clearButton = document.querySelector("#clear-button");
const themeButton = document.querySelector("#theme-button");
const settingsButton = document.querySelector("#settings-button");
const settingsDialog = document.querySelector("#settings-dialog");
const modelInput = document.querySelector("#model-input");
const temperatureInput = document.querySelector("#temperature-input");
const temperatureValue = document.querySelector("#temperature-value");
const tokensInput = document.querySelector("#tokens-input");
const statusPill = document.querySelector("#status-pill");
const statusDetail = document.querySelector("#status-detail");

const state = {
  messages: [],
  pending: false
};

function getStoredTheme() {
  try {
    return localStorage.getItem("chat-theme");
  } catch {
    return null;
  }
}

function setStoredTheme(theme) {
  try {
    localStorage.setItem("chat-theme", theme);
  } catch {
    // Theme still works for the current page even if storage is unavailable.
  }
}

function getInitialTheme() {
  const storedTheme = getStoredTheme();
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyTheme(theme) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalizedTheme;
  document.body.classList.toggle("theme-dark", normalizedTheme === "dark");
  themeButton.textContent = normalizedTheme === "dark" ? "☀" : "☾";
  themeButton.title = normalizedTheme === "dark" ? "Theme clair" : "Theme sombre";
  themeButton.setAttribute("aria-label", themeButton.title);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clearEmptyState() {
  const empty = messagesEl.querySelector(".empty-state");
  if (empty) empty.remove();
}

function appendMessage(role, content, meta = "") {
  clearEmptyState();
  const article = document.createElement("article");
  article.className = `message ${role}`;
  article.innerHTML = `
    <div class="message-content">${escapeHtml(content)}</div>
    ${meta ? `<div class="message-meta">${escapeHtml(meta)}</div>` : ""}
  `;
  messagesEl.appendChild(article);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setPending(pending) {
  state.pending = pending;
  sendButton.disabled = pending;
  sendButton.textContent = pending ? "…" : "↑";
}

function syncTemperature() {
  temperatureValue.textContent = Number(temperatureInput.value).toFixed(2);
}

async function refreshHealth() {
  try {
    const response = await fetch("/health");
    const data = await response.json();
    modelInput.value = data.default_model || modelInput.value;
    statusDetail.textContent = data.ollama_reachable ? data.default_model : "Ollama hors ligne";
    statusPill.className = data.ollama_reachable ? "status-dot ok" : "status-dot error";
  } catch (error) {
    statusPill.className = "status-dot error";
    statusDetail.textContent = error.message;
  }
}

async function sendMessage(content) {
  if (state.pending) return;
  const userMessage = { role: "user", content };
  state.messages.push(userMessage);
  appendMessage("user", content);
  setPending(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelInput.value.trim(),
        messages: state.messages,
        temperature: Number(temperatureInput.value),
        num_predict: Number(tokensInput.value)
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.error || "Erreur inference");
    }
    const answer = data.answer || "Reponse vide du modele.";
    state.messages.push({ role: "assistant", content: answer });
    appendMessage("assistant", answer);
  } catch (error) {
    appendMessage("error", error.message);
  } finally {
    setPending(false);
    inputEl.focus();
  }
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const content = inputEl.value.trim();
  if (!content) return;
  inputEl.value = "";
  sendMessage(content);
});

clearButton.addEventListener("click", () => {
  state.messages = [];
  messagesEl.innerHTML = `
    <div class="empty-state">
      <strong>Comment puis-je t'aider ?</strong>
    </div>
  `;
  inputEl.focus();
});

settingsButton.addEventListener("click", () => {
  settingsDialog.showModal();
});

themeButton.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  setStoredTheme(next);
  applyTheme(next);
});

temperatureInput.addEventListener("input", syncTemperature);

inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    formEl.requestSubmit();
  }
});

applyTheme(getInitialTheme());
syncTemperature();
refreshHealth();
setInterval(refreshHealth, 15000);
