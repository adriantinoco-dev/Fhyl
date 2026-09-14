const USERNAME_STORAGE_KEY = "fhyl-username";

const onboardingForm = document.querySelector("#onboarding-form");
const usernameInput = document.querySelector("#username-input");
const onboardingStatus = document.querySelector("#onboarding-status");

onboardingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();

  if (!username) {
    onboardingStatus.textContent = "Digite seu nome para continuar.";
    return;
  }

  localStorage.setItem(USERNAME_STORAGE_KEY, username);
  window.location.replace("index.html");
});
