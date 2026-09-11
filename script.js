const revealTargets = document.querySelectorAll(
  ".hero-intro, .hero-copy, .hero-card, .portfolio-summary, .portfolio-year, .portfolio-entry, .portfolio-disclaimer, .legal-card, .marquee, .section-heading, .project-card, .about-panel, .chat-shell, .contact-card"
);

revealTargets.forEach((element) => {
  element.classList.add("reveal");
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealTargets.forEach((element, index) => {
    element.style.transitionDelay = `${index * 60}ms`;
    observer.observe(element);
  });
} else {
  revealTargets.forEach((element) => {
    element.classList.add("is-visible");
  });
}

const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatLog = document.querySelector("#chat-log");
const chatSubmit = document.querySelector("#chat-submit");
const chatToggle = document.querySelector("#chat-toggle");
const chatPanel = document.querySelector("#chat-panel");
const chatClose = document.querySelector("#chat-close");
const chatOpenLinks = document.querySelectorAll("[data-chat-open]");
const suggestionButtons = document.querySelectorAll(".suggestion-chip");
const snapshotCards = document.querySelectorAll(".portfolio-card");
const snapshotControls = document.querySelectorAll("[data-snapshot-action]");
let selectedSnapshotIndex = 0;
function setChatOpen(isOpen) {
  if (!chatPanel || !chatToggle) {
    return;
  }

  chatPanel.hidden = !isOpen;
  chatToggle.setAttribute("aria-expanded", String(isOpen));

  if (isOpen && chatInput) {
    window.setTimeout(() => chatInput.focus(), 80);
  }
}

if (chatToggle) {
  chatToggle.addEventListener("click", () => {
    setChatOpen(chatPanel ? chatPanel.hidden : true);
  });
}

if (chatClose) {
  chatClose.addEventListener("click", () => {
    setChatOpen(false);

    if (chatToggle) {
      chatToggle.focus();
    }
  });
}

chatOpenLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setChatOpen(true);
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && chatPanel && !chatPanel.hidden) {
    setChatOpen(false);

    if (chatToggle) {
      chatToggle.focus();
    }
  }
});

if (window.location.hash === "#chat-widget") {
  setChatOpen(true);
}

function appendMessage(role, text, sources = []) {
  if (!chatLog) {
    return;
  }

  const message = document.createElement("article");
  message.className = `chat-message chat-message-${role}`;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  message.appendChild(paragraph);

  if (role === "assistant" && sources.length > 0) {
    const sourceList = document.createElement("p");
    sourceList.className = "chat-source-list";
    sourceList.textContent = `Grounded in: ${sources.join(", ")}`;
    message.appendChild(sourceList);
  }

  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function submitChat(message) {
  appendMessage("user", message);

  if (chatSubmit) {
    chatSubmit.disabled = true;
    chatSubmit.textContent = "Thinking...";
  }

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const responseText = await response.text();
    let payload = {};

    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = {
        error: response.ok
          ? "The chat response could not be read."
          : "The chat service returned an unreadable response.",
      };
    }

    if (!response.ok) {
      throw new Error(payload.error || "Something went wrong.");
    }

    appendMessage("assistant", payload.answer, payload.sources || []);
  } catch (error) {
    appendMessage(
      "assistant",
      error.message === "Failed to fetch"
        ? "Chat is not available in the static preview. It will work after deployment once the /api/chat function is live and OPENAI_API_KEY is configured."
        : error.message
    );
  } finally {
    if (chatSubmit) {
      chatSubmit.disabled = false;
      chatSubmit.textContent = "Ask";
    }
  }
}

if (chatForm && chatInput) {
  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = chatInput.value.trim();

    if (!message) {
      return;
    }

    chatInput.value = "";
    await submitChat(message);
  });
}

suggestionButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const prompt = button.getAttribute("data-prompt");

    if (!prompt) {
      return;
    }

    if (chatInput) {
      chatInput.value = prompt;
    }

    await submitChat(prompt);
  });
});

function selectSnapshotCard(index) {
  if (snapshotCards.length === 0) {
    return;
  }

  selectedSnapshotIndex =
    (index + snapshotCards.length) % snapshotCards.length;

  snapshotCards.forEach((card, cardIndex) => {
    card.classList.toggle("is-selected", cardIndex === selectedSnapshotIndex);
  });

  try {
    snapshotCards[selectedSnapshotIndex].focus({ preventScroll: true });
  } catch {
    snapshotCards[selectedSnapshotIndex].focus();
  }

  try {
    snapshotCards[selectedSnapshotIndex].scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  } catch {
    snapshotCards[selectedSnapshotIndex].scrollIntoView(false);
  }
}

snapshotControls.forEach((button) => {
  button.addEventListener("click", () => {
    const direction =
      button.getAttribute("data-snapshot-action") === "prev" ? -1 : 1;

    selectSnapshotCard(selectedSnapshotIndex + direction);
  });
});
