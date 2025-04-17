// Simulate our users.json using localStorage.
if (!localStorage.getItem("users")) {
  const defaultUsers = [
    { username: "admin", password: "admin123", userId: "admin" }, // Default user
  ];
  localStorage.setItem("users", JSON.stringify(defaultUsers));
}
if (!localStorage.getItem("currentUser")) {
  localStorage.setItem(
    "currentUser",
    JSON.stringify({ username: "admin", userId: "admin" })
  );
}

// to load and save users from/to localStorage.
function loadUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

// display and clear error messages.
function showError(input, message) {
  const errorSpan = input.nextElementSibling;
  errorSpan.textContent = message;
  errorSpan.style.color = "red";
}

function clearError(input) {
  const errorSpan = input.nextElementSibling;
  errorSpan.textContent = "";
}

// LOGIN FUNCTION
async function handleLogin(event) {
  event.preventDefault(); // Prevent form submission

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  // Clear previous errors
  [usernameInput, passwordInput].forEach(clearError);

  let valid = true;
  // Validate username (at least 4 characters, no spaces)
  if (!/^[a-zA-Z0-9_]{4,}$/.test(usernameInput.value.trim())) {
    showError(
      usernameInput,
      "Username must be at least 4 characters and contain no spaces."
    );
    valid = false;
  }

  // Validate password (min 6 chars, 1 letter, 1 number)
  if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(passwordInput.value)) {
    showError(
      passwordInput,
      "Password must be at least 6 characters and include a letter and a number."
    );
    valid = false;
  }

  if (!valid) return;
  // Retrieve users from localStorage
  const users = loadUsers();
  const user = users.find(
    (u) =>
      u.username === usernameInput.value.trim() &&
      u.password === passwordInput.value
  );

  if (user) {
    c = true; // User is logged in
    localStorage.setItem("loggedin", "true");
    localStorage.setItem("currentUser", JSON.stringify(user));
    alert("Login successful!");
    window.location.href = "index.html"; // Redirect to home page
  } else {
    alert("Invalid credentials. Please try again.");
  }
}

// SIGNUP FUNCTION
async function handleSignup(event) {
  event.preventDefault(); // Prevent form submission

  const nameInput = document.getElementById("name");
  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");

  // Clear previous errors
  [
    nameInput,
    usernameInput,
    emailInput,
    passwordInput,
    confirmPasswordInput,
  ].forEach(clearError);

  let valid = true;

  // Validate name (only letters, at least 3 characters)
  if (!/^[a-zA-Z\s]{3,}$/.test(nameInput.value.trim())) {
    showError(
      nameInput,
      "Name must contain only letters and be at least 3 characters long."
    );
    valid = false;
  }

  // Validate username (at least 4 characters, no spaces)
  if (!/^[a-zA-Z0-9_]{4,}$/.test(usernameInput.value.trim())) {
    showError(
      usernameInput,
      "Username must be at least 4 characters and contain no spaces."
    );
    valid = false;
  }

  // Validate email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
    showError(emailInput, "Enter a valid email address.");
    valid = false;
  }

  // Validate password (min 6 chars, 1 letter, 1 number)
  if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(passwordInput.value)) {
    showError(
      passwordInput,
      "Password must be at least 6 characters and include a letter and a number."
    );
    valid = false;
  }

  // Confirm password match
  if (passwordInput.value !== confirmPasswordInput.value) {
    showError(confirmPasswordInput, "Passwords do not match!");
    valid = false;
  }

  if (!valid) return;

  // Retrieve current users
  const users = loadUsers();

  // Check if username already exists
  if (users.find((u) => u.username === usernameInput.value.trim())) {
    alert("Username already exists. Please choose another one.");
    return;
  }

  // Create a new user object
  const newUser = {
    username: usernameInput.value.trim(),
    password: passwordInput.value,
  };

  // Add the new user to the users list and update localStorage
  users.push(newUser);
  saveUsers(users);

  alert("Signup successful! You can now log in.");
  window.location.href = "login.html";
}

// Attach event listeners when the page loads
document.addEventListener("DOMContentLoaded", function () {
  const signupForm = document.querySelector(".signup-form");
  const loginForm = document.querySelector(".login-form");

  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
  }
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
});
