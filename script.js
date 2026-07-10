const USERS_KEY = "nomore_users";
const CURRENT_USER_KEY = "nomore_current_user";

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
}

function setCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function safeValue(value) {
  return String(value || "").trim();
}

function findUserByEmail(email) {
  const users = getUsers();
  const normalized = normalizeEmail(email);
  return users.find(user => normalizeEmail(user.email) === normalized) || null;
}

function registerUser({ fullName, email, phone, role, password, confirmPassword }) {
  fullName = safeValue(fullName);
  email = normalizeEmail(email);
  phone = safeValue(phone);
  role = safeValue(role) || "student";
  password = safeValue(password);
  confirmPassword = safeValue(confirmPassword);

  if (!fullName || !email || !phone || !role || !password || !confirmPassword) {
    return { ok: false, message: "Please fill in all fields." };
  }

  if (password !== confirmPassword) {
    return { ok: false, message: "Passwords do not match." };
  }

  if (password.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }

  const users = getUsers();
  const exists = users.some(user => normalizeEmail(user.email) === email);

  if (exists) {
    return { ok: false, message: "An account with this email already exists." };
  }

  const newUser = {
    id: Date.now().toString(),
    fullName,
    email,
    phone,
    role,
    password,
    points: 0,
    level: 1,
    upgraded: false,
    savedExams: [],
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  return { ok: true, user: newUser };
}

function loginUser(email, password, rememberMe = false) {
  email = normalizeEmail(email);
  password = safeValue(password);

  if (!email || !password) {
    return { ok: false, message: "Please enter your email and password." };
  }

  const user = findUserByEmail(email);

  if (!user || user.password !== password) {
    return { ok: false, message: "Invalid email or password." };
  }

  setCurrentUser({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    points: user.points,
    level: user.level,
    upgraded: user.upgraded,
    rememberMe: !!rememberMe
  });

  if (rememberMe) {
    localStorage.setItem("nomore_remember_me", "true");
  } else {
    localStorage.removeItem("nomore_remember_me");
  }

  return { ok: true, user };
}

function logoutUser() {
  clearCurrentUser();
  localStorage.removeItem("nomore_remember_me");
  window.location.href = "signin.html";
}

function requireAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "signin.html";
    return null;
  }
  return currentUser;
}

function updateCurrentUser(patch) {
  const current = getCurrentUser();
  if (!current) return null;

  const users = getUsers();
  const index = users.findIndex(user => user.id === current.id);
  if (index === -1) return null;

  users[index] = { ...users[index], ...patch };
  saveUsers(users);

  const updatedCurrent = {
    id: users[index].id,
    fullName: users[index].fullName,
    email: users[index].email,
    phone: users[index].phone,
    role: users[index].role,
    points: users[index].points,
    level: users[index].level,
    upgraded: users[index].upgraded
  };

  setCurrentUser(updatedCurrent);
  return updatedCurrent;
}

function saveExamPaper(exam) {
  const current = requireAuth();
  if (!current) return { ok: false, message: "Not logged in." };

  const users = getUsers();
  const index = users.findIndex(user => user.id === current.id);
  if (index === -1) return { ok: false, message: "User not found." };

  if (!Array.isArray(users[index].savedExams)) {
    users[index].savedExams = [];
  }

  users[index].savedExams.unshift({
    id: Date.now().toString(),
    title: exam.title || "Untitled Exam",
    subject: exam.subject || "",
    content: exam.content || "",
    createdAt: new Date().toISOString()
  });

  saveUsers(users);
  updateCurrentUser({});
  return { ok: true };
}

function awardPoints(points = 10) {
  const current = requireAuth();
  if (!current) return { ok: false, message: "Not logged in." };

  const users = getUsers();
  const index = users.findIndex(user => user.id === current.id);
  if (index === -1) return { ok: false, message: "User not found." };

  users[index].points = Number(users[index].points || 0) + Number(points || 0);
  users[index].level = Math.max(1, Math.floor(users[index].points / 100) + 1);

  saveUsers(users);
  updateCurrentUser({});
  return { ok: true, points: users[index].points, level: users[index].level };
}

