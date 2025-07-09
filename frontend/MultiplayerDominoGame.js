// Classes do cliente para o jogo multiplayer (apenas para exibição)
export class ClientDominoPiece {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }
  
  toString() {
    return `[${this.left}|${this.right}]`;
  }
}

export class ClientDominoPlayer {
  constructor(name) {
    this.name = name;
    this.pieces = [];
    this.pieceCount = 0;
  }
  
  setPieces(pieces) {
    this.pieces = pieces.map(p => new ClientDominoPiece(p.left, p.right));
  }
  
  setPieceCount(count) {
    this.pieceCount = count;
  }
  
  getPieces() {
    return this.pieces;
  }
}

export class ClientDominoGame {
  constructor() {
    this.players = [];
    this.board = [];
    this.scores = [0, 0];
    this.teamNames = [];
    this.currentPlayer = 0;
    this.standby = [];
    this.gameState = 'waiting';
    this.isRoundOver = false;
    this.isMatchOver = false;
  }
  
  updateFromServer(gameState) {
    // Atualiza o estado local com dados do servidor
    this.board = gameState.board.map(p => new ClientDominoPiece(p.left, p.right));
    this.scores = [...gameState.scores];
    this.teamNames = [...gameState.teamNames];
    this.currentPlayer = gameState.currentPlayer;
    this.standby = gameState.standby.map(p => new ClientDominoPiece(p.left, p.right));
    this.gameState = gameState.gameState;
    this.isRoundOver = gameState.isRoundOver;
    this.isMatchOver = gameState.isMatchOver;
    
    // Armazenar o índice do jogador atual
    this.myPlayerIndex = gameState.myPlayerIndex;
    
    // Atualiza jogadores
    this.players = gameState.players.map((playerData, index) => {
      const player = new ClientDominoPlayer(playerData.name);
      if (playerData.pieces && playerData.pieces.length > 0) {
        // Só define peças se vieram do servidor (jogador atual)
        player.setPieces(playerData.pieces);
      }
      player.setPieceCount(playerData.pieceCount);
      return player;
    });
  }
  
  getMyPlayerIndex(mySocketId, playerSocketIds) {
    return playerSocketIds.indexOf(mySocketId);
  }
}