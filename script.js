const revealTargets = document.querySelectorAll(
  ".hero-intro, .hero-copy, .hero-card, .portfolio-summary, .portfolio-year, .portfolio-entry, .portfolio-disclaimer, .legal-card, .marquee, .section-heading, .project-card, .about-panel, .chat-shell, .contact-card"
);

Array.prototype.forEach.call(revealTargets, (element) => {
  element.classList.add("reveal");
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      Array.prototype.forEach.call(entries, (entry) => {
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

  Array.prototype.forEach.call(revealTargets, (element, index) => {
    element.style.transitionDelay = `${index * 60}ms`;
    observer.observe(element);
  });
} else {
  Array.prototype.forEach.call(revealTargets, (element) => {
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
const portfolioTrack = document.querySelector("#portfolio-track");
const snapshotControls = document.querySelectorAll("[data-snapshot-action]");
const chatSuggestionPool = [
  {
    label: "Portfolio projects",
    prompt: "What portfolio projects are listed for Ryan?",
  },
  {
    label: "Healthcare integrations",
    prompt: "What is Ryan's experience with healthcare integrations?",
  },
  {
    label: "Charles Schwab",
    prompt: "What did Ryan work on at Charles Schwab?",
  },
  {
    label: "Oracle Guided Learning",
    prompt: "What did Ryan work on for Oracle Guided Learning?",
  },
  {
    label: "AI product work",
    prompt: "What is Ryan's experience with AI product work?",
  },
  {
    label: "Product leadership",
    prompt: "How has Ryan led product teams?",
  },
  {
    label: "Patents",
    prompt: "What patents does Ryan have?",
  },
  {
    label: "Dish and Sling TV",
    prompt: "What did Ryan work on at Dish and Sling TV?",
  },
  {
    label: "Certifications",
    prompt: "What product and agile certifications does Ryan have?",
  },
  {
    label: "Education",
    prompt: "What is Ryan's educational background?",
  },
];

function getRandomChatSuggestions(count) {
  const suggestions = chatSuggestionPool.slice();

  for (let index = suggestions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentSuggestion = suggestions[index];

    suggestions[index] = suggestions[swapIndex];
    suggestions[swapIndex] = currentSuggestion;
  }

  return suggestions.slice(0, count);
}

function refreshChatSuggestions() {
  const suggestions = getRandomChatSuggestions(suggestionButtons.length);

  Array.prototype.forEach.call(suggestionButtons, (button, index) => {
    const suggestion = suggestions[index];

    if (!suggestion) {
      return;
    }

    button.textContent = suggestion.label;
    button.setAttribute("data-prompt", suggestion.prompt);
  });
}

function getSnapshotScrollDistance() {
  if (!portfolioTrack) {
    return 0;
  }

  const firstCard = portfolioTrack.querySelector(".portfolio-card");
  const trackStyles = window.getComputedStyle(portfolioTrack);
  const gap = parseFloat(trackStyles.columnGap || trackStyles.gap) || 0;

  return firstCard ? firstCard.offsetWidth + gap : portfolioTrack.clientWidth;
}

Array.prototype.forEach.call(snapshotControls, (button) => {
  button.addEventListener("click", () => {
    if (!portfolioTrack) {
      return;
    }

    const direction = button.getAttribute("data-snapshot-action") === "prev" ? -1 : 1;
    const distance = getSnapshotScrollDistance() * direction;

    if (typeof portfolioTrack.scrollBy === "function") {
      portfolioTrack.scrollBy({
        left: distance,
        behavior: "smooth",
      });
      return;
    }

    portfolioTrack.scrollLeft += distance;
  });
});

function setChatOpen(isOpen) {
  if (!chatPanel || !chatToggle) {
    return;
  }

  chatPanel.hidden = !isOpen;
  chatToggle.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    refreshChatSuggestions();
  }

  if (isOpen && chatInput) {
    window.setTimeout(() => chatInput.focus(), 80);
  }
}

refreshChatSuggestions();

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

Array.prototype.forEach.call(chatOpenLinks, (link) => {
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

function appendMessage(role, text) {
  if (!chatLog) {
    return;
  }

  const message = document.createElement("article");
  message.className = `chat-message chat-message-${role}`;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  message.appendChild(paragraph);

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
    } catch (parseError) {
      payload = {
        error: response.ok
          ? "The chat response could not be read."
          : "The chat service returned an unreadable response.",
      };
    }

    if (!response.ok) {
      throw new Error(payload.error || "Something went wrong.");
    }

    appendMessage("assistant", payload.answer);
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
  async function submitCurrentChatInput() {
    const message = chatInput.value.trim();

    if (!message || (chatSubmit && chatSubmit.disabled)) {
      return;
    }

    chatInput.value = "";
    await submitChat(message);
  }

  chatInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    await submitCurrentChatInput();
  });

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitCurrentChatInput();
  });
}

Array.prototype.forEach.call(suggestionButtons, (button) => {
  button.addEventListener("click", async () => {
    const prompt = button.getAttribute("data-prompt");

    if (!prompt) {
      return;
    }

    if (chatInput) {
      chatInput.value = "";
    }

    await submitChat(prompt);
  });
});
