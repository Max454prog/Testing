// ============================================================
// ЧАТ-ПОМОЩНИК ДЛЯ НОВИЧКОВ («Искра»)
// ============================================================
// Что делает:
//  • Кнопка сверху экрана входа открывает мини-чат.
//  • Помогает зарегистрироваться: спрашивает никнейм, email, пароль
//    (может сгенерировать пароль сам), сам заполняет и отправляет
//    настоящую форму (переиспользует registerUser/loginUser из app.js —
//    никакой отдельной логики аккаунтов тут нет).
//  • Помогает со входом и отвечает на свободные вопросы по шаблонам.
//  • Понимает "покажи погоду" — тянет реальную погоду с Open-Meteo
//    (бесплатно, без ключа) по геолокации или названию города.
//  • Пользователь выбирает пол помощника и придумывает ему имя.
//  • Проверяет email на "фейковость" (временные почтовые домены,
//    мусорные адреса) и фильтрует мат. Нарушения копятся как "страйки"
//    в Firestore (по анонимному id устройства) — после порога чат
//    блокируется ("бан"). Это работает ДО входа пользователя, поэтому
//    в Firestore Security Rules нужно разрешить чтение/запись коллекции
//    "assistantModeration" неаутентифицированным клиентам, например:
//      match /assistantModeration/{deviceId} {
//        allow read: if true;
//        allow write: if request.resource.data.keys().hasOnly(['strikes','banned','reason','updatedAt'])
//                      && request.resource.data.strikes is int
//                      && request.resource.data.strikes <= 3;
//      }
//
// ВАЖНО про "настоящий ИИ": сейчас никакой внешний AI API не подключён —
// ключ нельзя было бы безопасно хранить в клиентском коде без бэкенд-прокси
// (см. функцию askRemoteAI ниже — это готовая точка расширения на будущее,
// когда появится сервер/Cloud Function-прокси к вашему AI-провайдеру).
// Сейчас помощник отвечает по заранее прописанным сценариям и шаблонам —
// этого достаточно для помощи со входом/регистрацией и лёгкой болтовни.

import { doc, getDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  db, auth,
  authForm, emailInput, passwordInput, nicknameInput, regPhoneInput,
  loginBtn, registerBtn,
  setLoginMode, displayAuthError, clearAuthError, escapeHtml
} from './app.js';

// ---------- DOM ----------
const fab = document.getElementById('assistant-fab');
const panel = document.getElementById('assistant-panel');
const closeBtn = document.getElementById('assistant-close');
const avatarEl = document.getElementById('assistant-avatar');
const nameLabelEl = document.getElementById('assistant-name-label');
const statusLabelEl = document.getElementById('assistant-status-label');
const bodyEl = document.getElementById('assistant-body');
const messagesEl = document.getElementById('assistant-messages');
const quickRepliesEl = document.getElementById('assistant-quick-replies');
const inputForm = document.getElementById('assistant-input-form');
const inputEl = document.getElementById('assistant-input');
const sendBtn = document.getElementById('assistant-send-btn');

if (!fab || !panel) {
  // Разметки помощника нет на странице — тихо выходим, ничего не ломаем.
  console.warn('[assistant] Разметка помощника не найдена, модуль неактивен.');
}

// ---------- Идентификатор устройства (для анти-спам/бан системы) ----------
function getDeviceId() {
  let id = localStorage.getItem('iskra_device_id');
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : 'dev-' + Date.now() + '-' + Math.random().toString(16).slice(2));
    localStorage.setItem('iskra_device_id', id);
  }
  return id;
}
const deviceId = getDeviceId();

// ---------- Профиль самого помощника (имя/пол выбирает пользователь) ----------
function loadAssistantProfile() {
  try { return JSON.parse(localStorage.getItem('iskra_assistant_profile') || 'null'); }
  catch { return null; }
}
function saveAssistantProfile(profile) {
  localStorage.setItem('iskra_assistant_profile', JSON.stringify(profile));
}
let assistantProfile = loadAssistantProfile(); // { gender: 'boy'|'girl', name: string } | null

