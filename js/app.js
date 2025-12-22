const loader = document.getElementById("loader");
const errorBlock = document.getElementById("error");
const cityForm = document.getElementById("cityForm");
const cityInput = document.getElementById("cityInput");
const cityError = document.getElementById("cityError");
const suggestions = document.getElementById("suggestions");
const citiesList = document.getElementById("citiesList");
const weatherBlock = document.getElementById("weather");
const refreshBtn = document.getElementById("refreshBtn");
const addCityBtn = document.getElementById("addCityBtn");

// состояния
let cities = JSON.parse(localStorage.getItem("cities")) || [];
let currentCity = null;

// хелперы
function showLoader(show) {
  loader.classList.toggle("hidden", !show);
}

function showError(message) {
  errorBlock.textContent = message;
  errorBlock.classList.remove("hidden");
}

function clearError() {
  errorBlock.classList.add("hidden");
}

function saveCities() {
  localStorage.setItem("cities", JSON.stringify(cities));
}

// api
async function getCitySuggestions(query) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=ru`
  );
  const data = await res.json();
  return data.results || [];
}

async function getWeather(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
  );
  return await res.json();
}

// отрисовка
function renderCities() {
  citiesList.innerHTML = "";

  cities.forEach(city => {
    const div = document.createElement("div");
    div.className = "city-card";
    div.textContent = city.name;
    div.onclick = () => selectCity(city);
    citiesList.appendChild(div);
  });
}

function renderWeather(data) {
  weatherBlock.innerHTML = "";

  for (let i = 0; i < 3; i++) {
    const day = document.createElement("div");
    day.className = "weather-day";
    day.innerHTML = `
      <h3>${data.daily.time[i]}</h3>
      <p>Макс: ${data.daily.temperature_2m_max[i]}°C</p>
      <p>Мин: ${data.daily.temperature_2m_min[i]}°C</p>
    `;
    weatherBlock.appendChild(day);
  }
}

// подгрузка погоды
async function loadWeather(city) {
  showLoader(true);
  clearError();

  try {
    const data = await getWeather(city.lat, city.lon);
    renderWeather(data);
  } catch {
    showError("Ошибка при загрузке погоды");
  } finally {
    showLoader(false);
  }
}

function selectCity(city) {
  currentCity = city;
  loadWeather(city);
}

// события
refreshBtn.onclick = () => {
  if (currentCity) loadWeather(currentCity);
};

addCityBtn.onclick = () => {
  if (!currentCity) {
    cityError.textContent = "Выберите город из списка";
    return;
  }

  cities.push(currentCity);
  saveCities();
  renderCities();
  cityForm.classList.add("hidden");
  cityError.textContent = "";
};

cityInput.oninput = async () => {
  const query = cityInput.value.trim();
  suggestions.innerHTML = "";
  cityError.textContent = "";

  if (!query) return;

  const results = await getCitySuggestions(query);

  results.forEach(city => {
    const li = document.createElement("li");
    li.textContent = `${city.name}, ${city.country}`;
    li.onclick = () => {
      currentCity = {
        name: city.name,
        lat: city.latitude,
        lon: city.longitude
      };
      cityInput.value = city.name;
      suggestions.innerHTML = "";
    };
    suggestions.appendChild(li);
  });
};

// инитка
function init() {
  if (cities.length > 0) {
    renderCities();
    selectCity(cities[0]);
  } else {
    navigator.geolocation.getCurrentPosition(
      position => {
        const city = {
          name: "Текущее местоположение",
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        cities.push(city);
        saveCities();
        renderCities();
        selectCity(city);
      },
      () => {
        cityForm.classList.remove("hidden");
      }
    );
  }
}

init();