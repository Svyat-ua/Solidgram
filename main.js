'use strict';

let myNick = '';
let isTyping = false;
let typingTimer = null;

const socket = io();
const $ = (id) => document.getElementById(id);
const authOverlay = $('authOverlay');
const authNickInput = $('authNickInput');
const authEnterBtn = $('authEnterBtn');
const app = $('app');
const form = $('form');
const input = $('input');
const messagesList = $('messages');
const messagesWrap = $('messagesWrap');
const userList = $('userList');
const onlineCount = $('onlineCount');
const myNickDisplay = $('myNickDisplay');
const myAvatar = $('myAvatar');
const emojiBtn = $('emojiBtn');
const emojiPicker = $('emojiPicker');
const hamburgerBtn = $('hamburgerBtn');
const sidebarBackdrop = $('sidebarBackdrop');
const sidebar = document.querySelector('.sidebar');
const messageInput = document.getElementById('input');

emojiPicker.addEventListener('click', (event) => {
  const item = event.target.closest('span');
  if (!item) return;
  const emoji = item.dataset.emoji || item.textContent.trim();
  if (!emoji) return;

  messageInput.value += emoji;
  messageInput.focus();
  emojiPicker.classList.remove('open');
});

function enterChat(nick) {
  const cleanNick = String(nick || '').trim().slice(0, 20);

  if (!cleanNick) {
    authNickInput?.focus();
    return;
  }

  myNick = cleanNick;

  try {
    localStorage.setItem('pepegram_nick', myNick);
  } catch (error) {
    console.warn('Не вдалося зберегти нік:', error);
  }

  if (myNickDisplay) myNickDisplay.textContent = myNick;
  if (myAvatar) myAvatar.textContent = myNick[0].toUpperCase();

  if (authOverlay) authOverlay.style.display = 'none';
  if (app) app.style.display = 'flex';

  socket.emit('setUsername', myNick);

  input?.focus();
}

authEnterBtn?.addEventListener('click', () => {
  enterChat(authNickInput?.value);
});

authNickInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    enterChat(authNickInput.value);
  }
});

try {
  const savedNick = localStorage.getItem('pepegram_nick');

  if (savedNick && authNickInput) {
    authNickInput.value = savedNick;
  }
} catch (error) {
  console.warn('LocalStorage недоступний:', error);
}

function openSidebar() {
  sidebar?.classList.add('open');
  sidebarBackdrop?.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar?.classList.remove('open');
  sidebarBackdrop?.classList.remove('visible');
  document.body.style.overflow = '';
}

hamburgerBtn?.addEventListener('click', () => {
  if (sidebar?.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarBackdrop?.addEventListener('click', closeSidebar);

function closeSidebarOnMobile() {
  if (window.innerWidth <= 768) {
    closeSidebar();
  }
}

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    closeSidebar();
  }
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();

  const text = input?.value.trim();

  if (!text || !myNick) return;

  input.value = '';

  if (isTyping) {
    isTyping = false;
    clearTimeout(typingTimer);
    socket.emit('stopTyping');
  }

  socket.emit('chat message', {
    text,
    nick: myNick
  });

  input.focus();

  playSendSound();
});

input?.addEventListener('input', () => {
  if (!myNick) return;

  if (!isTyping) {
    isTyping = true;
    socket.emit('userTyping', myNick);
  }

  clearTimeout(typingTimer);

  typingTimer = setTimeout(() => {
    isTyping = false;
    socket.emit('stopTyping');
  }, 1800);
});

socket.on('chat message', (message) => {
  if (!message || typeof message.text !== 'string') return;

  const nick = String(message.nick || 'Анонім');
  const isOwn = nick === myNick;

  addMessage(
    message.text,
    nick,
    isOwn ? 'outgoing' : 'incoming'
  );

  if (!isOwn) {
    playReceiveSound();
  }
});

socket.on('onlineUsers', (users) => {
  if (!userList || !Array.isArray(users)) return;

  userList.replaceChildren();

  users.forEach((user) => {
    const nick = String(user || 'Анонім');
    const li = document.createElement('li');

    const avatar = document.createElement('span');
    avatar.className = 'u-avatar';
    avatar.textContent = nick[0]?.toUpperCase() || '?';

    const name = document.createElement('span');
    name.textContent = nick;

    const dot = document.createElement('span');
    dot.className = 'u-dot';

    li.append(avatar, name, dot);
    userList.appendChild(li);
  });

  if (onlineCount) {
    onlineCount.textContent = `${users.length} онлайн`;
  }
});

socket.on('system', (message) => {
  addSystemMessage(message);
});

function addMessage(text, nick, direction) {
  if (!messagesList) return;

  const li = document.createElement('li');
  li.className = `msg-item ${direction}`;

  const now = new Date();
  const time = now.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const nickElement = document.createElement('div');
  nickElement.className = 'msg-nick';
  nickElement.textContent = nick;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  const timeElement = document.createElement('div');
  timeElement.className = 'msg-time';
  timeElement.textContent = time;

  li.append(nickElement, bubble, timeElement);
  messagesList.appendChild(li);

  scrollToBottom();
}

function addSystemMessage(message) {
  if (!messagesList) return;

  const li = document.createElement('li');
  li.className = 'msg-item system';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = String(message ?? '');

  li.appendChild(bubble);
  messagesList.appendChild(li);

  scrollToBottom();
}

function scrollToBottom() {
  if (!messagesWrap) return;

  messagesWrap.scrollTop = messagesWrap.scrollHeight;
}

emojiBtn?.addEventListener('click', (event) => {
  event.stopPropagation();
  emojiPicker?.classList.toggle('open');
});

emojiPicker?.querySelectorAll('span').forEach((span) => {
  span.addEventListener('click', (event) => {
    event.stopPropagation();

    if (!input) return;

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    input.setRangeText(
      span.textContent,
      start,
      end,
      'end'
    );

    input.focus();
    emojiPicker.classList.remove('open');
  });
});

emojiPicker?.addEventListener('click', (event) => {
  event.stopPropagation();
});

document.addEventListener('click', () => {
  emojiPicker?.classList.remove('open');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && isTyping) {
    isTyping = false;
    clearTimeout(typingTimer);
    socket.emit('stopTyping');
  }
});

socket.on('connect', () => {
  console.log('Pepegram: підключено до сервера');
});

socket.on('connect_error', (error) => {
  console.error('Помилка підключення до чату:', error.message);
});

