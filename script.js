const revealTargets = document.querySelectorAll(
  ".hero-intro, .hero-copy, .hero-card, .marquee, .section-heading, .project-card, .about-panel, .chat-shell, .contact-card"
);

revealTargets.forEach((element) => {
  element.classList.add("reveal");
});

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

const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatLog = document.querySelector("#chat-log");
const chatSubmit = document.querySelector("#chat-submit");
const suggestionButtons = document.querySelectorAll(".suggestion-chip");

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

    const payload = await response.json();

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
