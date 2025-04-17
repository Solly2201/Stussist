let c = false; // Default: Not logged in

// Check login status on page load
document.addEventListener("DOMContentLoaded", function () {
  c = localStorage.getItem("loggedin") === "true"; // Get stored value

  if (!c) {
    window.location.href = "../login.html"; // Redirect if not logged in
  }
});

// Logout function
function logout() {
  c = false;
  localStorage.removeItem("loggedin");
  window.location.href = "../login.html";
}
