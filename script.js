/* ============================================================
   NIMBUS — Dynamic Weather-Reactive Live Hub Script
   Open-Meteo Integration • Weather Theming • Error Handling
   ============================================================ */

/* ------------------------------------------------------------
   1. WEATHER CODE TO THEME MAPPING
   Maps WMO Weather Interpretation Codes to friendly labels,
   reactive theme names (sunny, rain, storm, snow, cloudy),
   and weather visual icons.
   ------------------------------------------------------------ */
const WEATHER_CODE_MAP = {
  // Clear & Sunny
  0:  { label: "Clear Sky",              theme: "sunny",  icon: "☀️" },
  1:  { label: "Mainly Clear",           theme: "sunny",  icon: "🌤️" },

  // Cloudy & Overcast
  2:  { label: "Partly Cloudy",          theme: "cloudy", icon: "⛅" },
  3:  { label: "Overcast",               theme: "cloudy", icon: "☁️" },
  45: { label: "Foggy",                  theme: "cloudy", icon: "🌫️" },
  48: { label: "Depositing Rime Fog",    theme: "cloudy", icon: "🌫️" },

  // Drizzle & Rain
  51: { label: "Light Drizzle",          theme: "rain",   icon: "🌦️" },
  53: { label: "Moderate Drizzle",       theme: "rain",   icon: "🌧️" },
  55: { label: "Dense Drizzle",          theme: "rain",   icon: "🌧️" },
  61: { label: "Slight Rain",            theme: "rain",   icon: "🌧️" },
  63: { label: "Moderate Rain",          theme: "rain",   icon: "🌧️" },
  65: { label: "Heavy Rain",             theme: "rain",   icon: "🌧️" },
  80: { label: "Slight Rain Showers",    theme: "rain",   icon: "🌦️" },
  81: { label: "Moderate Rain Showers",  theme: "rain",   icon: "🌧️" },
  82: { label: "Violent Rain Showers",   theme: "rain",   icon: "⛈️" },

  // Snow & Freezing Conditions
  56: { label: "Light Freezing Drizzle", theme: "snow",   icon: "🌨️" },
  57: { label: "Dense Freezing Drizzle", theme: "snow",   icon: "🌨️" },
  66: { label: "Light Freezing Rain",    theme: "snow",   icon: "🌨️" },
  67: { label: "Heavy Freezing Rain",    theme: "snow",   icon: "🌨️" },
  71: { label: "Slight Snow Fall",       theme: "snow",   icon: "❄️" },
  73: { label: "Moderate Snow Fall",     theme: "snow",   icon: "❄️" },
  75: { label: "Heavy Snow Fall",        theme: "snow",   icon: "❄️" },
  77: { label: "Snow Grains",            theme: "snow",   icon: "❄️" },
  85: { label: "Slight Snow Showers",    theme: "snow",   icon: "🌨️" },
  86: { label: "Heavy Snow Showers",     theme: "snow",   icon: "🌨️" },

  // Thunderstorm
  95: { label: "Thunderstorm",           theme: "storm",  icon: "⛈️" },
  96: { label: "Thunderstorm with Hail", theme: "storm",  icon: "⛈️" },
  99: { label: "Severe Hailstorm",       theme: "storm",  icon: "⛈️" }
};

/* ------------------------------------------------------------
   2. DOM ELEMENT REFERENCES
   Grabbing key HTML elements by their ID for easy access.
   ------------------------------------------------------------ */
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const clearBtn = document.getElementById("clear-btn");
const searchBtn = document.getElementById("search-btn");
const statusBanner = document.getElementById("status-banner");

const weatherDisplay = document.getElementById("weather-display");
const loadingState = document.getElementById("loading-state");
const loadingText = document.getElementById("loading-text");
const weatherCard = document.getElementById("weather-card");
const forecastSection = document.querySelector(".forecast-section");

const cityNameEl = document.getElementById("city-name");
const countryNameEl = document.getElementById("country-name");
const currentDateEl = document.getElementById("current-date");
const conditionIconEl = document.getElementById("condition-icon");
const temperatureEl = document.getElementById("temperature");
const conditionTextEl = document.getElementById("condition-text");
const tempMaxEl = document.getElementById("temp-max");
const tempMinEl = document.getElementById("temp-min");

