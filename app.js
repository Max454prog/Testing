// КОНФИГУРАЦИЯ FIREBASE (вставьте свои ключи)
const firebaseConfig = {
  apiKey: "AIzaSyDH4JqdICmjf_IzC2h58arcQiSAWkV4AcA",
  authDomain: "messenger-41f5f.firebaseapp.com",
  projectId: "messenger-41f5f",
  storageBucket: "messenger-41f5f.firebasestorage.app",
  messagingSenderId: "663121888236",
  appId: "1:663121888236:web:f5997f256fd153fde9b6c9",
  measurementId: "G-87QPL1SK7N"
};

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============ Офлайн-режим: постоянный локальный кэш Firestore ============
// Без этого приложение при потере интернета просто зависало бы на пустом
// экране/бесконечной загрузке. С включённым IndexedDB-кэшем Firestore сам
// сохраняет на устройстве все чаты и сообщения, которые уже были получены
// хотя бы раз, и onSnapshot-подписки продолжают отдавать эти данные из
// локального хранилища, даже когда сети совсем нет — можно открыть
// приложение офлайн и читать переписку. Как только сеть появляется снова,
// Firestore тихо досинхронизируется и дозагрузит новое. Дополнительный код
// в остальных частях приложения для этого не нужен.
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    // Несколько вкладок «Искры» открыты одновременно — офлайн-кэш можно
    // держать только в одной вкладке сразу. Само приложение продолжает
    // работать нормально, просто в лишних вкладках не будет офлайн-режима.
    console.warn('Офлайн-кэш недоступен: открыто несколько вкладок «Искры».');
  } else if (err.code === 'unimplemented') {
    console.warn('Этот браузер не поддерживает офлайн-кэш Firestore.');
  }
});

// DOM-элементы
const splashScreen = document.getElementById('splash-screen');
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const authForm = document.getElementById('auth-form');
const nicknameGroup = document.getElementById('nickname-group');
const nicknameInput = document.getElementById('nickname');
const regPhoneGroup = document.getElementById('reg-phone-group');
const regPhoneInput = document.getElementById('reg-phone');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authToggle = document.getElementById('auth-toggle');
const messagesContainer = document.getElementById('messages-container');
const messagesList = document.getElementById('messages-list');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const logoutBtn = document.getElementById('logout-btn');
const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('profile-modal');
const profileNickname = document.getElementById('profile-nickname');
const profilePhone = document.getElementById('profile-phone');
const profileAvatarPreview = document.getElementById('profile-avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const saveProfileBtn = document.getElementById('save-profile');
const closeModalBtn = document.getElementById('close-modal');
const sidebarAvatar = document.getElementById('sidebar-avatar');
const selfStatusDot = document.getElementById('self-status-dot');
const currentUserNickname = document.getElementById('current-user-nickname');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPanel = document.getElementById('emoji-panel');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const animationSelect = document.getElementById('animation-select');
const saveSettingsBtn = document.getElementById('save-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const mainChat = document.getElementById('main-chat');
const sidebar = document.getElementById('sidebar');
const sidebarScrim = document.getElementById('sidebar-scrim');
const chatList = document.getElementById('chat-list');
const currentChatTitle = document.getElementById('current-chat-title');
const chatHeaderSub = document.getElementById('chat-header-sub');
const chatHeaderAvatarWrap = document.getElementById('chat-header-avatar-wrap');
const chatHeaderAvatar = document.getElementById('chat-header-avatar');
const chatHeaderStatusDot = document.getElementById('chat-header-status-dot');
const newChatBtn = document.getElementById('new-chat-btn');
const newChatModal = document.getElementById('new-chat-modal');
const closeNewChatBtn = document.getElementById('close-new-chat');
const modePrivateBtn = document.getElementById('mode-private');
const modeGroupBtn = document.getElementById('mode-group');
const groupNameGroup = document.getElementById('group-name-group');
const groupNameInput = document.getElementById('group-name-input');
const userSearchInput = document.getElementById('user-search-input');
const userSearchBtn = document.getElementById('user-search-btn');
const searchResultsEl = document.getElementById('search-results');
const searchHint = document.getElementById('search-hint');
const stagedMembersEl = document.getElementById('staged-members');
const createGroupBtn = document.getElementById('create-group-btn');
const statusNavBtn = document.getElementById('status-nav-btn');
const statusModal = document.getElementById('status-modal');
const closeStatusModalBtn = document.getElementById('close-status-modal');
const myStatusRow = document.getElementById('my-status-row');
const statusAddForm = document.getElementById('status-add-form');
const statusTextInput = document.getElementById('status-text-input');
const statusImageInput = document.getElementById('status-image-input');
const statusImagePreview = document.getElementById('status-image-preview');
const statusPublishBtn = document.getElementById('status-publish-btn');
const statusCancelBtn = document.getElementById('status-cancel-btn');
const statusListEl = document.getElementById('status-list');
const statusViewer = document.getElementById('status-viewer');
const statusViewerAvatar = document.getElementById('status-viewer-avatar');
const statusViewerName = document.getElementById('status-viewer-name');
const statusViewerTime = document.getElementById('status-viewer-time');
const statusViewerClose = document.getElementById('status-viewer-close');
const statusViewerImage = document.getElementById('status-viewer-image');
const statusViewerText = document.getElementById('status-viewer-text');
const statusViewerViewersWrap = document.getElementById('status-viewer-viewers');
const statusViewersList = document.getElementById('status-viewers-list');
const profileQrBtn = document.getElementById('profile-qr-btn');
const qrModal = document.getElementById('qr-modal');
const qrCloseBtn = document.getElementById('qr-close-btn');
const qrBackBtn = document.getElementById('qr-back-btn');
const qrModalTitle = document.getElementById('qr-modal-title');
const qrMyView = document.getElementById('qr-my-view');
const qrScanView = document.getElementById('qr-scan-view');
const qrCanvasEl = document.getElementById('qr-canvas');
const qrAvatarOverlay = document.getElementById('qr-avatar-overlay');
const qrUserNameEl = document.getElementById('qr-user-name');
const qrScanBtn = document.getElementById('qr-scan-btn');
const qrVideo = document.getElementById('qr-video');
const qrScanCanvas = document.getElementById('qr-scan-canvas');
const qrScanStatus = document.getElementById('qr-scan-status');
const offlineBanner = document.getElementById('offline-banner');
const avatarViewerModal = document.getElementById('avatar-viewer-modal');
const avatarViewerImage = document.getElementById('avatar-viewer-image');
const avatarViewerName = document.getElementById('avatar-viewer-name');
const avatarViewerClose = document.getElementById('avatar-viewer-close');
const sidebarAvatarWrap = document.querySelector('#user-info .avatar-wrap');

let currentUser = null;
let currentUserData = { nickname: '', avatarUrl: '', animation: 'none' };
let activeChatId = 'general';
let unsubscribeMessages = null;
let isLoginMode = true;
let animationInterval = null;
let presenceInterval = null;
const userStatusListeners = new Map(); // uid -> unsubscribe
let unsubscribeChatList = null;
let unsubscribeHeaderPresence = null;
let newChatMode = 'private'; // 'private' | 'group'
let stagedMembers = []; // { uid, nickname, avatarUrl } — только для режима "группа"
let lastSearchResults = []; // кэш последних результатов поиска пользователей
let unsubscribeStatuses = null;
let currentStatuses = []; // все активные (не старше 24ч) статусы из подписки
let pendingStatusImage = ''; // сжатое изображение перед публикацией статуса
let statusCleanupInterval = null;
let qrCodeInstance = null; // экземпляр библиотеки qrcodejs для моего кода
let qrScanStream = null;   // MediaStream активной камеры сканера
let qrScanRAF = null;      // id requestAnimationFrame цикла сканирования
const QR_CONTACT_PREFIX = 'iskra-contact:';
let statusByUserMap = new Map(); // uid -> последний активный статус (для рамок на аватарках)
const chatMembersCache = new Map(); // chatId -> массив участников (для галочек "доставлено/прочитано")
let activeChatMessagesCache = new Map(); // id сообщения -> данные, только для открытого сейчас чата

const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;

// ============ Splash screen ============
// БАГФИКС (лишняя задержка): раньше сплэш держался минимум 1300мс на КАЖДОМ
// запуске, даже если Firebase Auth уже успел ответить почти мгновенно (что
// обычно и происходит благодаря локальному кэшу сессии). Это выглядело как
// «тормозит» при входе. Оставляем небольшой минимум (350мс), чтобы не было
// резкого мигания на очень быстрых устройствах, но не заставляем ждать
// секунду с лишним впустую.
let splashMinTimeDone = false;
let authStateKnown = false;
function maybeHideSplash() {
  if (splashMinTimeDone && authStateKnown) {
    splashScreen.classList.add('hidden');
  }
}
setTimeout(() => { splashMinTimeDone = true; maybeHideSplash(); }, 350);

// Вспомогательные функции
function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}
function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
}
function isScrolledToBottom() {
  const c = messagesContainer;
  return c.scrollHeight - c.scrollTop - c.clientHeight < 100;
}
function scrollToBottom() { messagesContainer.scrollTop = messagesContainer.scrollHeight; }
function clearAuthError() { authError.textContent = ''; }
function displayAuthError(msg) { authError.textContent = msg; }