function initSignupPage() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const result = registerUser({
      fullName: form.fullName.value,
      email: form.email.value,
      phone: form.phone.value,
      role: form.role.value,
      password: form.password.value,
      confirmPassword: form.confirmPassword.value
    });

    if (!result.ok) {
      alert(result.message);
      return;
    }

    alert("Account created successfully. Please sign in.");
    window.location.href = "signin.html";
  });
}

function initSigninPage() {
  const form = document.getElementById("signinForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const result = loginUser(
      form.loginEmail.value,
      form.loginPassword.value,
      form.rememberMe ? form.rememberMe.checked : false
    );

    if (!result.ok) {
      alert(result.message);
      return;
    }

    alert(`Welcome back, ${result.user.fullName}`);
    window.location.href = "dashboard.html";
  });
}

function initDashboardPage() {
  const current = requireAuth();
  if (!current) return;

  const nameTarget = document.querySelector("[data-user-name]");
  const emailTarget = document.querySelector("[data-user-email]");
  const pointsTarget = document.querySelector("[data-user-points]");
  const levelTarget = document.querySelector("[data-user-level]");
  const roleTarget = document.querySelector("[data-user-role]");

  if (nameTarget) nameTarget.textContent = current.fullName;
  if (emailTarget) emailTarget.textContent = current.email;
  if (pointsTarget) pointsTarget.textContent = current.points ?? 0;
  if (levelTarget) levelTarget.textContent = current.level ?? 1;
  if (roleTarget) roleTarget.textContent = current.role ?? "student";

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }
}

function initSavedExamsPage() {
  const current = requireAuth();
  if (!current) return;

  const users = getUsers();
  const user = users.find(u => u.id === current.id);
  const list = document.getElementById("savedExamsList");
  if (!list) return;

  const exams = Array.isArray(user?.savedExams) ? user.savedExams : [];
  if (!exams.length) {
    list.innerHTML = "<p>No saved exam papers yet.</p>";
    return;
  }

  list.innerHTML = exams.map(exam => `
    <article class="card">
      <h3>${exam.title}</h3>
      <p>${exam.subject || "No subject"}</p>
      <small>${new Date(exam.createdAt).toLocaleString()}</small>
    </article>
  `).join("");
}

function initUpgradePage() {
  const current = requireAuth();
  if (!current) return;

  const buttons = document.querySelectorAll("[data-upgrade-plan]");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      updateCurrentUser({ upgraded: true });
      alert("Upgrade activated.");
      window.location.href = "dashboard.html";
    });
  });
}

function initGeneratorPage() {
  const current = requireAuth();
  if (!current) return;

  const form = document.getElementById("examGeneratorForm");
  const output = document.getElementById("generatedExamOutput");
  const saveBtn = document.getElementById("saveGeneratedExam");

  if (!form || !output) return;

  let lastGenerated = null;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = form.examTitle?.value || "Generated Exam";
    const subject = form.subject?.value || "";
    const topic = form.topic?.value || "";
    const level = form.difficulty?.value || "Medium";
    const count = form.questionCount?.value || "10";

    lastGenerated = {
      title,
      subject,
      content: `Exam: ${title}
Subject: ${subject}
Topic: ${topic}
Level: ${level}
Questions: ${count}`
    };

    output.textContent = lastGenerated.content;
  });

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (!lastGenerated) {
        alert("Generate an exam first.");
        return;
      }
      saveExamPaper(lastGenerated);
      alert("Exam saved successfully.");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initSignupPage();
  initSigninPage();
  initDashboardPage();
  initSavedExamsPage();
  initUpgradePage();
  initGeneratorPage();
});
