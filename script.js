document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "nm_more_app_v1";

  const defaultState = {
    user: null,
    progress: 0,
    points: 0,
    level: 1,
    papers: [],
    completedTopics: [],
    streak: 0,
    lastStudyDate: null,
    notes: [],
  };

  const safeParse = (value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const loadState = () => {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY), null);
    return { ...defaultState, ...(stored || {}) };
  };

  let state = loadState();

  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const todayKey = () => new Date().toISOString().slice(0, 10);

  const awardPoints = (amount) => {
    state.points = Math.max(0, (state.points || 0) + amount);
    state.level = Math.max(1, Math.floor(state.points / 100) + 1);
    saveState();
    refreshStats();
  };

  const updateStreak = () => {
    const today = todayKey();
    if (state.lastStudyDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    if (state.lastStudyDate === yesterdayKey) {
      state.streak = (state.streak || 0) + 1;
    } else {
      state.streak = 1;
    }

    state.lastStudyDate = today;
    saveState();
  };

  const markTopicDone = (topic) => {
    if (!topic) return;
    if (!state.completedTopics.includes(topic)) {
      state.completedTopics.push(topic);
      state.progress = Math.min(100, state.progress + 8);
      awardPoints(15);
      updateStreak();
      saveState();
      refreshLearningUI();
    }
  };

  const addPaper = (paper) => {
    if (!paper || !paper.title) return;
    state.papers.unshift({
      id: crypto?.randomUUID?.() || String(Date.now()),
      title: paper.title,
      subject: paper.subject || "General",
      createdAt: new Date().toISOString(),
    });
    awardPoints(10);
    state.progress = Math.min(100, state.progress + 5);
    saveState();
    renderSavedPapers();
    refreshLearningUI();
  };

  const removePaper = (id) => {
    state.papers = state.papers.filter((p) => p.id !== id);
    saveState();
    renderSavedPapers();
  };

  const logout = () => {
    state.user = null;
    saveState();
    refreshAuthUI();
  };

  const login = (name, email) => {
    state.user = {
      name: name.trim(),
      email: email.trim(),
    };
    updateStreak();
    awardPoints(20);
    saveState();
    refreshAuthUI();
    refreshStats();
  };

  const el = (selector) => document.querySelector(selector);
  const els = (selector) => Array.from(document.querySelectorAll(selector));

  const setText = (selector, value) => {
    const node = el(selector);
    if (node) node.textContent = value;
  };

  const animateNumber = (node, from, to, duration = 700) => {
    if (!node) return;
    const start = performance.now();
    const diff = to - from;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = Math.round(from + diff * eased);
      if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const refreshStats = () => {
    const progressNode = el("[data-progress-text]");
    const pointsNode = el("[data-points]");
    const levelNode = el("[data-level]");
    const streakNode = el("[data-streak]");
    const progressBar = el("[data-progress-bar]");

    if (progressNode) progressNode.textContent = `${Math.round(state.progress || 0)}%`;
    if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, state.progress || 0))}%`;

    if (pointsNode) {
      const current = Number(pointsNode.textContent || 0);
      animateNumber(pointsNode, current, state.points || 0);
    }

    if (levelNode) {
      const current = Number(levelNode.textContent || 1);
      animateNumber(levelNode, current, state.level || 1);
    }

    if (streakNode) {
      const current = Number(streakNode.textContent || 0);
      animateNumber(streakNode, current, state.streak || 0);
    }
  };

  const refreshLearningUI = () => {
    refreshStats();

    els("[data-topic]").forEach((btn) => {
      const topic = btn.getAttribute("data-topic");
      const done = state.completedTopics.includes(topic);
      btn.classList.toggle("is-done", done);
      btn.textContent = done ? "Completed" : "Mark Complete";
    });

    const badge = el("[data-learning-badge]");
    if (badge) {
      badge.textContent =
        state.progress >= 100
          ? "Mission Complete"
          : state.progress >= 75
          ? "Almost There"
          : state.progress >= 40
          ? "Learning Strong"
          : "Start Your Quest";
    }

    const levelTitle = el("[data-level-title]");
    if (levelTitle) {
      const levelName =
        state.level >= 10 ? "Scholar Legend" :
        state.level >= 7 ? "Study Explorer" :
        state.level >= 4 ? "Quest Learner" :
        "Rising Student";

      levelTitle.textContent = levelName;
    }
  };

  const renderSavedPapers = () => {
    const list = el("[data-paper-list]");
    if (!list) return;

    if (!state.papers.length) {
      list.innerHTML = `
        <div class="study-card">
          <p class="lead">No saved papers yet. Your first paper will appear here like a hidden clue.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = state.papers
      .map(
        (paper) => `
          <div class="study-card moving-stars">
            <div class="mini-row">
              <strong>${escapeHtml(paper.title)}</strong>
              <span>${escapeHtml(paper.subject)}</span>
            </div>
            <div class="mini-row">
              <span>${new Date(paper.createdAt).toLocaleString()}</span>
              <button class="btn btn-outline" data-remove-paper="${paper.id}">Remove</button>
            </div>
          </div>
        `
      )
      .join("");

    els("[data-remove-paper]").forEach((btn) => {
      btn.addEventListener("click", () => removePaper(btn.getAttribute("data-remove-paper")));
    });
  };

  const refreshAuthUI = () => {
    const loginBox = el("[data-login-box]");
    const userBox = el("[data-user-box]");
    const userName = el("[data-user-name]");
    const userEmail = el("[data-user-email]");

    if (state.user) {
      if (loginBox) loginBox.hidden = true;
      if (userBox) userBox.hidden = false;
      if (userName) userName.textContent = state.user.name;
      if (userEmail) userEmail.textContent = state.user.email;
    } else {
      if (loginBox) loginBox.hidden = false;
      if (userBox) userBox.hidden = true;
    }
  };

  const escapeHtml = (str) => {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  };

  const bindLoginForm = () => {
    const form = el("[data-login-form]");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("[name='name']")?.value || "";
      const email = form.querySelector("[name='email']")?.value || "";

      if (!name.trim() || !email.trim()) return;

      login(name, email);
      form.reset();

      const success = el("[data-login-success]");
      if (success) {
        success.textContent = `Welcome, ${name}! Your study journey has started.`;
        success.hidden = false;
      }
    });
  };

  const bindPaperForm = () => {
    const form = el("[data-paper-form]");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = form.querySelector("[name='title']")?.value || "";
      const subject = form.querySelector("[name='subject']")?.value || "";
      addPaper({ title, subject });
      form.reset();
    });
  };

  const bindTopicButtons = () => {
    els("[data-topic]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const topic = btn.getAttribute("data-topic");
        markTopicDone(topic);
      });
    });
  };

  const bindLogout = () => {
    const btn = el("[data-logout]");
    if (btn) btn.addEventListener("click", logout);
  };

  const autoBoostProgress = () => {
    const bar = el("[data-progress-bar]");
    if (!bar) return;

    const fill = () => {
      const target = Math.max(0, Math.min(100, state.progress || 0));
      bar.style.transition = "width 900ms cubic-bezier(.2,.8,.2,1)";
      bar.style.width = `${target}%`;
    };

    requestAnimationFrame(fill);
  };

  const initDefaultDemoData = () => {
    if (state.papers.length === 0 && !state.user) {
      state.papers = [
        {
          id: "demo-1",
          title: "Math Revision Notes",
          subject: "Math",
          createdAt: new Date().toISOString(),
        },
      ];
      state.progress = 22;
      state.points = 35;
      state.level = 1;
      saveState();
    }
  };

  initDefaultDemoData();
  refreshAuthUI();
  refreshLearningUI();
  renderSavedPapers();
  bindLoginForm();
  bindPaperForm();
  bindTopicButtons();
  bindLogout();
  autoBoostProgress();

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      state = loadState();
      refreshAuthUI();
      refreshLearningUI();
      renderSavedPapers();
    }
  });

  window.NMMoreApp = {
    state: () => ({ ...state }),
    addPaper,
    markTopicDone,
    login,
    logout,
    awardPoints,
  };
});