// БАГФИКС (безопасность): раньше никнеймы, названия групп, тексты сообщений
// и статусов вставлялись через innerHTML БЕЗ экранирования. Любой пользователь
// мог зарегистрироваться с никнеймом вида `<img src=x onerror=alert(1)>` или
// отправить такое в сообщении — это выполнилось бы в браузере всех остальных
// (классическая stored-XSS). Теперь весь пользовательский текст обязательно
// экранируется перед вставкой в HTML.
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
function linkify(text) {
  const escaped = escapeHtml(text);
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  return escaped.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}
// ============ Реальные анимированные эмодзи (Google Noto Animated Emoji) ============
function emojiToNotoCodepoint(emoji) {
  return Array.from(emoji).map(ch => ch.codePointAt(0).toString(16).toLowerCase()).join('_');
}
const emojiLottieCache = new Map(); // codepoint -> Promise<lottieJSON|null>
function getEmojiLottie(codepoint) {
  if (emojiLottieCache.has(codepoint)) return emojiLottieCache.get(codepoint);
  const promise = fetch(`https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoint}/lottie.json`)
    .then(res => { if (!res.ok) throw new Error('нет анимированной версии для этого эмодзи'); return res.json(); })
    .catch(() => null);
  emojiLottieCache.set(codepoint, promise);
  return promise;
}
// БАГФИКС (утечка производительности, особенно заметна на телефонах): раньше
// при повторном вызове для уже занятого контейнера (например, пользователь
// несколько раз подряд тапнул по эмодзи-сообщению, чтобы переиграть анимацию)
// предыдущий экземпляр Lottie-плеера не уничтожался — он просто терял свой
// DOM-узел (container.textContent = emoji перезаписывал разметку), но сам
// плеер молча продолжал работать в фоне и жечь CPU/батарею. При частых тапах
// таких "невидимых" плееров могло накопиться много. Теперь перед созданием
// новой анимации существующий экземпляр явно уничтожается через .destroy().
function renderAnimatedEmoji(container, emoji, { loop = false } = {}) {
  if (container._lottieInstance) {
    container._lottieInstance.destroy();
    container._lottieInstance = null;
  }
  container.textContent = emoji;
  const codepoint = emojiToNotoCodepoint(emoji);
  getEmojiLottie(codepoint).then(data => {
    if (data && window.lottie && container.isConnected) {
      container.textContent = '';
      container._lottieInstance = lottie.loadAnimation({ container, renderer: 'svg', loop, autoplay: true, animationData: data });
    }
  });
}

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23343450"/%3E%3C/svg%3E';
// БАГФИКС (битая ссылка при просмотре своей пустой аватарки): у элементов
// <img src=""> (sidebar-avatar, chat-header-avatar до первой подгрузки
// данных) чтение свойства .src в браузере возвращает НЕ пустую строку, а
// полный адрес самой открытой HTML-страницы — такая особенность спецификации
// для img с пустым атрибутом src. Из-за этого `imgEl.src || DEFAULT_AVATAR`
// всегда считался "заполненным" и никогда не подставлял запасную картинку —
// при клике на свою аватарку без фото профиля (новая функция просмотра фото)
// открывалась бы битая ссылка на HTML вместо DEFAULT_AVATAR. Проверяем
// именно HTML-атрибут через getAttribute(), а не резолвленное свойство.
function safeAvatarSrc(imgEl) {
  if (!imgEl) return DEFAULT_AVATAR;
  const attr = imgEl.getAttribute('src');
  return attr ? imgEl.src : DEFAULT_AVATAR;
}

function getEmojiOnlyInfo(text) {
  const stripped = (text || '').replace(/\s+/g, '');
  if (!stripped) return null;
  const emojiOnlyRegex = /^(\p{Extended_Pictographic}(\u200d\p{Extended_Pictographic})*\ufe0f?)+$/u;
  if (!emojiOnlyRegex.test(stripped)) return null;
  let graphemes;
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    graphemes = Array.from(new Intl.Segmenter('ru', { granularity: 'grapheme' }).segment(stripped), s => s.segment);
  } else {
    graphemes = Array.from(stripped);
  }
  return graphemes.length > 0 && graphemes.length <= 3 ? { graphemes } : null;
}

function setLoginMode(mode) {
  isLoginMode = mode;
  if (mode) {
    nicknameGroup.style.display = 'none';
    regPhoneGroup.style.display = 'none';
    loginBtn.style.display = 'inline-flex';
    registerBtn.style.display = 'none';
    passwordInput.autocomplete = 'current-password';
    authToggle.innerHTML = 'Нет аккаунта? <a href="#" id="switch-to-register">Создать</a>';
  } else {
    nicknameGroup.style.display = 'block';
    regPhoneGroup.style.display = 'block';
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'inline-flex';
    passwordInput.autocomplete = 'new-password';
    authToggle.innerHTML = 'Уже есть аккаунт? <a href="#" id="switch-to-login">Войти</a>';
  }
  const newLink = document.querySelector('#auth-toggle a');
  if (newLink) newLink.addEventListener('click', e => { e.preventDefault(); if (authInProgress) return; clearAuthError(); setLoginMode(!isLoginMode); });
}

// Аутентификация
// БАГФИКС (гонка при регистрации): раньше registerUser() сам писал профиль
// в Firestore СРАЗУ после создания аккаунта в Auth. Но onAuthStateChanged
// срабатывает почти в тот же момент и тоже вызывает loadUserData(), которая
// создаёт документ, если его ещё нет. Оба процесса независимо проверяли
// "есть ли документ?" и оба могли решить, что его нет, и одновременно его
// создать — а порядок, чей вариант окажется последним (и, значит, победит),
// не гарантирован. В редких случаях никнейм и телефон, введённые при
// регистрации, перезаписывались дефолтным «Пользователь» без телефона.
// Теперь документ профиля создаётся только в ОДНОМ месте — в loadUserData(),
// которую в любом случае всегда вызывает onAuthStateChanged. registerUser()
// лишь передаёт туда никнейм/телефон через pendingRegistrationProfile.
let pendingRegistrationProfile = null;
async function registerUser(email, password, nickname, phone) {
  pendingRegistrationProfile = { nickname, phone: phone || '' };
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (e) {
    pendingRegistrationProfile = null;
    throw e;
  }
}
async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}
async function loadUserData(uid, email) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const profile = pendingRegistrationProfile;
  pendingRegistrationProfile = null;
  const def = {
    nickname: (profile && profile.nickname) || 'Пользователь',
    email: email || '',
    phone: (profile && profile.phone) || '',
    avatarUrl: '', animation: 'none', online: true,
    phoneReminderSent: !!(profile && profile.phone),
    createdAt: serverTimestamp()
  };
  await setDoc(ref, def);
  return def;
}

// Профиль и аватар
async function updateProfile(nickname, avatarUrl, phone) {
  if (!currentUser) return;
  const cleanAvatar = (avatarUrl && avatarUrl !== DEFAULT_AVATAR) ? avatarUrl : '';
  await updateDoc(doc(db, 'users', currentUser.uid), { nickname, avatarUrl: cleanAvatar, phone: phone || '' });
  currentUserData.nickname = nickname;
  currentUserData.avatarUrl = cleanAvatar;
  currentUserData.phone = phone || '';
  updateSidebarProfile();
}
function updateSidebarProfile() {
  currentUserNickname.textContent = currentUserData.nickname || 'Пользователь';
  if (currentUserData.avatarUrl) {
    sidebarAvatar.src = currentUserData.avatarUrl;
    sidebarAvatar.style.display = 'block';
  } else {
    sidebarAvatar.style.display = 'none';
  }
}
// БАГФИКС (совместимость с телефоном): раньше сжатие изображения всегда шло
// через <img> + <canvas>, а Canvas игнорирует EXIF-тег ориентации, который
// камеры телефонов почти всегда пишут в файл (в отличие от скриншотов или
// вебкамер на ноутбуке, где такого тега обычно нет). В результате фото,
// снятое прямо на телефон (особенно в портретном режиме), после сжатия
// оказывалось повёрнутым на 90/180 градусов — и в аватаре, и в статусе.
// Теперь мы в первую очередь используем createImageBitmap с опцией
// imageOrientation:'from-image' (она поддерживается всеми современными
// мобильными и десктопными браузерами и сама поворачивает пиксели по EXIF
// перед тем как мы их нарисуем на canvas). Старый способ через Image()
// оставлен как запасной вариант для редких браузеров без этой опции.
function compressImage(file, maxW=200, maxH=200, quality=0.7) {
  if (window.createImageBitmap) {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
      .then(bitmap => {
        const canvas = document.createElement('canvas');
        let { width, height } = bitmap;
        // БАГФИКС: раньше маленькие исходники (меньше maxW/maxH) всё равно
        // проходили через canvas без апскейла — это не портило качество, но
        // приводило к путанице при отладке. Явно не увеличиваем изображение,
        // если оно и так меньше целевого размера — качество только теряется
        // от лишнего прохода через JPEG-кодирование, а не приобретается.
        if (width > maxW || height > maxH) {
          if (width > height) { height *= maxW/width; width = maxW; }
          else { width *= maxH/height; height = maxH; }
        }
        canvas.width = Math.round(width); canvas.height = Math.round(height);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        return canvas.toDataURL('image/jpeg', quality);
      })
      .catch(() => compressImageLegacy(file, maxW, maxH, quality));
  }
  return compressImageLegacy(file, maxW, maxH, quality);
}
function compressImageLegacy(file, maxW=200, maxH=200, quality=0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('Файл повреждён или это не изображение'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxW || height > maxH) {
          if (width > height) { height *= maxW/width; width = maxW; }
          else { width *= maxH/height; height = maxH; }
        }
        canvas.width = Math.round(width); canvas.height = Math.round(height);
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function maybeSendPhoneReminder(uid, data) {
  if (data.phone || data.phoneReminderSent) return;
  showLocalNotice(`${data.nickname || 'Пользователь'}, добавьте, пожалуйста, номер телефона в профиле.`);
  updateDoc(doc(db, 'users', uid), { phoneReminderSent: true }).catch(() => {});
  currentUserData.phoneReminderSent = true;
}
function showLocalNotice(text) {
  const notice = document.createElement('div');
  notice.className = 'local-notice';
  notice.textContent = text;
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 6000);
}

