const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

const forecastEl = document.getElementById('forecast');
const statusEl = document.getElementById('status');
const refreshBtn = document.getElementById('refresh');

const cityForm = document.getElementById('city-form');
const cityInput = document.getElementById('city-input');
const suggestionsEl = document.getElementById('suggestions');
const errorEl = document.getElementById('error');
const noCitiesEl = document.querySelector('.no-cities');

let state = JSON.parse(localStorage.getItem('weather-state')) || {
  cities: []
};

function saveState() {
  localStorage.setItem('weather-state', JSON.stringify(state));
}

async function fetchWeather(lat, lon) {
  const url =
    `${WEATHER_API}?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,wind_speed_10m_max` +
    `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка загрузки погоды');
  return res.json();
}

async function searchCity(query) {
  const res = await fetch(`${GEO_API}?name=${query}&count=5&language=ru`);
  if (!res.ok) throw new Error('Ошибка поиска города');
  return res.json();
}

function setStatus(text) {
  statusEl.textContent = text;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

async function loadCityWeather(city, index) {
  const cityCard = document.createElement('div');
  cityCard.className = 'city-card';

  cityCard.innerHTML = `
    <div class="city-header">
      <div class="city-name">${city.name}</div>
      <button class="delete-btn">✖</button>
    </div>
    <div class="days">Загрузка...</div>
  `;

  forecastEl.appendChild(cityCard);

  cityCard.querySelector('.delete-btn').onclick = () => {
    state.cities.splice(index, 1);
    saveState();
    renderAllCities();
  };

  try {
    const data = await fetchWeather(city.lat, city.lon);
    const daysEl = cityCard.querySelector('.days');
    daysEl.innerHTML = '';

    const daysToShow = city.name === 'Текущее местоположение' ? 3 : 7;

    for (let i = 0; i < daysToShow; i++) {
      const dayDate = data.daily.time[i];
      const isToday = i === 0 ? ' (Сегодня)' : '';

      const day = document.createElement('div');
      day.className = 'day-card';

      day.innerHTML = `
        <div class="date">${formatDate(dayDate)}${isToday}</div>
        <div class="temp">
          ${data.daily.temperature_2m_min[i]}° /
          ${data.daily.temperature_2m_max[i]}°
        </div>
        <div class="details">
          <div>Осадки: ${data.daily.precipitation_sum[i]} мм</div>
          <div>Ветер: ${data.daily.wind_speed_10m_max[i]} м/с</div>
        </div>
      `;

      daysEl.appendChild(day);
    }
  } catch (e) {
    const daysEl = cityCard.querySelector('.days');
    daysEl.textContent = 'Ошибка загрузки погоды';
  }
}

function renderAllCities() {
  forecastEl.innerHTML = '';

  if (state.cities.length === 0) {
    noCitiesEl.style.display = 'block';
    return;
  } else {
    noCitiesEl.style.display = 'none';
  }

  state.cities.forEach((city, index) => {
    loadCityWeather(city, index);
  });
}

cityInput.addEventListener('input', async () => {
  suggestionsEl.innerHTML = '';
  errorEl.textContent = '';

  if (cityInput.value.length < 2) {
    suggestionsEl.style.display = 'none';
    return;
  }

  const data = await searchCity(cityInput.value);
  if (!data.results || data.results.length === 0) {
    suggestionsEl.style.display = 'none';
    return;
  }

  data.results.forEach(city => {
    const div = document.createElement('div');
    div.textContent = city.name;
    div.onclick = () => {
      cityInput.value = city.name;
      cityInput.dataset.lat = city.latitude;
      cityInput.dataset.lon = city.longitude;
      suggestionsEl.innerHTML = '';
      suggestionsEl.style.display = 'none';
      errorEl.textContent = '';
    };
    suggestionsEl.appendChild(div);
  });

  suggestionsEl.style.display = 'block';
});

cityForm.addEventListener('submit', e => {
  e.preventDefault();

  const lat = cityInput.dataset.lat;
  const lon = cityInput.dataset.lon;

  if (!lat || !lon) {
    errorEl.textContent = 'Введите корректный город или выберите город из списка предложенных';
    return;
  }

  const city = {
    name: cityInput.value,
    lat,
    lon
  };

  state.cities.push(city);
  saveState();
  renderAllCities();

  cityInput.value = '';
  cityInput.dataset.lat = '';
  cityInput.dataset.lon = '';
  errorEl.textContent = '';
});

cityInput.addEventListener('input', () => {
  errorEl.textContent = '';
});

refreshBtn.addEventListener('click', () => {
  renderAllCities();
});

// показываем сообщение, если нет городов
if (state.cities.length === 0) {
  noCitiesEl.style.display = 'block';
}

// запрашиваем геопозицию один раз при первом запуске
if (navigator.geolocation && state.cities.length === 0) {
  setStatus('Запрашиваем геопозицию...');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('координаты пользователя:', position.coords.latitude, position.coords.longitude);

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      const currentCity = { name: 'Текущее местоположение', lat, lon };
      state.cities.push(currentCity);
      saveState();

      noCitiesEl.style.display = 'none';
      setStatus('');
      renderAllCities();
    },
    (error) => {
      statusEl.textContent = 'Геолокация недоступна, введите город вручную';
      noCitiesEl.style.display = 'block';
    }
  );
} else {
  renderAllCities();
}