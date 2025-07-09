import { DominoGame } from './DominoGame.js';

// Gerenciador de salas e partidas
export class GameRoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> GameRoom
    this.playerRooms = new Map(); // socketId -> roomId
  }

  createRoom(roomId, hostSocketId, hostName) {
    if (this.rooms.has(roomId)) {
      return { success: false, error: 'Sala já existe' };
    }

    const room = new GameRoom(roomId, hostSocketId, hostName);
    this.rooms.set(roomId, room);
    this.playerRooms.set(hostSocketId, roomId);

    return { success: true, room: room.getPublicInfo() };
  }

  joinRoom(roomId, socketId, playerName) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Sala não encontrada' };
    }

    const result = room.addPlayer(socketId, playerName);
    if (result.success) {
      this.playerRooms.set(socketId, roomId);
    }

    return result;
  }

  leaveRoom(socketId) {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return { success: false, error: 'Jogador não está em uma sala' };

    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Sala não encontrada' };

    const result = room.removePlayer(socketId);
    this.playerRooms.delete(socketId);

    // Remove sala vazia
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    }

    return result;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRoomByPlayer(socketId) {
    const roomId = this.playerRooms.get(socketId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  listRooms() {
    return Array.from(this.rooms.values()).map(room => room.getPublicInfo());
  }
}

// Classe para gerenciar uma sala individual
export class GameRoom {
  constructor(roomId, hostSocketId, hostName) {
    this.roomId = roomId;
    this.hostSocketId = hostSocketId;
    this.players = [{ socketId: hostSocketId, name: hostName }];
    this.maxPlayers = 4;
    this.game = null;
    this.gameState = 'waiting'; // waiting, playing, finished
    this.createdAt = new Date();
  }

  addPlayer(socketId, playerName) {
    if (this.players.length >= this.maxPlayers) {
      return { success: false, error: 'Sala lotada' };
    }

    if (this.players.some(p => p.socketId === socketId)) {
      return { success: false, error: 'Jogador já está na sala' };
    }

    this.players.push({ socketId, name: playerName });
    return { success: true, playerCount: this.players.length };
  }

  removePlayer(socketId) {
    const index = this.players.findIndex(p => p.socketId === socketId);
    if (index === -1) {
      return { success: false, error: 'Jogador não encontrado na sala' };
    }

    this.players.splice(index, 1);

    // Se o host saiu, promover próximo jogador ou encerrar sala
    if (socketId === this.hostSocketId && this.players.length > 0) {
      this.hostSocketId = this.players[0].socketId;
    }

    return { success: true, playerCount: this.players.length };
  }

  startGame() {
    if (this.players.length !== 4) {
      return { success: false, error: 'Precisa de exatamente 4 jogadores' };
    }

    if (this.gameState !== 'waiting') {
      return { success: false, error: 'Jogo já iniciado' };
    }

    const playerNames = this.players.map(p => p.name);
    this.game = new DominoGame(playerNames);
    this.gameState = 'playing';

    // Determinar o jogador inicial baseado na maior dupla
    const { playerIndex } = this.game.determineStartingPlayer();
    this.game.currentPlayer = playerIndex;

    // Não faz a jogada automática! O jogador deve jogar manualmente a maior dupla

    return { success: true, gameState: this.getGameState() };
  }

  restartRound() {
    if (!this.game) {
      return { success: false, error: 'Nenhum jogo em andamento' };
    }

    if (this.gameState !== 'playing') {
      return { success: false, error: 'Jogo não está em andamento' };
    }

    // Iniciar nova rodada mantendo os scores
    this.game.startNewRound();

    // Determinar o jogador inicial baseado na maior dupla
    const { playerIndex } = this.game.determineStartingPlayer();
    this.game.currentPlayer = playerIndex;

    // Não faz a jogada automática! O jogador deve jogar manualmente a maior dupla

    return { 
      success: true, 
      gameState: this.getGameState(),
      firstMoveInfo: {
        playerName: this.game.players[playerIndex].name
      }
    };
  }

  makeMove(socketId, moveData) {
    if (!this.game || this.gameState !== 'playing') {
      return { success: false, error: 'Jogo não está em andamento' };
    }

    const playerIndex = this.players.findIndex(p => p.socketId === socketId);
    if (playerIndex === -1) {
      return { success: false, error: 'Jogador não encontrado' };
    }

    if (playerIndex !== this.game.currentPlayer) {
      return { success: false, error: 'Não é sua vez' };
    }

    const { pieceIndex, side } = moveData;
    const result = this.game.playPiece(playerIndex, pieceIndex, side);

    if (!result) {
      return { success: false, error: 'Jogada inválida' };
    }

    // Verificar se o jogo terminou
    if (this.game.isRoundOver()) {
      const winnerInfo = this.game.getRoundWinnerInfo();
      if (winnerInfo) {
        this.game.awardPoints(winnerInfo.teamIndex, 1);
        
        // Adicionar informações detalhadas sobre o fim da rodada
        if (this.game.isMatchOver()) {
          this.gameState = 'finished';
        }
        
        // Retornar informações completas sobre a vitória
        return { 
          success: true, 
          gameState: this.getGameState(),
          roundEnded: true,
          winnerInfo: winnerInfo
        };
      }
    }

    return { success: true, gameState: this.getGameState() };
  }

  passTurn(socketId) {
    if (!this.game || this.gameState !== 'playing') {
      return { success: false, error: 'Jogo não está em andamento' };
    }

    const playerIndex = this.players.findIndex(p => p.socketId === socketId);
    if (playerIndex !== this.game.currentPlayer) {
      return { success: false, error: 'Não é sua vez' };
    }

    this.game.passTurn();
    
    // Verificar se o jogo terminou por jogo fechado (4 passes consecutivos)
    if (this.game.isRoundOver()) {
      const winnerInfo = this.game.getRoundWinnerInfo();
      if (winnerInfo) {
        this.game.awardPoints(winnerInfo.teamIndex, 1);
        
        if (this.game.isMatchOver()) {
          this.gameState = 'finished';
        }
        
        return { 
          success: true, 
          gameState: this.getGameState(),
          roundEnded: true,
          winnerInfo: winnerInfo
        };
      }
    }
    
    return { success: true, gameState: this.getGameState() };
  }

  // Método modificado para enviar estado específico para cada jogador
  getGameStateForPlayer(requestingSocketId) {
    if (!this.game) return null;

    // Encontrar o índice do jogador que está solicitando
    const requestingPlayerIndex = this.players.findIndex(p => p.socketId === requestingSocketId);

    return {
      board: this.game.board,
      scores: this.game.scores,
      teamNames: this.game.teamNames,
      currentPlayer: this.game.currentPlayer,
      players: this.game.players.map((player, index) => ({
        name: player.name,
        pieceCount: player.pieces.length,
        pieces: index === requestingPlayerIndex ? player.pieces : [] // Só mostra peças do próprio jogador
      })),
      standby: this.game.standby,
      gameState: this.gameState,
      isRoundOver: this.game.isRoundOver(),
      isMatchOver: this.game.isMatchOver(),
      myPlayerIndex: requestingPlayerIndex
    };
  }

  // Manter método original para compatibilidade
  getGameState() {
    if (!this.game) return null;

    return {
      board: this.game.board,
      scores: this.game.scores,
      teamNames: this.game.teamNames,
      currentPlayer: this.game.currentPlayer,
      players: this.game.players.map((player, index) => ({
        name: player.name,
        pieceCount: player.pieces.length,
        pieces: index === 0 ? player.pieces : [] // Só mostra peças do próprio jogador
      })),
      standby: this.game.standby,
      gameState: this.gameState,
      isRoundOver: this.game.isRoundOver(),
      isMatchOver: this.game.isMatchOver()
    };
  }

  getPublicInfo() {
    return {
      roomId: this.roomId,
      playerCount: this.players.length,
      maxPlayers: this.maxPlayers,
      gameState: this.gameState,
      players: this.players.map(p => ({ name: p.name })),
      hostName: this.players.find(p => p.socketId === this.hostSocketId)?.name
    };
  }
}