const humidityValueEl = document.getElementById("humidity-value");
const humidityFillEl = document.getElementById("humidity-fill");
const windValueEl = document.getElementById("wind-value");
const windDescriptionEl = document.getElementById("wind-description");

const forecastStrip = document.getElementById("forecast-strip");
const themePills = document.querySelectorAll(".theme-pill");

// Space Error Screen Elements
const spaceScreen = document.getElementById("space-screen");
const searchedCityDisplay = document.getElementById("searched-city-display");
const tryAgainBtn = document.getElementById("try-again-btn");

/* ------------------------------------------------------------
   3. APPLICATION STATE
   ------------------------------------------------------------ */
let currentCityName = "London";

/* ------------------------------------------------------------
   4. HELPER FUNCTIONS
   ------------------------------------------------------------ */

/**
 * Returns weather label, theme, and icon for any WMO code.
 * If code is not recognized, defaults gracefully to sunny clear sky.
 */
function getWeatherDetails(code) {
  if (WEATHER_CODE_MAP[code]) {
    return WEATHER_CODE_MAP[code];
  }
  return { label: "Clear Sky", theme: "sunny", icon: "☀️" };
}

/**
 * Applies a weather theme (sunny, rain, storm, snow, cloudy) to the page.
 * Sets data-theme on body so CSS variables smoothly animate over 1.2s.
 */
function applyWeatherTheme(themeName) {
  // Update body theme attribute
  document.body.dataset.theme = themeName;

  // Highlight corresponding theme preview pill
  themePills.forEach((pill) => {
    if (pill.dataset.themeTarget === themeName) {
      pill.classList.add("active");
    } else {
      pill.classList.remove("active");
    }
  });
}

/**
 * Converts ISO date string (e.g. "2026-11-05") into friendly full date.
 */
function formatFullDate(dateString) {
  try {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  } catch (e) {
    return dateString;
  }
}

/**
 * Converts date string into a 3-letter weekday abbreviation (e.g. "Fri").
 * Returns "Today" for index 0.
 */
function formatForecastDay(dateString, index) {
  if (index === 0) return "Today";
  try {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } catch (e) {
    return "Day " + (index + 1);
  }
}

/**
 * Converts date string into month + day (e.g. "Nov 6").
 */
