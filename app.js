// ═══════════════════════════════════════
//  PEPEGRAM — app.js
// ═══════════════════════════════════════

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

// Парсимо JSON-тіло запитів
app.use(express.json());

// Роздаємо статику з папки public
app.use(express.static(__dirname + '/public')); 

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Зберігаємо онлайн-користувачів: socketId -> nick
const users = {};

io.on('connection', (socket) => {
  console.log(`[+] Підключено: ${socket.id}`);

  // ── Встановити нікнейм ──────────────────────────────────────
  socket.on('setUsername', (nick) => {
    const oldNick = users[socket.id];
    users[socket.id] = nick;

    if (oldNick && oldNick !== nick) {
      // Повідомляємо всіх про зміну ніку
      io.emit('system', `${oldNick} змінив нік на ${nick}`);
    } else if (!oldNick) {
      // Новий користувач зайшов
      io.emit('system', `${nick} приєднався до чату 👋`);
    }

    // Оновлюємо список онлайн для всіх
    io.emit('onlineUsers', Object.values(users));
  });

  // ── Повідомлення в чат ──────────────────────────────────────
  socket.on('chat message', ({ text, nick }) => {
    io.emit('chat message', { text, nick });
  });

  // ── Відключення ─────────────────────────────────────────────
  socket.on('disconnect', () => {
    const nick = users[socket.id];
    if (nick) {
      io.emit('system', `${nick} покинув чат`);
    }
    delete users[socket.id];
    io.emit('onlineUsers', Object.values(users));
    console.log(`[-] Відключено: ${socket.id} (${nick || 'анонім'})`);
  });
});

// Запускаємо сервер
const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  console.log('Solidgram запущено на http://localhost:3000');
});