// ============ Присутствие (online) ============
const PRESENCE_TIMEOUT_MS = 50000; // heartbeat раз в 25с — 50с тишины = офлайн
const presenceDataCache = new Map(); // uid -> последние сырые данные users/{uid}
function computeIsOnline(data) {
  if (!data || data.online !== true || !data.lastActive) return false;
  const lastMs = data.lastActive.toMillis ? data.lastActive.toMillis() : new Date(data.lastActive).getTime();
  return (Date.now() - lastMs) < PRESENCE_TIMEOUT_MS;
}
// БАГФИКС/ФИЧА (последнее время входа): раньше при отсутствии пользователя
// в сети везде просто показывалась статичная надпись «не в сети» — как в
// WhatsApp/Telegram здесь не хватало времени последнего захода. Данные для
// этого уже были: поле lastActive обновляется на сервере при каждом выходе
// из сети (см. setOnline(false) ниже). Теперь мы форматируем его в читаемую
// строку вида «был(а) в сети сегодня в 14:32», «...вчера в...» или с датой.
function formatLastSeen(data) {
  if (!data || !data.lastActive) return 'не в сети';
  const lastMs = data.lastActive.toMillis ? data.lastActive.toMillis() : new Date(data.lastActive).getTime();
  const d = new Date(lastMs);
  const now = new Date();
  const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `был(а) в сети сегодня в ${timeStr}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `был(а) в сети вчера в ${timeStr}`;
  const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `был(а) в сети ${dateStr} в ${timeStr}`;
}
function refreshPresenceUI(uid) {
  const isOnline = computeIsOnline(presenceDataCache.get(uid));
  document.querySelectorAll(`.status-dot[data-uid="${uid}"]`).forEach(dot => dot.classList.toggle('online', isOnline));
  if (chatHeaderStatusDot.dataset.uid === uid) {
    chatHeaderStatusDot.classList.toggle('online', isOnline);
    chatHeaderSub.textContent = isOnline ? 'в сети' : formatLastSeen(presenceDataCache.get(uid));
    chatHeaderSub.classList.toggle('offline', !isOnline);
  }
}
setInterval(() => { presenceDataCache.forEach((_, uid) => refreshPresenceUI(uid)); }, 15000);

function ensureUserStatusListener(uid) {
  if (!uid || userStatusListeners.has(uid)) return;
  const unsub = onSnapshot(doc(db, 'users', uid), snap => {
    presenceDataCache.set(uid, snap.exists() ? snap.data() : null);
    refreshPresenceUI(uid);
  });
  userStatusListeners.set(uid, unsub);
}
function clearUserStatusListeners() {
  userStatusListeners.forEach(unsub => unsub());
  userStatusListeners.clear();
  presenceDataCache.clear();
}
async function setOnline(state) {
  if (!currentUser) return;
  try { await updateDoc(doc(db, 'users', currentUser.uid), { online: state, lastActive: serverTimestamp() }); }
  catch (e) { /* нет соединения — не критично */ }
}
function startPresenceHeartbeat() {
  stopPresenceHeartbeat();
  setOnline(true);
  presenceInterval = setInterval(() => { if (!document.hidden) setOnline(true); }, 25000);
}
function stopPresenceHeartbeat() {
  if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
}
document.addEventListener('visibilitychange', () => {
  if (!currentUser) return;
  if (document.hidden) { setOnline(false); return; }
  setOnline(true);
  activeChatMessagesCache.forEach((data, id) => maybeMarkRead(id, data, activeChatId));
});
window.addEventListener('beforeunload', () => { setOnline(false); });

// ============ Личные и групповые чаты ============
function privateChatId(uidA, uidB) {
  return 'priv_' + [uidA, uidB].sort().join('_');
}

async function searchUsers(term) {
  const trimmed = term.trim();
  if (!trimmed) return [];
  const usersRef = collection(db, 'users');
  const fields = ['nickname', 'email', 'phone'];
  const found = new Map();
  for (const field of fields) {
    try {
      const snap = await getDocs(query(usersRef, where(field, '==', trimmed)));
      snap.forEach(d => {
        if (d.id !== currentUser.uid && !found.has(d.id)) found.set(d.id, { uid: d.id, ...d.data() });
      });
    } catch (e) { /* поле может отсутствовать у части документов — пропускаем */ }
  }
  return Array.from(found.values());
}

function renderSearchResults(results) {
  lastSearchResults = results;
  searchResultsEl.innerHTML = '';
  if (results.length === 0) {
    searchResultsEl.innerHTML = '<div class="search-empty">Никого не нашли. Проверьте правильность ввода.</div>';
    return;
  }
  results.forEach(user => {
    const alreadyStaged = stagedMembers.some(m => m.uid === user.uid);
    const item = document.createElement('div');
    item.className = 'search-result-item' + (newChatMode === 'group' && alreadyStaged ? ' added' : '');
    item.innerHTML = `
      <img class="avatar-small" src="${escapeHtml(user.avatarUrl || DEFAULT_AVATAR)}" alt="">
      <div class="search-result-info">
        <span class="search-result-name">${escapeHtml(user.nickname || 'Пользователь')}</span>
        <span class="search-result-sub">${escapeHtml(user.email || user.phone || '')}</span>
      </div>`;
    item.addEventListener('click', () => {
      if (newChatMode === 'private') {
        startPrivateChat(user);
      } else {
        addStagedMember(user);
        renderSearchResults(lastSearchResults);
      }
    });
    searchResultsEl.appendChild(item);
  });
}

function addStagedMember(user) {
  if (stagedMembers.some(m => m.uid === user.uid)) return;
  stagedMembers.push(user);
  renderStagedChips();
}
function removeStagedMember(uid) {
  stagedMembers = stagedMembers.filter(m => m.uid !== uid);
  renderStagedChips();
  renderSearchResults(lastSearchResults);
}
function renderStagedChips() {
  stagedMembersEl.innerHTML = '';
  stagedMembers.forEach(user => {
    const chip = document.createElement('div');
    chip.className = 'staged-chip';
    chip.innerHTML = `<img src="${escapeHtml(user.avatarUrl || DEFAULT_AVATAR)}" alt=""><span>${escapeHtml(user.nickname || 'Пользователь')}</span>`;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
    removeBtn.setAttribute('aria-label', 'Убрать участника');
    removeBtn.addEventListener('click', () => removeStagedMember(user.uid));
    chip.appendChild(removeBtn);
    stagedMembersEl.appendChild(chip);
  });
}

async function startPrivateChat(otherUser) {
  const chatId = privateChatId(currentUser.uid, otherUser.uid);
  const chatRef = doc(db, 'chats', chatId);
  try {
    const snap = await getDoc(chatRef);
    if (!snap.exists()) {
      await setDoc(chatRef, {
        type: 'private',
        members: [currentUser.uid, otherUser.uid],
        memberInfo: {
          [currentUser.uid]: { nickname: currentUserData.nickname || 'Пользователь', avatarUrl: currentUserData.avatarUrl || '' },
          [otherUser.uid]: { nickname: otherUser.nickname || 'Пользователь', avatarUrl: otherUser.avatarUrl || '' }
        },
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (e) {
    alert('Не удалось открыть чат. Попробуйте ещё раз.');
    return;
  }
  selectChat(chatId, otherUser.nickname || 'Пользователь', { type: 'private', otherUid: otherUser.uid });
  closeNewChatModal();
}

async function createGroupChat() {
  if (stagedMembers.length === 0) return;
  const name = groupNameInput.value.trim() || 'Новая группа';
  const memberInfo = { [currentUser.uid]: { nickname: currentUserData.nickname || 'Пользователь', avatarUrl: currentUserData.avatarUrl || '' } };
  stagedMembers.forEach(u => { memberInfo[u.uid] = { nickname: u.nickname || 'Пользователь', avatarUrl: u.avatarUrl || '' }; });
  const membersArr = [currentUser.uid, ...stagedMembers.map(u => u.uid)];
  let docRef;
  try {
    docRef = await addDoc(collection(db, 'chats'), {
      type: 'group',
      name,
      members: membersArr,
      memberInfo,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    alert('Не удалось создать группу. Попробуйте ещё раз.');
    return;
  }
  selectChat(docRef.id, name, { type: 'group', memberCount: membersArr.length });
  closeNewChatModal();
}

// ============ QR-код профиля: показать свой код и отсканировать чужой ============
function renderMyQrCode() {
  if (!currentUser || typeof QRCode === 'undefined') return;
  const payload = QR_CONTACT_PREFIX + currentUser.uid;
  qrCanvasEl.innerHTML = '';
  qrCodeInstance = new QRCode(qrCanvasEl, {
    text: payload,
    width: 200,
    height: 200,
    colorDark: '#0f0f1c',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
  qrAvatarOverlay.src = currentUserData.avatarUrl || DEFAULT_AVATAR;
  qrUserNameEl.textContent = currentUserData.nickname || 'Пользователь';
}

function showQrMyView() {
  stopQrScan();
  qrScanView.style.display = 'none';
  qrMyView.style.display = 'flex';
  qrBackBtn.style.display = 'none';
  qrModalTitle.textContent = 'Мой QR-код';
  renderMyQrCode();
}

function openQrModal() {
  showQrMyView();
  qrModal.style.display = 'flex';
}

function closeQrModal() {
  stopQrScan();
  qrModal.style.display = 'none';
}

async function startQrScan() {
  qrMyView.style.display = 'none';
  qrScanView.style.display = 'flex';
  qrBackBtn.style.display = 'inline-flex';
  qrModalTitle.textContent = 'Сканировать код';
  qrScanStatus.textContent = 'Наведите камеру на QR-код собеседника';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    qrScanStatus.textContent = 'Камера недоступна в этом браузере.';
    return;
  }
  try {
    qrScanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch (e) {
    qrScanStatus.textContent = 'Нет доступа к камере. Разрешите доступ в настройках браузера.';
    return;
  }
  qrVideo.srcObject = qrScanStream;
  try { await qrVideo.play(); } catch (e) { /* autoplay может быть отклонён — игнорируем */ }
  if (typeof jsQR !== 'function') {
    qrScanStatus.textContent = 'Не удалось загрузить модуль распознавания QR. Проверьте интернет-соединение и обновите страницу.';
    return;
  }
  qrScanRAF = requestAnimationFrame(scanQrFrame);
}

function stopQrScan() {
  if (qrScanRAF) { cancelAnimationFrame(qrScanRAF); qrScanRAF = null; }
  if (qrScanStream) { qrScanStream.getTracks().forEach(t => t.stop()); qrScanStream = null; }
  qrVideo.srcObject = null;
}

function scanQrFrame() {
  if (!qrScanStream) return;
  if (qrVideo.readyState === qrVideo.HAVE_ENOUGH_DATA && typeof jsQR === 'function') {
    qrScanCanvas.width = qrVideo.videoWidth;
    qrScanCanvas.height = qrVideo.videoHeight;
    const ctx = qrScanCanvas.getContext('2d');
    ctx.drawImage(qrVideo, 0, 0, qrScanCanvas.width, qrScanCanvas.height);
    const imageData = ctx.getImageData(0, 0, qrScanCanvas.width, qrScanCanvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      handleQrScanResult(code.data);
      return;
    }
  }
  qrScanRAF = requestAnimationFrame(scanQrFrame);
}

async function handleQrScanResult(text) {
  const value = (text || '').trim();
  if (!value.startsWith(QR_CONTACT_PREFIX)) {
    qrScanStatus.textContent = 'Это не QR-код Искры. Попробуйте другой.';
    qrScanRAF = requestAnimationFrame(scanQrFrame);
    return;
  }
  const uid = value.slice(QR_CONTACT_PREFIX.length);
  if (!uid) {
    qrScanStatus.textContent = 'Не удалось распознать код. Попробуйте снова.';
    qrScanRAF = requestAnimationFrame(scanQrFrame);
    return;
  }
  if (uid === currentUser.uid) {
    qrScanStatus.textContent = 'Это ваш собственный код 🙂';
    qrScanRAF = requestAnimationFrame(scanQrFrame);
    return;
  }
  stopQrScan();
  qrScanStatus.textContent = 'Открываем чат…';
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      qrScanStatus.textContent = 'Пользователь не найден.';
      return;
    }
    const otherUser = { uid, ...snap.data() };
    closeQrModal();
    profileModal.style.display = 'none';
    await startPrivateChat(otherUser);
  } catch (e) {
    qrScanStatus.textContent = 'Не удалось открыть чат. Попробуйте ещё раз.';
  }
}

function refreshActiveChatHighlight() {
  document.querySelectorAll('.chat-item').forEach(i => i.classList.toggle('active', i.dataset.chatId === activeChatId));
}

function selectChat(chatId, title, meta) {
  if (activeChatId === chatId) return;
  activeChatId = chatId;
  currentChatTitle.textContent = title;
  subscribeToMessages(chatId);
  updateChatHeaderMeta(meta || { type: 'general' });
  refreshActiveChatHighlight();
  if (window.innerWidth <= 768) closeMobileSidebar();
}

function updateChatHeaderMeta(meta) {
  if (unsubscribeHeaderPresence) { unsubscribeHeaderPresence(); unsubscribeHeaderPresence = null; }
  if (meta.type === 'private' && meta.otherUid) {
    chatHeaderAvatarWrap.style.display = 'flex';
    chatHeaderStatusDot.dataset.uid = meta.otherUid;
    chatHeaderStatusDot.classList.remove('online');
    applyStatusRing(chatHeaderAvatarWrap, meta.otherUid);
    unsubscribeHeaderPresence = onSnapshot(doc(db, 'users', meta.otherUid), snap => {
      const data = snap.exists() ? snap.data() : {};
      chatHeaderAvatar.src = data.avatarUrl || DEFAULT_AVATAR;
      presenceDataCache.set(meta.otherUid, data);
      refreshPresenceUI(meta.otherUid);
    });
  } else if (meta.type === 'group') {
    chatHeaderAvatarWrap.style.display = 'none';
    delete chatHeaderStatusDot.dataset.uid;
    chatHeaderStatusDot.classList.remove('online');
    chatHeaderSub.textContent = `${meta.memberCount || ''} участник(ов)`.trim();
    chatHeaderSub.classList.remove('offline');
  } else {
    chatHeaderAvatarWrap.style.display = 'none';
    delete chatHeaderStatusDot.dataset.uid;
    chatHeaderStatusDot.classList.remove('online');
    chatHeaderSub.textContent = meta.subtitle || 'Открытый чат для всех';
    chatHeaderSub.classList.remove('offline');
  }
}

// ============ Рамка статуса вокруг аватарки (как в WhatsApp) ============
// Зелёная рамка — есть новый (ещё не просмотренный вами) статус, синяя — вы
// его уже смотрели. Если статуса нет — рамки не будет, а клик по аватарке
// просто открывает фото крупным планом.
function applyStatusRing(wrapEl, uid) {
  if (!wrapEl) return;
  const status = uid ? statusByUserMap.get(uid) : null;
  wrapEl.classList.toggle('has-status', !!status);
  wrapEl.classList.remove('status-ring-new', 'status-ring-viewed');
  if (status) {
    const viewed = !!(status.viewedBy && currentUser && status.viewedBy[currentUser.uid]);
    wrapEl.classList.add(viewed ? 'status-ring-viewed' : 'status-ring-new');
  }
  if (uid) wrapEl.dataset.statusUid = uid; else delete wrapEl.dataset.statusUid;
}
function refreshAllStatusRings() {
  document.querySelectorAll('.chat-item .avatar-wrap').forEach(wrap => {
    const item = wrap.closest('.chat-item');
    applyStatusRing(wrap, item ? item.dataset.otherUid : null);
  });
  if (chatHeaderAvatarWrap.style.display !== 'none') {
    applyStatusRing(chatHeaderAvatarWrap, chatHeaderStatusDot.dataset.uid || null);
  }
  if (sidebarAvatarWrap && currentUser) applyStatusRing(sidebarAvatarWrap, currentUser.uid);
}
// Клик по аватарке: если у человека есть активный статус — сразу открываем
// его (минуя список статусов), если статуса нет — просто показываем фото
// профиля крупным планом, как в WhatsApp.
function handleAvatarTap(uid, imgSrc, name) {
  const status = uid ? statusByUserMap.get(uid) : null;
  if (status) {
    openStatusViewer(status);
  } else {
    openAvatarViewer(imgSrc, name);
  }
}
function openAvatarViewer(src, name) {
  avatarViewerImage.src = src || DEFAULT_AVATAR;
  avatarViewerName.textContent = name || '';
  avatarViewerModal.style.display = 'flex';
}
function closeAvatarViewer() {
  avatarViewerModal.style.display = 'none';
}
avatarViewerClose.addEventListener('click', closeAvatarViewer);
avatarViewerModal.addEventListener('click', (e) => { if (e.target === avatarViewerModal) closeAvatarViewer(); });
chatHeaderAvatarWrap.addEventListener('click', () => {
  const uid = chatHeaderStatusDot.dataset.uid || null;
  handleAvatarTap(uid, safeAvatarSrc(chatHeaderAvatar), currentChatTitle.textContent);
});
if (sidebarAvatarWrap) {
  sidebarAvatarWrap.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentUser) return;
    handleAvatarTap(currentUser.uid, safeAvatarSrc(sidebarAvatar), currentUserData.nickname || 'Мой профиль');
  });
}

// ============ Статусы доставки сообщений (точки, как в WhatsApp) ============
// Одна точка — сообщение улетело на сервер и доставляется. Две синие точки —
// доставлено всем получателям, но ещё не прочитано. Две зелёные точки — все
// получатели открывали чат и видели сообщение. Показывается только на СВОИХ
// сообщениях в личных и групповых чатах (в общем чате/поддержке получателей
// слишком много и они неизвестны заранее — там точек нет).
function getChatRecipients(chatId) {
  if (!currentUser || chatId === 'general' || chatId === 'support') return [];
  const members = chatMembersCache.get(chatId) || [];
  return members.filter(uid => uid !== currentUser.uid);
}
function computeTickState(data, chatId) {
  const recipients = getChatRecipients(chatId);
  if (recipients.length === 0) return null;
  const delivered = recipients.filter(uid => data.deliveredTo && data.deliveredTo[uid]).length;
  const read = recipients.filter(uid => data.readBy && data.readBy[uid]).length;
  if (read === recipients.length) return 'read';
  if (delivered === recipients.length) return 'delivered';
  return 'sending';
}
function renderMessageTicks(msgEl, data, chatId) {
  const isOwn = currentUser && data.userId === currentUser.uid;
  let ticksEl = msgEl.querySelector('.msg-ticks');
  if (!isOwn) { if (ticksEl) ticksEl.remove(); return; }
  const state = computeTickState(data, chatId);
  if (!state) { if (ticksEl) ticksEl.remove(); return; }
  if (!ticksEl) {
    ticksEl = document.createElement('span');
    ticksEl.className = 'msg-ticks';
    const header = msgEl.querySelector('.message-header');
    if (header) header.appendChild(ticksEl);
  }
  ticksEl.className = `msg-ticks state-${state}`;
  ticksEl.innerHTML = state === 'sending' ? '<span class="tick-dot"></span>' : '<span class="tick-dot"></span><span class="tick-dot"></span>';
  ticksEl.title = state === 'sending' ? 'Доставляется' : state === 'delivered' ? 'Доставлено' : 'Прочитано';
}
// Получатель отмечает у себя чужое сообщение как доставленное — сработает,
// когда сообщение реально дошло до его устройства (пришло через подписку).
function maybeMarkDelivered(id, data) {
  if (!currentUser || data.system || data.userId === currentUser.uid) return;
  if (data.deliveredTo && data.deliveredTo[currentUser.uid]) return;
  updateDoc(doc(db, 'messages', id), { [`deliveredTo.${currentUser.uid}`]: true }).catch(() => {});
}
// И как прочитанное — только пока получатель реально смотрит именно этот
// чат и вкладка/приложение активны (не свёрнуты).
function maybeMarkRead(id, data, chatId) {
  if (!currentUser || data.system || data.userId === currentUser.uid) return;
  if (chatId !== activeChatId || document.hidden) return;
  if (data.readBy && data.readBy[currentUser.uid]) return;
  updateDoc(doc(db, 'messages', id), {
    [`readBy.${currentUser.uid}`]: true,
    [`deliveredTo.${currentUser.uid}`]: true
  }).catch(() => {});
}

function subscribeToChatList() {
  if (unsubscribeChatList) { unsubscribeChatList(); unsubscribeChatList = null; }
  const qRef = query(collection(db, 'chats'), where('members', 'array-contains', currentUser.uid), orderBy('updatedAt', 'desc'));
  unsubscribeChatList = onSnapshot(qRef, snap => {
    chatList.querySelectorAll('.dynamic-chat-item').forEach(el => el.remove());
    snap.forEach(docSnap => {
      const data = docSnap.data();
      chatMembersCache.set(docSnap.id, data.members || []); // для галочек «доставлено/прочитано»
      chatList.appendChild(renderChatListItem(docSnap.id, data));
    });
    refreshActiveChatHighlight();
    refreshAllStatusRings();
  }, (err) => {
    console.error('Ошибка подписки на список чатов (проверьте составной индекс Firestore: members array-contains + updatedAt desc):', err);
  });
}

function renderChatListItem(chatId, data) {
  const li = document.createElement('li');
  li.className = 'chat-item dynamic-chat-item';
  li.dataset.chatId = chatId;
  li.dataset.type = data.type;

  let iconHtml, name, preview;
  if (data.type === 'private') {
    const otherUid = (data.members || []).find(m => m !== currentUser.uid);
    const info = (data.memberInfo && data.memberInfo[otherUid]) || {};
    li.dataset.otherUid = otherUid || '';
    name = info.nickname || 'Пользователь';
    preview = data.lastMessage?.text || 'Нет сообщений';
    iconHtml = `<div class="avatar-wrap"><img class="chat-avatar" src="${escapeHtml(info.avatarUrl || DEFAULT_AVATAR)}" alt=""><span class="status-dot" data-uid="${escapeHtml(otherUid || '')}"></span></div>`;
    if (otherUid) ensureUserStatusListener(otherUid);
  } else {
    name = data.name || 'Группа';
    preview = data.lastMessage?.text || `${(data.members || []).length} участников`;
    li.dataset.memberCount = (data.members || []).length;
    iconHtml = `<span class="chat-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none"><circle cx="9" cy="8.2" r="3" stroke="currentColor" stroke-width="1.8"/><circle cx="16.3" cy="9.6" r="2.4" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 19c.7-3 3-4.6 5.5-4.6s4.8 1.6 5.5 4.6M14.3 19c.4-1.9 1.7-3.3 3.4-3.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>`;
  }

  li.innerHTML = `
    ${iconHtml}
    <div class="chat-item-text">
      <span class="chat-name">${escapeHtml(name)}</span>
      <span class="chat-preview">${escapeHtml(preview)}</span>
    </div>`;
  if (data.type === 'private') {
    const wrap = li.querySelector('.avatar-wrap');
    applyStatusRing(wrap, li.dataset.otherUid || null);
  }
  return li;
}

// Модальное окно "Новый чат"
function setNewChatMode(mode) {
  newChatMode = mode;
  modePrivateBtn.classList.toggle('active', mode === 'private');
  modeGroupBtn.classList.toggle('active', mode === 'group');
  groupNameGroup.style.display = mode === 'group' ? 'block' : 'none';
  createGroupBtn.style.display = mode === 'group' ? 'inline-flex' : 'none';
  stagedMembersEl.style.display = mode === 'group' ? 'flex' : 'none';
  searchHint.textContent = mode === 'private'
    ? 'Введите точное совпадение никнейма, email или номера телефона собеседника.'
    : 'Найдите и добавьте участников будущей группы, затем нажмите «Создать группу».';
}
function openNewChatModal() {
  setNewChatMode('private');
  stagedMembers = [];
  renderStagedChips();
  userSearchInput.value = '';
  searchResultsEl.innerHTML = '';
  groupNameInput.value = '';
  newChatModal.style.display = 'flex';
}
function closeNewChatModal() {
  newChatModal.style.display = 'none';
}
modePrivateBtn.addEventListener('click', () => setNewChatMode('private'));
modeGroupBtn.addEventListener('click', () => setNewChatMode('group'));
newChatBtn.addEventListener('click', openNewChatModal);
closeNewChatBtn.addEventListener('click', closeNewChatModal);
userSearchBtn.addEventListener('click', async () => {
  const results = await searchUsers(userSearchInput.value);
  renderSearchResults(results);
});
userSearchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); userSearchBtn.click(); }
});
createGroupBtn.addEventListener('click', createGroupChat);

// Чат
function subscribeToMessages(chatId) {
  if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; }
  messagesList.innerHTML = '';
  activeChatMessagesCache = new Map();
  let firstBatch = true;
  const qRef = query(collection(db, 'messages'), where('chatId','==',chatId), orderBy('timestamp','asc'));
  unsubscribeMessages = onSnapshot(qRef, snap => {
    const wasAtBottom = isScrolledToBottom();
    let added = false;
    snap.docChanges().forEach(change => {
      const data = change.doc.data();
      if (change.type === 'added') {
        addMessageToUI(change.doc.id, data, chatId);
        added = true;
        activeChatMessagesCache.set(change.doc.id, data);
        maybeMarkDelivered(change.doc.id, data);
        maybeMarkRead(change.doc.id, data, chatId);
      } else if (change.type === 'modified') {
        activeChatMessagesCache.set(change.doc.id, data);
        updateMessageInUI(change.doc.id, data, chatId);
      }
    });
    if (added && (firstBatch || wasAtBottom)) scrollToBottom();
    firstBatch = false;
  }, (err) => {
    console.error('Ошибка подписки на сообщения (проверьте составной индекс Firestore: chatId == + timestamp asc):', err);
  });
}
function updateMessageInUI(id, data, chatId) {
  const el = document.getElementById(`msg-${id}`);
  if (!el) return;
  const timeEl = el.querySelector('.message-time');
  if (timeEl) timeEl.textContent = formatTime(data.timestamp);
  renderMessageTicks(el, data, chatId);
}
function addMessageToUI(id, data, chatId) {
  if (document.getElementById(`msg-${id}`)) return;

  if (data.system) {
    const sysEl = document.createElement('div');
    sysEl.id = `msg-${id}`;
    sysEl.className = 'message system-message';
    const bubble = document.createElement('div');
    bubble.className = 'system-bubble';
    bubble.innerHTML = linkify(data.text);
    sysEl.appendChild(bubble);
    messagesList.appendChild(sysEl);
    return;
  }

  const isOwn = currentUser && data.userId === currentUser.uid;
  const msgEl = document.createElement('div');
  msgEl.id = `msg-${id}`;
  msgEl.className = `message ${isOwn ? 'own' : 'other'}`;

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'message-avatar-wrap avatar-wrap';
  const avatarImg = document.createElement('img');
  avatarImg.className = 'message-avatar';
  avatarImg.src = data.userAvatarUrl || DEFAULT_AVATAR;
  avatarImg.alt = 'avatar';
  const statusDot = document.createElement('span');
  statusDot.className = 'status-dot';
  if (data.userId) statusDot.dataset.uid = data.userId;
  avatarWrap.appendChild(avatarImg);
  avatarWrap.appendChild(statusDot);

  const body = document.createElement('div');
  body.className = 'message-body';
  const header = document.createElement('div');
  header.className = 'message-header';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'message-username';
  nameSpan.textContent = data.userName || 'Пользователь';
  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = formatTime(data.timestamp);
  header.appendChild(nameSpan);
  header.appendChild(timeSpan);

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  const emojiInfo = getEmojiOnlyInfo(data.text);
  if (emojiInfo) {
    bubble.classList.add('emoji-only');
    emojiInfo.graphemes.forEach(g => {
      const anim = document.createElement('span');
      anim.className = 'emoji-anim';
      bubble.appendChild(anim);
      renderAnimatedEmoji(anim, g);
    });
    bubble.addEventListener('click', () => {
      bubble.querySelectorAll('.emoji-anim').forEach((anim, i) => renderAnimatedEmoji(anim, emojiInfo.graphemes[i]));
    });
  } else {
    bubble.innerHTML = linkify(data.text); // linkify экранирует HTML перед вставкой ссылок
  }
  body.appendChild(header);
  body.appendChild(bubble);

  msgEl.appendChild(avatarWrap);
  msgEl.appendChild(body);
  messagesList.appendChild(msgEl);
  renderMessageTicks(msgEl, data, chatId);

  if (data.userId) ensureUserStatusListener(data.userId);
}
async function sendMessage(text) {
  if (!currentUser || !currentUserData) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  // БАГФИКС: раньше chatId для обновления lastMessage/updatedAt читался из
  // глобальной activeChatId уже ПОСЛЕ await addDoc(...). Если человек успевал
  // переключиться на другой чат, пока сообщение ещё летело на сервер (что
  // занимает какое-то время при плохой сети), то итоговый updateDoc() уходил
  // не в тот чат — превью последнего сообщения и порядок сортировки в списке
  // чатов портились у чата, в который человек только что переключился, хотя
  // само сообщение на самом деле отправлялось в другой чат. Теперь id чата
  // фиксируется один раз в начале функции и используется везде внутри неё,
  // независимо от того, куда переключится пользователь дальше.
  const targetChatId = activeChatId;

  // БЫСТРАЯ ОТПРАВКА: поле ввода очищается сразу, не дожидаясь ответа сервера
  // (см. предыдущий фикс) — как в Telegram/WhatsApp.
  messageInput.value = '';
  messageInput.focus();

  try {
    await addDoc(collection(db, 'messages'), {
      text: trimmed,
      userId: currentUser.uid,
      userName: currentUserData.nickname || 'Пользователь',
      userAvatarUrl: currentUserData.avatarUrl || '',
      chatId: targetChatId,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    // Текст возвращаем в поле, только если пользователь всё ещё в том же
    // чате — иначе текст неотправленного сообщения из ОДНОГО чата подставился
    // бы в поле ввода СОВСЕМ ДРУГОГО чата, в который человек уже переключился.
    if (activeChatId === targetChatId) {
      messageInput.value = trimmed;
      messageInput.focus();
    }
    alert('Не удалось отправить сообщение. Проверьте подключение к интернету и попробуйте ещё раз.');
    return;
  }
  if (targetChatId !== 'general' && targetChatId !== 'support') {
    try {
      await updateDoc(doc(db, 'chats', targetChatId), {
        lastMessage: { text: trimmed, senderId: currentUser.uid, timestamp: serverTimestamp() },
        updatedAt: serverTimestamp()
      });
    } catch (e) { /* не критично для отправки самого сообщения */ }
  }
}

// Эмодзи
const emojis = ['😀','😂','😍','😎','🥳','😢','😡','👍','👎','❤️','🔥','🎉','💡','✨','🙈','🍕','🚀','⭐','⚡','💬','✅','❌','🤔','👀','💪','🙏','🤗','😴','🤩','😇'];
function renderEmojiPanel() {
  emojiPanel.innerHTML = '';
  emojis.forEach(emoji => {
    const span = document.createElement('span');
    span.textContent = emoji;
    let hoverAnim = null;
    span.addEventListener('mouseenter', () => {
      const codepoint = emojiToNotoCodepoint(emoji);
      getEmojiLottie(codepoint).then(data => {
        if (data && window.lottie && span.matches(':hover')) {
          span.textContent = '';
          hoverAnim = lottie.loadAnimation({ container: span, renderer: 'svg', loop: true, autoplay: true, animationData: data });
        }
      });
    });
    span.addEventListener('mouseleave', () => {
      if (hoverAnim) { hoverAnim.destroy(); hoverAnim = null; }
      span.textContent = emoji;
    });
    // БАГФИКС: клик по эмодзи не останавливал всплытие события, поэтому оно
    // долетало до document-обработчика ниже (закрывающего панель по клику
    // вне её) и закрывало панель СРАЗУ ЖЕ, в тот же тик — запланированная
    // ниже задержка в 150мс на анимацию "эмодзи подпрыгнул" не успевала
    // отработать визуально, панель исчезала мгновенно. Теперь клик по
    // эмодзи не всплывает дальше документа.
    span.addEventListener('click', (e) => {
      e.stopPropagation();
      span.classList.remove('emoji-pop');
      void span.offsetWidth;
      span.classList.add('emoji-pop');
      messageInput.value += emoji;
      messageInput.focus();
      setTimeout(() => { emojiPanel.style.display = 'none'; }, 150);
    });
    emojiPanel.appendChild(span);
  });
}
renderEmojiPanel();
emojiBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  emojiPanel.style.display = emojiPanel.style.display === 'none' ? 'grid' : 'none';
});
document.addEventListener('click', () => { emojiPanel.style.display = 'none'; });

// Анимации фона
function clearAnimation() {
  const old = mainChat.querySelector('.animation-container');
  if (old) old.remove();
  if (animationInterval) clearInterval(animationInterval);
  // БАГФИКС: переменную обязательно обнуляем, а не только очищаем интервал —
  // иначе следующая проверка `if (animationInterval)` где-либо могла бы
  // ошибочно решить, что анимация всё ещё активна.
  animationInterval = null;
}
// БАГФИКС (производительность, особенно заметно на телефонах): раньше каждая
// "частица" фоновой анимации (снежинка/капля/листик), включая те, что
// добавлялись каждые 2 секунды через setInterval, навсегда оставалась в DOM —
// её CSS-анимация падения заканчивалась, но сам элемент никто не удалял.
// За долгую сессию в чате накапливались тысячи невидимых, но всё ещё живых
// в DOM-дереве элементов, что нагружало CPU/GPU и заметно сажало батарею —
// особенно на телефонах, где ресурсов меньше, чем на ноутбуке/десктопе.
// Теперь каждая частица сама удаляет себя из DOM по событию 'animationend'.
function startAnimation(type) {
  clearAnimation();
  if (type === 'none') return;
  const container = document.createElement('div');
  container.className = 'animation-container';
  mainChat.appendChild(container);

  function spawnParticle(targetContainer, delaySeconds) {
    const particle = document.createElement('div');
    particle.className = `particle ${type}`;
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = delaySeconds + 's';
    particle.style.animationDuration = (4 + Math.random() * 6) + 's';
    particle.addEventListener('animationend', () => particle.remove());
    targetContainer.appendChild(particle);
  }

  const count = type === 'rain' ? 40 : 20;
  for (let i = 0; i < count; i++) {
    spawnParticle(container, Math.random() * 5);
  }
  animationInterval = setInterval(() => {
    const liveContainer = mainChat.querySelector('.animation-container');
    if (!liveContainer) return;
    spawnParticle(liveContainer, 0);
  }, 2000);
}

// Настройки
async function applyCurrentAnimation() {
  const anim = currentUserData.animation || 'none';
  animationSelect.value = anim;
  startAnimation(anim);
}
settingsBtn.addEventListener('click', () => {
  animationSelect.value = currentUserData.animation || 'none';
  settingsModal.style.display = 'flex';
});
closeSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'none');
saveSettingsBtn.addEventListener('click', async () => {
  const newAnim = animationSelect.value;
  if (!currentUser) return;
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { animation: newAnim });
  } catch (e) {
    alert('Не удалось сохранить настройки. Попробуйте ещё раз.');
    return;
  }
  currentUserData.animation = newAnim;
  startAnimation(newAnim);
  settingsModal.style.display = 'none';
});

// Обработчики авторизации
// БАГФИКС (двойная отправка формы): раньше кнопки «Войти»/«Зарегистрироваться»
// оставались активными всё время запроса к Firebase — если у человека был
// медленный интернет, он мог кликнуть ещё раз (или ещё несколько раз),
// запуская параллельно несколько попыток входа/регистрации одновременно.
// Это могло приводить к путанным ошибкам и лишним попыткам создать аккаунт.
// Теперь кнопка блокируется и показывает «Входим…»/«Создаём аккаунт…» на
// время запроса, а после завершения (успех или ошибка) — разблокируется.
let authInProgress = false;
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (authInProgress) return;
  clearAuthError();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const nickname = nicknameInput.value.trim();
  const regPhone = regPhoneInput.value.trim();
  if (!email||!password) return displayAuthError('Введите email и пароль');
  if (!isLoginMode && !nickname) return displayAuthError('Придумайте никнейм');

  const activeBtn = isLoginMode ? loginBtn : registerBtn;
  const originalLabel = activeBtn.textContent;
  authInProgress = true;
  loginBtn.disabled = true;
  registerBtn.disabled = true;
  activeBtn.textContent = isLoginMode ? 'Входим…' : 'Создаём аккаунт…';
  try {
    isLoginMode ? await loginUser(email, password) : await registerUser(email, password, nickname, regPhone);
  } catch (err) {
    // БАГФИКС (неполные сообщения об ошибках): раньше нераспознанные коды
    // ошибок Firebase (нет сети, слишком много попыток, забаненный аккаунт
    // и т.д.) показывали голое «Ошибка» без объяснений. Разобрал основные
    // коды по отдельности, чтобы человек понимал, что реально произошло.
    let msg = 'Что-то пошло не так. Попробуйте ещё раз.';
    const code = err.code || '';
    if (code.includes('email-already')) msg = 'Этот email уже зарегистрирован. Попробуйте войти.';
    else if (code.includes('invalid-email')) msg = 'Неверный формат email';
    else if (code.includes('weak-password')) msg = 'Пароль слишком простой — минимум 6 символов';
    else if (code.includes('missing-password')) msg = 'Введите пароль';
    else if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) msg = 'Неверный email или пароль';
    else if (code.includes('user-disabled')) msg = 'Этот аккаунт заблокирован';
    else if (code.includes('too-many-requests')) msg = 'Слишком много попыток. Подождите немного и попробуйте снова';
    else if (code.includes('network-request-failed')) msg = 'Нет соединения с интернетом. Проверьте сеть и попробуйте снова';
    displayAuthError(msg);
  } finally {
    authInProgress = false;
    loginBtn.disabled = false;
    registerBtn.disabled = false;
    activeBtn.textContent = originalLabel;
  }
});
logoutBtn.addEventListener('click', async ()=>{
  if(unsubscribeMessages){unsubscribeMessages();unsubscribeMessages=null;}
  clearAnimation();
  stopPresenceHeartbeat();
  stopQrScan();
  await setOnline(false);
  await signOut(auth);
});
messageForm.addEventListener('submit', e=>{ e.preventDefault(); sendMessage(messageInput.value); });
profileBtn.addEventListener('click', ()=>{
  profileNickname.value = currentUserData.nickname || '';
  profilePhone.value = currentUserData.phone || '';
  profileAvatarPreview.src = currentUserData.avatarUrl || DEFAULT_AVATAR;
  profileModal.style.display = 'flex';
});
closeModalBtn.addEventListener('click', ()=> profileModal.style.display='none');
profileQrBtn.addEventListener('click', openQrModal);
qrCloseBtn.addEventListener('click', closeQrModal);
qrScanBtn.addEventListener('click', startQrScan);
qrBackBtn.addEventListener('click', showQrMyView);
avatarInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Пожалуйста, выберите файл изображения.'); avatarInput.value = ''; return; }
  try {
    // ФИЧА (качество аватарки): раньше аватар сжимался до 200×200 при качестве
    // JPEG 0.7 — на больших экранах и retina-дисплеях это выглядело мыльно.
    // Теперь используем более крупный исходник (480×480) и качество 0.85 —
    // сама аватарка в интерфейсе рисуется всё того же небольшого размера,
    // но выглядит заметно чётче на дисплеях с высокой плотностью пикселей.
    const dataUrl = await compressImage(file, 480, 480, 0.85);
    profileAvatarPreview.src = dataUrl;
  } catch (err) {
    alert('Не удалось загрузить изображение. Попробуйте другой файл.');
  }
  avatarInput.value = '';
});
saveProfileBtn.addEventListener('click', async ()=>{
  const newNick = profileNickname.value.trim() || currentUserData.nickname;
  const newAvatar = profileAvatarPreview.src;
  const newPhone = profilePhone.value.trim();
  try {
    await updateProfile(newNick, newAvatar, newPhone);
  } catch (e) {
    alert('Не удалось сохранить профиль. Попробуйте ещё раз.');
    return;
  }
  profileModal.style.display = 'none';
});

// Переключение чата
chatList.addEventListener('click', e=>{
  const avatarWrap = e.target.closest('.avatar-wrap');
  if (avatarWrap) {
    const parentItem = avatarWrap.closest('.chat-item');
    if (parentItem && parentItem.dataset.type === 'private') {
      e.stopPropagation();
      const uid = parentItem.dataset.otherUid || null;
      const imgEl = avatarWrap.querySelector('img');
      const name = parentItem.querySelector('.chat-name')?.textContent || 'Пользователь';
      handleAvatarTap(uid, safeAvatarSrc(imgEl), name);
      return;
    }
  }
  const item = e.target.closest('.chat-item');
  if(!item) return;
  const id = item.dataset.chatId;
  const name = item.querySelector('.chat-name').textContent;
  const type = item.dataset.type || 'general';
  const meta = type === 'private'
    ? { type: 'private', otherUid: item.dataset.otherUid }
    : type === 'group'
      ? { type: 'group', memberCount: item.dataset.memberCount }
      : { type: 'general', subtitle: id === 'support' ? 'Мы поможем с любым вопросом' : 'Открытый чат для всех' };
  selectChat(id, name, meta);
  // selectChat() выходит раньше времени, если тапнули по уже активному чату
  // (id не меняется) — но на телефоне сайдбар всё равно должен закрыться в
  // любом случае, поэтому закрываем его отдельно, вне зависимости от того,
  // сработала ли внутренняя логика selectChat().
  if (window.innerWidth <= 768) closeMobileSidebar();
});

// ============ Статусы (БЕТА) — как в WhatsApp: текст/фото на 24 часа ============
// БАГФИКС (главный баг статусов: свой статус не появлялся сразу после
// публикации): раньше запрос фильтровался и сортировался по полю createdAt,
// а оно записывается через serverTimestamp(). Пока Firestore не подтвердит
// запись сервером, локально (оптимистично) это поле равно null — а null не
// проходит фильтр "> cutoff", поэтому только что опубликованный статус на
// секунду-другую пропадал из списка (а на медленной сети — заметно дольше),
// хотя publishStatus() отработал без ошибок. Поле expireAt, наоборот,
// вычисляется на клиенте (Timestamp.fromMillis(...)) и никогда не бывает
// null даже до подтверждения сервером — фильтруем и сортируем по нему.
function subscribeToStatuses() {
  if (unsubscribeStatuses) return; // уже подписаны
  const nowTs = Timestamp.fromMillis(Date.now());
  const qRef = query(collection(db, 'statuses'), where('expireAt', '>', nowTs), orderBy('expireAt', 'desc'));
  unsubscribeStatuses = onSnapshot(qRef, snap => {
    currentStatuses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    statusByUserMap = new Map();
    currentStatuses.forEach(s => { if (!statusByUserMap.has(s.userId)) statusByUserMap.set(s.userId, s); });
    if (statusModal.style.display !== 'none') renderStatusModalContent();
    refreshOpenStatusViewer();
    refreshAllStatusRings();
  }, (err) => {
    console.error('Ошибка подписки на статусы:', err);
  });
  cleanupExpiredStatuses();
  if (!statusCleanupInterval) {
    statusCleanupInterval = setInterval(cleanupExpiredStatuses, 5 * 60 * 1000);
  }
}
function stopStatusSubscription() {
  if (unsubscribeStatuses) { unsubscribeStatuses(); unsubscribeStatuses = null; }
  if (statusCleanupInterval) { clearInterval(statusCleanupInterval); statusCleanupInterval = null; }
  currentStatuses = [];
}
async function cleanupExpiredStatuses() {
  try {
    const nowTs = Timestamp.fromMillis(Date.now());
    const expiredQuery = query(collection(db, 'statuses'), where('expireAt', '<=', nowTs));
    const snap = await getDocs(expiredQuery);
    if (snap.empty) return;
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'statuses', d.id)).catch(() => {})));
  } catch (e) {
    console.error('Ошибка фоновой очистки просроченных статусов:', e);
  }
}

function latestStatusPerUser(excludeSelf) {
  const map = new Map();
  currentStatuses.forEach(s => {
    if (excludeSelf && s.userId === currentUser.uid) return;
    if (!map.has(s.userId)) map.set(s.userId, s);
  });
  return Array.from(map.values());
}

function openStatusModal() {
  statusModal.style.display = 'flex';
  hideStatusAddForm();
  subscribeToStatuses();
  renderStatusModalContent();
}
function closeStatusModal() {
  statusModal.style.display = 'none';
}
function renderStatusModalContent() {
  const myLatest = currentStatuses.find(s => s.userId === currentUser.uid);
  myStatusRow.innerHTML = '';
  const myRow = document.createElement('div');
  myRow.className = 'status-row my-status';
  if (myLatest) {
    const viewerCount = Object.keys(myLatest.viewedBy || {}).length;
    myRow.innerHTML = `
      <div class="status-avatar-ring"><img src="${escapeHtml(myLatest.imageUrl || currentUserData.avatarUrl || DEFAULT_AVATAR)}" alt=""></div>
      <div class="status-info">
        <span class="status-name">Мой статус</span>
        <span class="status-meta">${escapeHtml(formatTime(myLatest.createdAt))} · просмотров: ${viewerCount}</span>
      </div>`;
    myRow.addEventListener('click', () => openStatusViewer(myLatest));
  } else {
    myRow.innerHTML = `
      <div class="status-add-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></div>
      <div class="status-info">
        <span class="status-name">Добавить статус</span>
        <span class="status-meta">Текст или фото, будет видно 24 часа</span>
      </div>`;
    myRow.addEventListener('click', () => showStatusAddForm());
  }
  myStatusRow.appendChild(myRow);

  const others = latestStatusPerUser(true);
  statusListEl.innerHTML = '';
  if (others.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'search-empty';
    empty.textContent = 'Пока никто не опубликовал статус.';
    statusListEl.appendChild(empty);
  } else {
    others.forEach(s => {
      const viewed = !!(s.viewedBy && s.viewedBy[currentUser.uid]);
      const row = document.createElement('div');
      row.className = 'status-row' + (viewed ? ' viewed' : '');
      row.innerHTML = `
        <div class="status-avatar-ring"><img src="${escapeHtml(s.imageUrl || s.userAvatarUrl || DEFAULT_AVATAR)}" alt=""></div>
        <div class="status-info">
          <span class="status-name">${escapeHtml(s.userName || 'Пользователь')}</span>
          <span class="status-meta">${escapeHtml(formatTime(s.createdAt))}</span>
        </div>`;
      row.addEventListener('click', () => openStatusViewer(s));
      statusListEl.appendChild(row);
    });
  }
}

function showStatusAddForm() {
  statusAddForm.style.display = 'flex';
  statusTextInput.value = '';
  statusImageInput.value = '';
  pendingStatusImage = '';
  statusImagePreview.style.display = 'none';
  statusImagePreview.src = '';
}
function hideStatusAddForm() {
  statusAddForm.style.display = 'none';
}

// БАГФИКС (лимит размера документа Firestore): один документ не может
// превышать 1 МиБ. Качество, которое нужно для читаемого статуса (см. ниже),
// на очень "тяжёлых" фото (например, детальный скриншот с мелким текстом)
// иногда даёт base64-строку в сотни килобайт и может подойти к лимиту.
// Раньше это привело бы к тому, что publishStatus() падал с общей ошибкой
// "Не удалось опубликовать статус" уже ПОСЛЕ того, как пользователь заполнил
// форму — неприятный сюрприз в самом конце. Теперь если сжатая картинка
// всё ещё слишком большая, мы автоматически пересжимаем её ступенчато с
// понижением качества/размера, пока она не влезет в безопасный лимит.
const STATUS_IMAGE_SAFE_BYTES = 700 * 1024; // запас под остальные поля документа
async function compressImageForStatus(file) {
  const attempts = [
    [1280, 1280, 0.9],
    [1280, 1280, 0.75],
    [960, 960, 0.7],
    [720, 720, 0.65]
  ];
  let result = null;
  for (const [w, h, q] of attempts) {
    result = await compressImage(file, w, h, q);
    if (result.length <= STATUS_IMAGE_SAFE_BYTES) return result;
  }
  return result; // если совсем не влезло — вернём самый лёгкий вариант, publishStatus сам сообщит об ошибке
}
statusImageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Пожалуйста, выберите файл изображения.'); statusImageInput.value = ''; return; }
  try {
    // БАГФИКС (качество картинок в статусах): раньше фото в статусах сжималось
    // до 480×480 с качеством JPEG 0.7 — этого хватало для аватара, но для
    // статуса (где часто фотографируют текст, скриншоты, афиши) этого было
    // мало: буквы превращались в кашу. Теперь для статусов используем до
    // 1280×1280 и качество до 0.9 — заметно чётче, текст на фото читается.
    pendingStatusImage = await compressImageForStatus(file);
    statusImagePreview.src = pendingStatusImage;
    statusImagePreview.style.display = 'block';
  } catch (err) {
    alert('Не удалось загрузить изображение. Попробуйте другой файл.');
  }
});

async function publishStatus() {
  const text = statusTextInput.value.trim();
  if (!text && !pendingStatusImage) { alert('Добавьте текст или фото для статуса.'); return; }
  try {
    await addDoc(collection(db, 'statuses'), {
      userId: currentUser.uid,
      userName: currentUserData.nickname || 'Пользователь',
      userAvatarUrl: currentUserData.avatarUrl || '',
      text: text || '',
      imageUrl: pendingStatusImage || '',
      viewedBy: {},
      createdAt: serverTimestamp(),
      expireAt: Timestamp.fromMillis(Date.now() + STATUS_LIFETIME_MS)
    });
  } catch (e) {
    alert('Не удалось опубликовать статус. Попробуйте ещё раз.');
    return;
  }
  hideStatusAddForm();
}

let openStatusViewerId = null; // id статуса, который сейчас открыт в просмотрщике (для живого обновления)
function openStatusViewer(status) {
  const isReopen = openStatusViewerId === status.id;
  openStatusViewerId = status.id;
  statusViewer.style.display = 'flex';
  statusViewerAvatar.src = status.userAvatarUrl || DEFAULT_AVATAR;
  statusViewerName.textContent = status.userId === currentUser.uid ? 'Мой статус' : (status.userName || 'Пользователь');
  statusViewerTime.textContent = formatTime(status.createdAt);
  if (status.imageUrl) {
    statusViewerImage.src = status.imageUrl;
    statusViewerImage.style.display = 'block';
  } else {
    statusViewerImage.style.display = 'none';
    statusViewerImage.src = '';
  }
  statusViewerText.textContent = status.text || '';

  const isOwn = status.userId === currentUser.uid;
  if (isOwn) {
    statusViewerViewersWrap.style.display = 'block';
    const entries = Object.entries(status.viewedBy || {}).sort((a, b) => {
      const at = a[1]?.at?.toMillis ? a[1].at.toMillis() : 0;
      const bt = b[1]?.at?.toMillis ? b[1].at.toMillis() : 0;
      return bt - at;
    });
    statusViewersList.innerHTML = '';
    if (entries.length === 0) {
      const none = document.createElement('div');
      none.className = 'status-viewer-viewer-item';
      none.textContent = 'Пока никто не смотрел';
      statusViewersList.appendChild(none);
    } else {
      entries.forEach(([uid, info]) => {
        const item = document.createElement('div');
        item.className = 'status-viewer-viewer-item';
        item.innerHTML = `<img src="${escapeHtml(info.avatarUrl || DEFAULT_AVATAR)}" alt=""><span>${escapeHtml(info.nickname || 'Пользователь')}</span><span class="viewer-time">${escapeHtml(formatTime(info.at))}</span>`;
        statusViewersList.appendChild(item);
      });
    }
  } else {
    statusViewerViewersWrap.style.display = 'none';
    // БАГФИКС (дублирующиеся записи о просмотре): раньше эта запись отправлялась
    // при каждом вызове openStatusViewer(), а после добавления живого обновления
    // (refreshOpenStatusViewer) эта функция стала вызываться повторно, пока окно
    // просмотра открыто. Из-за задержки между отправкой updateDoc() и приходом
    // подтверждённых данных обратно через onSnapshot поле status.viewedBy ещё
    // какое-то время оставалось "старым", и условие ниже могло сработать
    // повторно — в базу летело несколько записей о просмотре одного и того же
    // человека подряд. Теперь при повторном открытии/обновлении уже открытого
    // статуса запись не отправляется повторно.
    if (!isReopen && (!status.viewedBy || !status.viewedBy[currentUser.uid])) {
      updateDoc(doc(db, 'statuses', status.id), {
        [`viewedBy.${currentUser.uid}`]: {
          at: serverTimestamp(),
          nickname: currentUserData.nickname || 'Пользователь',
          avatarUrl: currentUserData.avatarUrl || ''
        }
      }).catch(() => { /* не критично — в следующий раз просто попробуем снова */ });
    }
  }
}
function closeStatusViewer() {
  openStatusViewerId = null;
  statusViewer.style.display = 'none';
}
// БАГФИКС (статусы не обновлялись в реальном времени во время просмотра):
// раньше при обновлении подписки (кто-то новый посмотрел статус, счётчик
// "просмотров: N" должен вырасти) обновлялось только содержимое модалки со
// списком статусов, но НЕ уже открытое окно просмотра. Владелец статуса
// видел устаревшее число просмотров, пока не закрывал и не открывал окно
// заново. Также если статус истёк (или его удалили) прямо во время
// просмотра — окно раньше просто продолжало показывать protuhший статус.
// Теперь окно просмотра само подхватывает актуальные данные при каждом
// обновлении подписки на статусы.
function refreshOpenStatusViewer() {
  if (!openStatusViewerId || statusViewer.style.display === 'none') return;
  const fresh = currentStatuses.find(s => s.id === openStatusViewerId);
  if (!fresh) { closeStatusViewer(); return; }
  openStatusViewer(fresh);
}

statusNavBtn.addEventListener('click', openStatusModal);
closeStatusModalBtn.addEventListener('click', closeStatusModal);
statusCancelBtn.addEventListener('click', hideStatusAddForm);
statusPublishBtn.addEventListener('click', publishStatus);
statusViewerClose.addEventListener('click', closeStatusViewer);

// Мобильное меню
function openMobileSidebar() {
  sidebar.classList.add('open');
  sidebarScrim.classList.add('show');
}
function closeMobileSidebar() {
  sidebar.classList.remove('open');
  sidebarScrim.classList.remove('show');
}
document.getElementById('menu-toggle').addEventListener('click', openMobileSidebar);
document.getElementById('close-sidebar').addEventListener('click', closeMobileSidebar);
sidebarScrim.addEventListener('click', closeMobileSidebar);

// Слежение за авторизацией
onAuthStateChanged(auth, async user => {
  authStateKnown = true;
  if (user) {
    currentUser = user;
    currentUserData = await loadUserData(user.uid, user.email);
    updateSidebarProfile();
    if (selfStatusDot) { selfStatusDot.classList.add('online'); selfStatusDot.dataset.uid = user.uid; }
    showScreen(chatScreen);
    subscribeToMessages(activeChatId);
    subscribeToChatList();
    subscribeToStatuses();
    applyCurrentAnimation();
    startPresenceHeartbeat();
    maybeSendPhoneReminder(user.uid, currentUserData);
  } else {
    currentUser=null; currentUserData={nickname:'',avatarUrl:'',animation:'none'};
    if(unsubscribeMessages){unsubscribeMessages();unsubscribeMessages=null;}
    if(unsubscribeChatList){unsubscribeChatList();unsubscribeChatList=null;}
    if(unsubscribeHeaderPresence){unsubscribeHeaderPresence();unsubscribeHeaderPresence=null;}
    stopStatusSubscription();
    statusByUserMap = new Map();
    chatMembersCache.clear();
    activeChatMessagesCache = new Map();
    closeStatusModal();
    closeStatusViewer();
    closeAvatarViewer();
    clearAnimation();
    stopPresenceHeartbeat();
    clearUserStatusListeners();
    closeMobileSidebar();
    chatList.querySelectorAll('.dynamic-chat-item').forEach(el => el.remove());
    activeChatId = 'general';
    currentChatTitle.textContent = 'Общий чат';
    updateChatHeaderMeta({ type: 'general' });
    document.querySelectorAll('.chat-item').forEach(i=>i.classList.toggle('active', i.dataset.chatId==='general'));
    messagesList.innerHTML='';
    showScreen(authScreen);
    emailInput.value=''; passwordInput.value=''; nicknameInput.value=''; regPhoneInput.value='';
    clearAuthError(); setLoginMode(true);
  }
  maybeHideSplash();
});
setLoginMode(true);

// ============ Офлайн-баннер ============
// Показываем небольшую полоску сверху, когда пропадает связь — чтобы было
// понятно, что показываются сохранённые локально данные, а не зависшее
// приложение. Firestore-подписки при этом продолжают работать из кэша (см.
// enableIndexedDbPersistence выше), поэтому уже открытые чаты и сообщения
// остаются читаемыми даже без интернета.
function updateOfflineBanner() {
  if (!offlineBanner) return;
  offlineBanner.style.display = navigator.onLine ? 'none' : 'flex';
}
window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);
updateOfflineBanner();

// ============ Регистрация Service Worker + автообнаружение обновлений ============
let swAlreadyReloading = false;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(registration => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(registration);
      }
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(registration);
          }
        });
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) registration.update().catch(() => {});
      });
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => {
      // Если регистрация не удалась (например, страница открыта как file://),
      // приложение продолжает работать в обычном режиме — просто без PWA-фич.
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swAlreadyReloading) return;
    swAlreadyReloading = true;
    window.location.reload();
  });
}

function showUpdateBanner(registration) {
  if (document.querySelector('.update-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'update-banner';
  const text = document.createElement('span');
  text.textContent = 'Доступно обновление «Искры»';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Обновить';
  btn.addEventListener('click', () => {
    if (registration.waiting) registration.waiting.postMessage('SKIP_WAITING');
    btn.disabled = true;
    btn.textContent = 'Обновляем…';
    setTimeout(() => {
      if (!swAlreadyReloading) { swAlreadyReloading = true; window.location.reload(); }
    }, 4000);
  });
  banner.appendChild(text);
  banner.appendChild(btn);
  document.body.insertBefore(banner, document.body.firstChild);
}
