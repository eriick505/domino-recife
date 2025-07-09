import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Importar a lógica do jogo do backend
import { DominoGame } from './game/DominoGame.js';
import { GameRoomManager } from './game/GameRoomManager.js';

const app = express();
const server = http.createServer(app);

// Configurar CORS para permitir conexões do frontend
const io = new Server(server, {
  cors: {
    origin: "*", // Em produção, especifique o domínio do frontend
    methods: ["GET", "POST"]
  }
});

// Middleware para JSON
app.use(express.json());
app.use(cors());

// Inicializar gerenciador de salas
const gameManager = new GameRoomManager();

// Rotas da API
app.get('/api/health', (req, res) => {
  res.json({ status: 'API funcionando!' });
});

app.get('/api/rooms', (req, res) => {
  res.json({ rooms: gameManager.listRooms() });
});

// Gerenciamento do jogo via WebSocket
io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);
  
  // Criar sala
  socket.on('createRoom', (data) => {
    const { roomId, playerName } = data;
    const result = gameManager.createRoom(roomId, socket.id, playerName);
    
    if (result.success) {
      socket.join(roomId);
      socket.emit('roomCreated', result.room);
      console.log(`Sala ${roomId} criada por ${playerName}`);
    } else {
      socket.emit('error', result.error);
    }
  });

  // Entrar em sala
  socket.on('joinRoom', (data) => {
    const { roomId, playerName } = data;
    const result = gameManager.joinRoom(roomId, socket.id, playerName);
    
    if (result.success) {
      socket.join(roomId);
      const room = gameManager.getRoom(roomId);
      
      // Notificar todos na sala sobre novo jogador
      io.to(roomId).emit('playerJoined', {
        playerName,
        room: room.getPublicInfo()
      });
      
      console.log(`${playerName} entrou na sala ${roomId}`);
    } else {
      socket.emit('error', result.error);
    }
  });

  // Iniciar jogo
  socket.on('startGame', () => {
    const room = gameManager.getRoomByPlayer(socket.id);
    if (!room) {
      socket.emit('error', 'Você não está em uma sala');
      return;
    }

    if (socket.id !== room.hostSocketId) {
      socket.emit('error', 'Apenas o host pode iniciar o jogo');
      return;
    }

    const result = room.startGame();
    if (result.success) {
      // Determinar qual jogador fez a primeira jogada
      const startingPlayerName = room.game.players[room.game.currentPlayer - 1 === -1 ? 3 : room.game.currentPlayer - 1].name;
      const firstPiece = room.game.board[0];
      
      // Enviar estado específico para cada jogador
      room.players.forEach(player => {
        const personalizedState = room.getGameStateForPlayer(player.socketId);
        io.to(player.socketId).emit('gameStarted', {
          ...personalizedState,
          firstMoveInfo: {
            playerName: startingPlayerName,
            piece: firstPiece
          }
        });
      });
      console.log(`Jogo iniciado na sala ${room.roomId}`);
    } else {
      socket.emit('error', result.error);
    }
  });

  // Fazer jogada
  socket.on('makeMove', (moveData) => {
    const room = gameManager.getRoomByPlayer(socket.id);
    if (!room) {
      socket.emit('error', 'Você não está em uma sala');
      return;
    }

    const result = room.makeMove(socket.id, moveData);
    if (result.success) {
      // Verificar se a rodada terminou
      if (result.roundEnded && result.winnerInfo) {
        // Enviar informações específicas sobre o fim da rodada
        room.players.forEach(player => {
          const personalizedState = room.getGameStateForPlayer(player.socketId);
          io.to(player.socketId).emit('roundEnded', {
            ...personalizedState,
            winnerInfo: result.winnerInfo
          });
        });
      } else {
        // Enviar estado atualizado específico para cada jogador
        room.players.forEach(player => {
          const personalizedState = room.getGameStateForPlayer(player.socketId);
          io.to(player.socketId).emit('gameUpdate', personalizedState);
        });
      }
    } else {
      socket.emit('error', result.error);
    }
  });

  // Passar vez
  socket.on('passTurn', () => {
    const room = gameManager.getRoomByPlayer(socket.id);
    if (!room) {
      socket.emit('error', 'Você não está em uma sala');
      return;
    }

    const result = room.passTurn(socket.id);
    if (result.success) {
      // Verificar se a rodada terminou por jogo fechado
      if (result.roundEnded && result.winnerInfo) {
        // Enviar informações específicas sobre o fim da rodada
        room.players.forEach(player => {
          const personalizedState = room.getGameStateForPlayer(player.socketId);
          io.to(player.socketId).emit('roundEnded', {
            ...personalizedState,
            winnerInfo: result.winnerInfo
          });
        });
      } else {
        // Enviar estado atualizado específico para cada jogador
        room.players.forEach(player => {
          const personalizedState = room.getGameStateForPlayer(player.socketId);
          io.to(player.socketId).emit('gameUpdate', personalizedState);
        });
      }
    } else {
      socket.emit('error', result.error);
    }
  });

  // Reiniciar jogo
  socket.on('restartGame', () => {
    const room = gameManager.getRoomByPlayer(socket.id);
    if (!room) {
      socket.emit('error', 'Você não está em uma sala');
      return;
    }

    if (socket.id !== room.hostSocketId) {
      socket.emit('error', 'Apenas o host pode reiniciar o jogo');
      return;
    }

    if (room.gameState !== 'playing') {
      socket.emit('error', 'Não há jogo em andamento para reiniciar');
      return;
    }

    const result = room.restartRound();
    if (result.success) {
      // Enviar estado específico para cada jogador após reiniciar
      room.players.forEach(player => {
        const personalizedState = room.getGameStateForPlayer(player.socketId);
        io.to(player.socketId).emit('gameStarted', {
          ...personalizedState,
          firstMoveInfo: result.firstMoveInfo
        });
      });
      console.log(`Nova rodada iniciada na sala ${room.roomId}`);
    } else {
      socket.emit('error', result.error);
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    
    const room = gameManager.getRoomByPlayer(socket.id);
    if (room) {
      const result = gameManager.leaveRoom(socket.id);
      if (result.success && room.players.length > 0) {
        io.to(room.roomId).emit('playerLeft', {
          room: room.getPublicInfo()
        });
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`API do jogo rodando em http://localhost:${PORT}`);
});