function applyAssistantIdentity() {
  if (assistantProfile) {
    avatarEl.textContent = assistantProfile.gender === 'girl' ? '👧' : '🧑';
    nameLabelEl.textContent = assistantProfile.name;
  } else {
    avatarEl.textContent = '🤖';
    nameLabelEl.textContent = 'Помощник';
  }
}

// ============================================================
// Модерация: фейковые email и мат
// ============================================================
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com','tempmail.com','temp-mail.org','10minutemail.com','guerrillamail.com',
  'yopmail.com','trashmail.com','throwawaymail.com','fakeinbox.com','sharklasers.com',
  'getnada.com','discard.email','maildrop.cc','dropmail.me','moakt.com','mytemp.email',
  'einrot.com','spam4.me','mailnesia.com','burnermail.io','emailondeck.com','tempinbox.com',
  'crazymailing.com','mohmal.com','1secmail.com','tmpmail.net','tempr.email'
]);
const SUSPICIOUS_PATTERNS = [
  /^test(er)?\d*$/i, /^fake\d*$/i, /^asdf+\d*$/i, /^qwerty\d*$/i, /^123+$/i,
  /^(x|a|q){3,}$/i, /^no(reply|thanks)?$/i, /^aaa+$/i, /^zzz+$/i
];

function validateEmailShape(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
function checkEmail(email) {
  const clean = email.trim().toLowerCase();
  if (!validateEmailShape(clean)) return { ok: false, reason: 'format' };
  const [local, domain] = clean.split('@');
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return { ok: false, reason: 'disposable' };
  if (SUSPICIOUS_PATTERNS.some(re => re.test(local)) || SUSPICIOUS_PATTERNS.some(re => re.test(domain.split('.')[0]))) {
    return { ok: false, reason: 'suspicious' };
  }
  return { ok: true };
}

// Обычный фильтр обсценной лексики (по корням слов) — стандартная практика
// для модерации пользовательского ввода, список намеренно не исчерпывающий.
const PROFANITY_SEVERE = /(хуй|хуя|хуе|нахуй|похуй|пизд|ебат|ебал|ебан|ёбан|заеб|наеб|отъеб|съеб|долбоеб|долбоёб|уеб|уёб)/i;
const PROFANITY_MILD = /(бляд|сука|мудак|гандон|мразь|идиот|дебил|тупиц|придурок)/i;

function checkProfanity(text) {
  const clean = text.toLowerCase().replace(/[^а-яё]/gi, '');
  if (PROFANITY_SEVERE.test(clean)) return 'severe';
  if (PROFANITY_MILD.test(clean)) return 'mild';
  return null;
}

// ---------- Firestore: страйки / бан ----------
let moderationState = { strikes: 0, banned: false, reason: '' };

async function loadModerationState() {
  try {
    const snap = await getDoc(doc(db, 'assistantModeration', deviceId));
    if (snap.exists()) moderationState = { strikes: 0, banned: false, reason: '', ...snap.data() };
  } catch (e) {
    console.warn('[assistant] Не удалось прочитать статус модерации:', e);
  }
  return moderationState;
}
async function persistModeration(patch) {
  moderationState = { ...moderationState, ...patch };
  try {
    await setDoc(doc(db, 'assistantModeration', deviceId), {
      strikes: moderationState.strikes,
      banned: moderationState.banned,
      reason: moderationState.reason || '',
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn('[assistant] Не удалось сохранить статус модерации:', e);
  }
}
async function addStrike(reason) {
  const strikes = (moderationState.strikes || 0) + 1;
  const banned = strikes >= 3;
  await persistModeration({ strikes, banned, reason: banned ? reason : moderationState.reason });
  return moderationState;
}
async function banNow(reason) {
  await persistModeration({ banned: true, reason, strikes: Math.max(moderationState.strikes || 0, 3) });
  return moderationState;
}

function showBanScreen() {
  panel.classList.add('locked');
  statusLabelEl.textContent = 'заблокирован';
  messagesEl.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'assistant-ban-notice';
  div.innerHTML = `<strong>Доступ к помощнику ограничен</strong>Слишком много нарушений (нецензурная лексика или заведомо ложные данные). Формой входа и регистрации сверху вы всё ещё можете пользоваться как обычно.`;
  messagesEl.appendChild(div);
  setQuickReplies([]);
}

// ============================================================
// Рендер чата
// ============================================================
function scrollChatToBottom() {
  requestAnimationFrame(() => { bodyEl.scrollTop = bodyEl.scrollHeight; });
}
function addUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'assistant-msg from-user';
  row.innerHTML = `<div class="assistant-msg-bubble"></div>`;
  row.querySelector('.assistant-msg-bubble').textContent = text;
  messagesEl.appendChild(row);
  scrollChatToBottom();
}
function addBotMessageHTML(html) {
  const row = document.createElement('div');
  row.className = 'assistant-msg from-bot';
  const av = assistantProfile ? (assistantProfile.gender === 'girl' ? '👧' : '🧑') : '🤖';
  row.innerHTML = `<div class="assistant-msg-avatar">${av}</div><div class="assistant-msg-bubble">${html}</div>`;
  messagesEl.appendChild(row);
  scrollChatToBottom();
}
function addBotMessage(text) {
  addBotMessageHTML(escapeHtml(text));
}
function botSay(text, delay = 450) {
  return new Promise(resolve => {
    const typingRow = document.createElement('div');
    typingRow.className = 'assistant-msg from-bot';
    const av = assistantProfile ? (assistantProfile.gender === 'girl' ? '👧' : '🧑') : '🤖';
    typingRow.innerHTML = `<div class="assistant-msg-avatar">${av}</div><div class="assistant-msg-bubble assistant-typing"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(typingRow);
    scrollChatToBottom();
    setTimeout(() => {
      typingRow.remove();
      addBotMessage(text);
      resolve();
    }, delay);
  });
}
function setQuickReplies(items) {
  quickRepliesEl.innerHTML = '';
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'assistant-quick-btn' + (item.primary ? ' primary' : '');
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      addUserMessage(item.label);
      setQuickReplies([]);
      item.action();
    });
    quickRepliesEl.appendChild(btn);
  });
}

// ============================================================
// Погода — Open-Meteo (бесплатно, без ключа)
// ============================================================
const WEATHER_CODES = {
  0: ['☀️', 'Ясно'], 1: ['🌤️', 'Преимущественно ясно'], 2: ['⛅', 'Переменная облачность'],
  3: ['☁️', 'Пасмурно'], 45: ['🌫️', 'Туман'], 48: ['🌫️', 'Изморозь'],
  51: ['🌦️', 'Морось слабая'], 53: ['🌦️', 'Морось'], 55: ['🌧️', 'Морось сильная'],
  61: ['🌧️', 'Дождь слабый'], 63: ['🌧️', 'Дождь'], 65: ['🌧️', 'Дождь сильный'],
  71: ['🌨️', 'Снег слабый'], 73: ['🌨️', 'Снег'], 75: ['❄️', 'Снег сильный'],
  80: ['🌦️', 'Ливень слабый'], 81: ['🌧️', 'Ливень'], 82: ['⛈️', 'Ливень сильный'],
  95: ['⛈️', 'Гроза'], 96: ['⛈️', 'Гроза с градом'], 99: ['⛈️', 'Сильная гроза с градом']
};
function describeWeatherCode(code) {
  return WEATHER_CODES[code] || ['🌡️', 'Погода'];
}
async function fetchWeatherByCoords(lat, lon, cityFallback) {
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ru`).then(r => r.json()).catch(() => null);
  const cityName = geoRes?.results?.[0]?.name || cityFallback || 'Ваше местоположение';
  return fetchWeatherByPlace(lat, lon, cityName);
}
async function fetchWeatherByPlace(lat, lon, cityName) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather-fetch-failed');
  const data = await res.json();
  const cur = data.current;
  const [icon, desc] = describeWeatherCode(cur.weather_code);
  return {
    city: cityName, icon, desc,
    temp: Math.round(cur.temperature_2m),
    feelsLike: Math.round(cur.apparent_temperature),
    humidity: cur.relative_humidity_2m,
    wind: cur.wind_speed_10m
  };
}
async function geocodeCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=ru`;
  const res = await fetch(url);
  const data = await res.json();
  const place = data?.results?.[0];
  if (!place) return null;
  return { lat: place.latitude, lon: place.longitude, name: place.name };
}
function renderWeatherCard(w) {
  return `
    <div class="assistant-weather-card">
      <div class="assistant-weather-top">
        <div class="assistant-weather-city">${escapeHtml(w.city)}</div>
        <div class="assistant-weather-icon">${w.icon}</div>
      </div>
      <div class="assistant-weather-temp">${w.temp > 0 ? '+' : ''}${w.temp}°C</div>
      <div class="assistant-weather-desc">${escapeHtml(w.desc)}</div>
      <table class="assistant-weather-table">
        <tr><td>Ощущается как</td><td>${w.feelsLike > 0 ? '+' : ''}${w.feelsLike}°C</td></tr>
        <tr><td>Влажность</td><td>${w.humidity}%</td></tr>
        <tr><td>Ветер</td><td>${Math.round(w.wind)} км/ч</td></tr>
      </table>
    </div>`;
}

async function startWeatherFlow() {
  await botSay('Как определить место? 📍');
  setQuickReplies([
    { label: '📍 Моя геолокация', action: weatherByGeolocation },
    { label: '✍️ Введу город', action: () => { stage = 'weather_city'; botSay('Напишите название города.'); } }
  ]);
}
async function weatherByGeolocation() {
  await botSay('Определяю местоположение…', 250);
  if (!navigator.geolocation) {
    await botSay('Геолокация недоступна в этом браузере. Напишите город текстом.');
    stage = 'weather_city';
    return;
  }
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const w = await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      addBotMessageHTML(renderWeatherCard(w));
      await afterWeatherShown();
    } catch {
      await botSay('Не получилось получить погоду. Попробуйте ввести город текстом.');
      stage = 'weather_city';
    }
  }, async () => {
    await botSay('Доступ к геолокации не дан. Напишите город текстом.');
    stage = 'weather_city';
  }, { timeout: 8000 });
}
async function weatherByCity(cityText) {
  await botSay('Ищу город…', 250);
  const place = await geocodeCity(cityText).catch(() => null);
  if (!place) {
    await botSay('Не нашёл такой город 🤔 Проверьте написание и попробуйте ещё раз.');
    return;
  }
  try {
    const w = await fetchWeatherByPlace(place.lat, place.lon, place.name);
    addBotMessageHTML(renderWeatherCard(w));
    await afterWeatherShown();
  } catch {
    await botSay('Сервис погоды сейчас недоступен, попробуйте чуть позже.');
    stage = 'menu';
    showMainMenu();
  }
}
async function afterWeatherShown() {
  stage = 'menu';
  await botSay('Ещё чем-то помочь?');
  showMainMenu();
}

// ============================================================
// Свободное общение по шаблонам
// ============================================================
const SMALLTALK = [
  { re: /привет|здравств|хай\b/i, replies: ['Привет-привет! 👋', 'Здравствуйте! Рад(а) вас видеть.'] },
  { re: /как дела|как ты|как жизнь/i, replies: ['Всё отлично, спасибо! А у вас как дела?', 'Прекрасно, готов(а) помогать 🙂'] },
  { re: /спасибо|благодар/i, replies: ['Всегда пожалуйста! 💜', 'Обращайтесь ещё!'] },
  { re: /кто ты|как тебя зовут|твоё имя/i, replies: [] }, // обрабатывается отдельно
  { re: /шутк|анекдот/i, replies: ['Почему программисты путают Хэллоуин и Рождество? Потому что OCT 31 == DEC 25 😄', 'Заходит как-то пользователь без пароля в чат... а без пароля никак, извините 😅'] },
  { re: /люблю тебя|нравишься/i, replies: ['Это очень приятно! Но я просто программа-помощник — лучше берегите тепло для настоящих людей рядом 🙂'] },
  { re: /пока|до свидан|увидимся/i, replies: ['До встречи! Если что — я тут, просто нажмите на кнопку помощника.'] }
];
const FALLBACK_REPLIES = [
  'Хм, я пока учусь и не всегда понимаю сложные вопросы — но с входом, регистрацией и погодой точно помогу!',
  'Я больше специализируюсь на помощи со входом/регистрацией и погоде. Спросите об этом — отвечу быстро 🙂',
  'Не совсем понял(а), но могу помочь зарегистрироваться, войти или показать погоду — просто скажите.'
];

async function handleFreeform(text) {
  if (/кто ты|как тебя зовут|твоё имя/i.test(text)) {
    await botSay(assistantProfile ? `Меня зовут ${assistantProfile.name}, я помощник в «Искре» ✨` : 'Я помощник в «Искре»!');
    showMainMenu();
    return;
  }
  for (const rule of SMALLTALK) {
    if (rule.re.test(text) && rule.replies.length) {
      await botSay(rule.replies[Math.floor(Math.random() * rule.replies.length)]);
      showMainMenu();
      return;
    }
  }
  await botSay(FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)]);
  showMainMenu();
}

// ============================================================
// Основной сценарий (state machine)
// ============================================================
let stage = 'setup_gender'; // текущий этап диалога
const regData = { nickname: '', email: '', password: '' };

function showMainMenu() {
  stage = 'menu';
  setQuickReplies([
    { label: '1️⃣ Помощь со входом', action: startLoginHelp, primary: true },
    { label: '2️⃣ Помощь с регистрацией', action: startRegisterFlow, primary: true },
    { label: '🌤️ Покажи погоду', action: startWeatherFlow },
    { label: '💬 Просто поболтать', action: () => botSay('Пишите что угодно, я слушаю!') }
  ]);
}

async function beginConversation() {
  if (assistantProfile) {
    applyAssistantIdentity();
    await botSay(`С возвращением! Я ${assistantProfile.name}. Чем помочь — вход, регистрация или, может, погода? Нажмите 1, если нужна помощь со входом/регистрацией, или просто напишите, что нужно.`);
    showMainMenu();
    return;
  }
  stage = 'setup_gender';
  await botSay('Привет! Я помощник «Искры» 👋 Прежде чем начать — выберите, каким мне быть:');
  setQuickReplies([
    { label: '🧑 Мальчик', action: () => chooseGender('boy') },
    { label: '👧 Девочка', action: () => chooseGender('girl') }
  ]);
}
async function chooseGender(gender) {
  assistantProfile = { gender, name: '' };
  avatarEl.textContent = gender === 'girl' ? '👧' : '🧑';
  stage = 'setup_name';
  await botSay('Отлично! А как меня назовёте?');
}
async function finishNameSetup(name) {
  const clean = name.trim().slice(0, 24);
  assistantProfile.name = clean || (assistantProfile.gender === 'girl' ? 'Искра' : 'Спарк');
  saveAssistantProfile(assistantProfile);
  applyAssistantIdentity();
  await botSay(`Приятно познакомиться! Буду ${assistantProfile.name}. Нажмите 1, если нужна помощь со входом или регистрацией, либо просто напишите «помоги мне».`);
  showMainMenu();
}

// ---------- Помощь со входом ----------
async function startLoginHelp() {
  stage = 'login_help';
  setLoginMode(true);
  await botSay('Хорошо, переключил(а) форму на «Вход». Введите email и пароль, которые вы указывали при регистрации, и нажмите «Войти» вверху.');
  setQuickReplies([
    { label: '❓ Забыл(а) пароль', action: async () => { await botSay('Пока восстановление пароля через приложение не реализовано — обратитесь к тому, кто настраивал сервис, или зарегистрируйте новый аккаунт.'); showMainMenu(); } },
    { label: '📝 Нет аккаунта — зарегистрироваться', action: startRegisterFlow },
    { label: '⬅️ Назад в меню', action: showMainMenu }
  ]);
}

// ---------- Помощь с регистрацией ----------
async function startRegisterFlow() {
  stage = 'register_nickname';
  setLoginMode(false);
  regData.nickname = ''; regData.email = ''; regData.password = '';
  await botSay('Отлично, помогу зарегистрироваться! Как вас называть — придумайте никнейм.');
}
async function handleRegisterNickname(text) {
  const nick = text.trim();
  if (nick.length < 2 || nick.length > 40) {
    await botSay('Никнейм должен быть от 2 до 40 символов. Попробуйте другой.');
    return;
  }
  const prof = checkProfanity(nick);
  if (prof) { await handleProfanity(prof, 'register_nickname'); return; }
  regData.nickname = nick;
  nicknameInput.value = nick;
  stage = 'register_email';
  await botSay('Записал(а)! Теперь укажите ваш настоящий email — на него ничего не пришлём, но он нужен для входа.');
}
async function handleRegisterEmail(text) {
  const email = text.trim();
  const check = checkEmail(email);
  if (!check.ok) {
    if (check.reason === 'format') {
      await botSay('Это не похоже на email. Формат должен быть вида имя@почта.ру — попробуйте ещё раз.');
      return;
    }
    // временный/подозрительный адрес — считаем нарушением (страйк)
    const state = await addStrike('fake-email');
    if (state.banned) { showBanScreen(); return; }
    await botSay(`Похоже, это временный или ненастоящий email 🤨 Пожалуйста, укажите настоящий (осталось попыток: ${3 - state.strikes}).`);
    return;
  }
  regData.email = email;
  emailInput.value = email;
  stage = 'register_password_choice';
  await botSay('Как поступим с паролем?');
  setQuickReplies([
    { label: '🔐 Сгенерируй за меня', action: generatePasswordForUser, primary: true },
    { label: '✍️ Придумаю сам(а)', action: () => { stage = 'register_password_self'; botSay('Хорошо, напишите пароль (минимум 6 символов).'); } }
  ]);
}
function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pass = '';
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 12; i++) pass += chars[arr[i] % chars.length];
  return pass;
}
async function generatePasswordForUser() {
  const pass = generateSecurePassword();
  regData.password = pass;
  passwordInput.value = pass;
  addBotMessageHTML(`Сгенерировал(а) надёжный пароль:<br><span class="assistant-generated-password">${escapeHtml(pass)}</span><br>Обязательно сохраните его — он также вписан в форму.`);
  await goToRegisterConfirm();
}
async function handleRegisterPasswordSelf(text) {
  const pass = text.trim();
  if (pass.length < 6) { await botSay('Пароль слишком короткий, нужно минимум 6 символов.'); return; }
  const prof = checkProfanity(pass);
  if (prof) { await handleProfanity(prof, 'register_password_self'); return; }
  regData.password = pass;
  stage = 'register_password_confirm';
  await botSay('Повторите пароль ещё раз для подтверждения.');
}
async function handleRegisterPasswordConfirm(text) {
  if (text.trim() !== regData.password) {
    await botSay('Пароли не совпадают, попробуйте ввести ещё раз (сначала новый пароль).');
    stage = 'register_password_self';
    return;
  }
  passwordInput.value = regData.password;
  await goToRegisterConfirm();
}
async function goToRegisterConfirm() {
  stage = 'register_confirm';
  await botSay(`Проверьте данные:\nНикнейм: ${regData.nickname}\nEmail: ${regData.email}\nПароль: ${'•'.repeat(Math.min(regData.password.length, 12))}\n\nВсё заполнено в форме выше. Отправляем?`);
  setQuickReplies([
    { label: '✅ Зарегистрировать', action: submitRegistration, primary: true },
    { label: '✏️ Изменить email', action: () => { stage = 'register_email'; botSay('Введите email заново.'); } },
    { label: '✏️ Изменить никнейм', action: () => { stage = 'register_nickname'; botSay('Введите никнейм заново.'); } }
  ]);
}
async function submitRegistration() {
  clearAuthError();
  await botSay('Отправляю форму регистрации…', 250);
  registerBtn.click();
  setTimeout(async () => {
    const errText = displayAuthErrorText();
    if (errText) {
      if (/занят/i.test(errText)) {
        await botSay(`Firebase сообщил: «${errText}». Давайте укажем другой email.`);
        stage = 'register_email';
      } else {
        await botSay(`Firebase сообщил: «${errText}». Попробуем ещё раз?`);
        stage = 'menu';
        showMainMenu();
      }
    } else {
      await botSay('Готово! Аккаунт создан, вы уже входите в чат 🎉');
      setTimeout(closePanel, 900);
    }
  }, 700);
}
function displayAuthErrorText() {
  const el = document.getElementById('auth-error');
  return el ? el.textContent.trim() : '';
}

async function handleProfanity(level, returnStage) {
  if (level === 'severe') {
    await banNow('profanity');
    showBanScreen();
    return;
  }
  const state = await addStrike('mild-profanity');
  if (state.banned) { showBanScreen(); return; }
  await botSay(`Пожалуйста, общайтесь без грубых слов 🙏 (предупреждение ${state.strikes}/3)`);
  stage = returnStage;
}

// ---------- Погода: обработка ввода города ----------
// (используется в общем роутере ниже)

// ============================================================
// Роутер пользовательского ввода
// ============================================================
async function routeUserText(rawText) {
  const text = rawText.trim();
  if (!text) return;

  if (moderationState.banned) { showBanScreen(); return; }

  const prof = checkProfanity(text);
  if (prof && !['register_nickname', 'register_email'].includes(stage)) {
    // в этих двух этапах мат уже проверяется точечно внутри обработчика,
    // здесь ловим мат в остальных этапах/свободном чате
    await handleProfanity(prof, stage);
    return;
  }

  switch (stage) {
    case 'setup_name':
      await finishNameSetup(text);
      return;
    case 'register_nickname':
      await handleRegisterNickname(text);
      return;
    case 'register_email':
      await handleRegisterEmail(text);
      return;
    case 'register_password_self':
      await handleRegisterPasswordSelf(text);
      return;
    case 'register_password_confirm':
      await handleRegisterPasswordConfirm(text);
      return;
    case 'weather_city':
      await weatherByCity(text);
      return;
    default:
      break;
  }

  // Быстрые команды по номеру / ключевым словам работают из любого "неанкетного" этапа
  if (/^1\b/.test(text) || /вход|войти|логин/i.test(text)) { await startLoginHelp(); return; }
  if (/^2\b/.test(text) || /регистрац|зарегистр|создать аккаунт|новый аккаунт/i.test(text)) { await startRegisterFlow(); return; }
  if (/погод/i.test(text)) { await startWeatherFlow(); return; }
  if (/помо/i.test(text)) {
    await botSay('Конечно! Нажмите 1 — помощь со входом, 2 — помощь с регистрацией, или спросите про погоду.');
    showMainMenu();
    return;
  }
  await handleFreeform(text);
}

// ============================================================
// Открытие/закрытие панели
// ============================================================
let initialized = false;
async function openPanel() {
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  fab.classList.remove('has-unread');
  applyAssistantIdentity();
  if (!initialized) {
    initialized = true;
    await loadModerationState();
    if (moderationState.banned) { showBanScreen(); return; }
    await beginConversation();
  } else if (moderationState.banned) {
    showBanScreen();
  }
}
function closePanel() {
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
}

fab?.addEventListener('click', openPanel);
closeBtn?.addEventListener('click', closePanel);
inputForm?.addEventListener('submit', e => {
  e.preventDefault();
  const text = inputEl.value;
  if (!text.trim()) return;
  addUserMessage(text.trim());
  inputEl.value = '';
  routeUserText(text);
});

// Закрываем помощника автоматически, если пользователь успешно вошёл/зарегистрировался
onAuthStateChanged(auth, user => {
  if (user) closePanel();
});

// ============================================================
// Точка расширения на будущее: подключение настоящего AI-бэкенда.
// Когда появится сервер-прокси (например, Firebase Cloud Function),
// скрывающий API-ключ, замените вызов handleFreeform(text) на:
//   const reply = await askRemoteAI(text);
//   await botSay(reply);
// ============================================================
async function askRemoteAI(userText) {
  const AI_BACKEND_URL = null; // например: 'https://us-central1-<project>.cloudfunctions.net/assistantChat'
  if (!AI_BACKEND_URL) throw new Error('AI backend не настроен');
  const res = await fetch(AI_BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userText, assistantName: assistantProfile?.name, gender: assistantProfile?.gender })
  });
  const data = await res.json();
  return data.reply;
}