function formatForecastShortDate(dateString) {
  try {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch (e) {
    return "";
  }
}

/**
 * Returns a simple human-readable description for wind speed.
 */
function describeWindSpeed(speedKmh) {
  if (speedKmh < 5) return "Calm air";
  if (speedKmh < 15) return "Gentle breeze";
  if (speedKmh < 28) return "Moderate wind";
  if (speedKmh < 40) return "Fresh breeze";
  return "High winds";
}

/**
 * Displays a friendly banner message (error or warning).
 */
function showStatusBanner(message, type = "error") {
  statusBanner.textContent = message;
  statusBanner.className = `status-banner ${type}`;
  statusBanner.classList.remove("hidden");
}

/**
 * Clears and hides the status banner.
 */
function clearStatusBanner() {
  statusBanner.textContent = "";
  statusBanner.classList.add("hidden");
}

/**
 * Triggers a shake animation on search input to highlight empty or invalid input.
 */
function shakeSearchForm() {
  searchForm.classList.remove("shake-animation");
  // Force a browser reflow to restart the animation
  void searchForm.offsetWidth;
  searchForm.classList.add("shake-animation");
  setTimeout(() => {
    searchForm.classList.remove("shake-animation");
  }, 500);
}

/**
 * Shows the loading state with a spinner while fetching weather data.
 */
function showLoadingState(cityName) {
  clearStatusBanner();
  loadingText.textContent = `Scanning the atmosphere for ${cityName}...`;
  loadingState.classList.remove("hidden");
  weatherCard.classList.add("hidden");
  forecastSection.classList.add("hidden");
  searchBtn.disabled = true;
}

/**
 * Hides the loading spinner and restores the weather card visibility.
 */
function hideLoadingState() {
  loadingState.classList.add("hidden");
  weatherCard.classList.remove("hidden");
  forecastSection.classList.remove("hidden");
  searchBtn.disabled = false;
}

/**
 * Shows the full-screen pure CSS space page when a city cannot be found.
 */
function showSpaceError(cityName) {
  hideLoadingState();
  searchedCityDisplay.textContent = `"${cityName}"`;
  spaceScreen.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // Prevent background scrolling
}

/**
 * Closes the space error page and returns the user to the search view.
 */
function hideSpaceError() {
  spaceScreen.classList.add("hidden");
  document.body.style.overflow = "auto";
  cityInput.focus();
  cityInput.select();
}

/* ------------------------------------------------------------
   5. WEATHER RENDERING
   ------------------------------------------------------------ */

/**
 * Populates current weather data (city, country, temp, condition, humidity, wind).
 */
function renderCurrentWeather(geoResult, forecastData) {
  const current = forecastData.current;
  const daily = forecastData.daily;

  // City and Country
  cityNameEl.textContent = geoResult.name;
  countryNameEl.textContent = geoResult.country ? geoResult.country : geoResult.country_code || "";

  // Date
  if (current.time) {
    const todayStr = current.time.split("T")[0];
    currentDateEl.textContent = formatFullDate(todayStr);
  } else {
    currentDateEl.textContent = "Live";
  }

  // Weather code details & theme update
  const weatherInfo = getWeatherDetails(current.weather_code);
  conditionIconEl.textContent = weatherInfo.icon;
  conditionTextEl.textContent = weatherInfo.label;
  applyWeatherTheme(weatherInfo.theme);

  // Temperature (rounded to nearest integer)
  const currentTemp = Math.round(current.temperature_2m);
  temperatureEl.textContent = currentTemp;

  // Today's High and Low
  if (daily && daily.temperature_2m_max && daily.temperature_2m_min) {
    tempMaxEl.textContent = `${Math.round(daily.temperature_2m_max[0])}°`;
    tempMinEl.textContent = `${Math.round(daily.temperature_2m_min[0])}°`;
  } else {
    tempMaxEl.textContent = "--°";
    tempMinEl.textContent = "--°";
  }

  // Humidity & progress bar
  const humidity = Math.round(current.relative_humidity_2m);
  humidityValueEl.textContent = humidity;
  humidityFillEl.style.width = `${Math.min(Math.max(humidity, 0), 100)}%`;

  // Wind speed & description
  const windSpeed = Math.round(current.wind_speed_10m);
  windValueEl.textContent = windSpeed;
  windDescriptionEl.textContent = describeWindSpeed(windSpeed);
}

/**
 * Builds and renders the 5-day forecast cards from Open-Meteo daily data.
 */
function renderForecastStrip(dailyData) {
  forecastStrip.innerHTML = "";

  if (!dailyData || !dailyData.time) return;

  // Show up to 5 days
  const daysCount = Math.min(5, dailyData.time.length);

  for (let i = 0; i < daysCount; i++) {
    const dateStr = dailyData.time[i];
    const code = dailyData.weather_code[i];
    const maxTemp = Math.round(dailyData.temperature_2m_max[i]);
    const minTemp = Math.round(dailyData.temperature_2m_min[i]);
    const weatherInfo = getWeatherDetails(code);

    const dayCard = document.createElement("article");
    dayCard.className = "forecast-card";
    dayCard.innerHTML = `
      <span class="forecast-day">${formatForecastDay(dateStr, i)}</span>
      <span class="forecast-date">${formatForecastShortDate(dateStr)}</span>
      <span class="forecast-icon" role="img" aria-label="${weatherInfo.label}">${weatherInfo.icon}</span>
      <span class="forecast-condition" title="${weatherInfo.label}">${weatherInfo.label}</span>
      <div class="forecast-temps">
        <span class="forecast-max">${maxTemp}°</span>
        <span class="forecast-min">${minTemp}°</span>
      </div>
    `;

    forecastStrip.appendChild(dayCard);
  }
}

/* ------------------------------------------------------------
   6. API DATA FETCHING (Open-Meteo)
   ------------------------------------------------------------ */

/**
 * Fetches coordinates from Open-Meteo Geocoding, then fetches weather.
 * Handles: empty input, offline status, loading state, and city not found.
 */
async function fetchWeatherData(cityName) {
  const trimmedCity = cityName.trim();

  // 1. Handle Empty Input
  if (!trimmedCity) {
    shakeSearchForm();
    showStatusBanner("Please enter a city name first!", "warning");
    cityInput.focus();
    return;
  }

  // 2. Handle Offline / No Internet
  if (!navigator.onLine) {
    showStatusBanner("No internet connection detected. Please check your network.", "error");
    return;
  }

  // Show loading spinner
  showLoadingState(trimmedCity);

  try {
    // 3. Geocoding API call
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedCity)}&count=1&language=en&format=json`;
    const geoResponse = await fetch(geocodingUrl);

    if (!geoResponse.ok) {
      throw new Error(`Geocoding failed with status ${geoResponse.status}`);
    }

    const geoData = await geoResponse.json();

    // 4. City Not Found -> Trigger 404 Space Page
    if (!geoData.results || geoData.results.length === 0) {
      showSpaceError(trimmedCity);
      return;
    }

    const location = geoData.results[0];
    const { latitude, longitude } = location;

    // 5. Forecast API call
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const forecastResponse = await fetch(forecastUrl);

    if (!forecastResponse.ok) {
      throw new Error(`Forecast failed with status ${forecastResponse.status}`);
    }

    const forecastData = await forecastResponse.json();

    // 6. Render Data to UI
    renderCurrentWeather(location, forecastData);
    renderForecastStrip(forecastData.daily);

    currentCityName = location.name;
    hideLoadingState();
    clearStatusBanner();

  } catch (error) {
    hideLoadingState();
    console.error("Weather fetch error:", error);

    // Differentiate network failure from other errors
    if (!navigator.onLine || error.message.includes("Failed to fetch") || error.name === "TypeError") {
      showStatusBanner("Unable to reach the weather server. Please check your connection.", "error");
    } else {
      showStatusBanner("An unexpected error occurred while fetching weather data. Please try again.", "error");
    }
  }
}

/* ------------------------------------------------------------
   7. EVENT LISTENERS & INITIALIZATION
   ------------------------------------------------------------ */

/**
 * Handles the search form submission.
 */
function handleSearch(event) {
  event.preventDefault();
  fetchWeatherData(cityInput.value);
}

/**
 * Controls showing and hiding the clear button inside the search input.
 */
function handleInputChange() {
  if (cityInput.value.length > 0) {
    clearBtn.classList.remove("hidden");
  } else {
    clearBtn.classList.add("hidden");
  }
}

/**
 * Clears the search input and restores focus.
 */
function handleClearInput() {
  cityInput.value = "";
  clearBtn.classList.add("hidden");
  cityInput.focus();
}

/**
 * Handles manual theme preview button clicks.
 */
function handleThemePillClick(event) {
  const targetTheme = event.currentTarget.dataset.themeTarget;
  if (targetTheme) {
    applyWeatherTheme(targetTheme);
  }
}

/**
 * Initializes app event listeners and loads default city on startup.
 */
function initApp() {
  // Search form submit
  searchForm.addEventListener("submit", handleSearch);

  // Search input events (clear button toggle & enter key)
  cityInput.addEventListener("input", handleInputChange);
  clearBtn.addEventListener("click", handleClearInput);

  // Space screen "Try again" button
  tryAgainBtn.addEventListener("click", hideSpaceError);

  // Keyboard shortcut: Escape key closes space error page
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !spaceScreen.classList.contains("hidden")) {
      hideSpaceError();
    }
  });

  // Manual theme preview switcher pills
  themePills.forEach((pill) => {
    pill.addEventListener("click", handleThemePillClick);
  });

  // Listen to browser online/offline status
  window.addEventListener("online", () => {
    clearStatusBanner();
    showStatusBanner("Back online! Refreshing weather...", "warning");
    setTimeout(() => {
      clearStatusBanner();
      fetchWeatherData(currentCityName);
    }, 1500);
  });

  window.addEventListener("offline", () => {
    showStatusBanner("You are currently offline. Live updates are paused.", "error");
  });

  // Load default showcase city on first visit
  fetchWeatherData(currentCityName);
}

// Start the application when DOM is ready
document.addEventListener("DOMContentLoaded", initApp);
