// Gerenciador de comunicação WebSocket com o backend
export class MultiplayerSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentRoom = null;
    this.playerName = null;
    this.myPlayerIndex = null;
    this.callbacks = {
      onConnected: null,
      onRoomCreated: null,
      onPlayerJoined: null,
      onGameStarted: null,
      onGameUpdate: null,
      onError: null,
      onPlayerLeft: null,
      onRoundEnded: null
    };
  }

  connect(serverUrl = 'http://localhost:3001') {
    this.socket = io(serverUrl);
    
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Conectado ao servidor:', this.socket.id);
      if (this.callbacks.onConnected) {
        this.callbacks.onConnected(this.socket.id);
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Desconectado do servidor');
    });

    this.socket.on('roomCreated', (roomData) => {
      this.currentRoom = roomData;
      console.log('Sala criada:', roomData);
      if (this.callbacks.onRoomCreated) {
        this.callbacks.onRoomCreated(roomData);
      }
    });

    this.socket.on('playerJoined', (data) => {
      this.currentRoom = data.room;
      console.log('Jogador entrou:', data.playerName);
      if (this.callbacks.onPlayerJoined) {
        this.callbacks.onPlayerJoined(data);
      }
    });

    this.socket.on('gameStarted', (gameState) => {
      console.log('Jogo iniciado!');
      if (this.callbacks.onGameStarted) {
        this.callbacks.onGameStarted(gameState);
      }
    });

    this.socket.on('gameUpdate', (gameState) => {
      console.log('Estado do jogo atualizado');
      if (this.callbacks.onGameUpdate) {
        this.callbacks.onGameUpdate(gameState);
      }
    });

    this.socket.on('roundEnded', (data) => {
      console.log('Rodada terminou:', data.winnerInfo);
      if (this.callbacks.onRoundEnded) {
        this.callbacks.onRoundEnded(data);
      }
    });

    this.socket.on('playerLeft', (data) => {
      this.currentRoom = data.room;
      console.log('Jogador saiu da sala');
      if (this.callbacks.onPlayerLeft) {
        this.callbacks.onPlayerLeft(data);
      }
    });

    this.socket.on('error', (error) => {
      console.error('Erro do servidor:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    });
  }

  // Métodos para configurar callbacks
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Ações do jogo
  createRoom(roomId, playerName) {
    if (!this.isConnected) {
      console.error('Não conectado ao servidor');
      return;
    }
    this.playerName = playerName;
    this.socket.emit('createRoom', { roomId, playerName });
  }

  joinRoom(roomId, playerName) {
    if (!this.isConnected) {
      console.error('Não conectado ao servidor');
      return;
    }
    this.playerName = playerName;
    this.socket.emit('joinRoom', { roomId, playerName });
  }

  startGame() {
    if (!this.isConnected) {
      console.error('Não conectado ao servidor');
      return;
    }
    this.socket.emit('startGame');
  }

  makeMove(pieceIndex, side) {
    if (!this.isConnected) {
      console.error('Não conectado ao servidor');
      return;
    }
    this.socket.emit('makeMove', { pieceIndex, side });
  }

  passTurn() {
    if (!this.isConnected) {
      console.error('Não conectado ao servidor');
      return;
    }
    this.socket.emit('passTurn');
  }

  restartGame() {
    if (!this.isConnected) {
      console.error('Não conectado ao servidor');
      return;
    }
    this.socket.emit('restartGame');
  }

  leaveRoom() {
    if (this.currentRoom && this.isConnected) {
      this.socket.disconnect();
      this.currentRoom = null;
      this.playerName = null;
      this.myPlayerIndex = null;
    }
  }

  // Getters
  getMySocketId() {
    return this.socket?.id;
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  getPlayerName() {
    return this.playerName;
  }

  isHost() {
    return this.currentRoom?.hostName === this.playerName;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}