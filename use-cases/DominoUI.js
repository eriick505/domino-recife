class DominoPiece {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  toString() {
    return `[${this.left}|${this.right}]`;
  }
}

class Player {
  constructor(name) {
    this.name = name;
    this.pieces = [];
  }

  addPiece(piece) {
    this.pieces.push(piece);
  }

  removePiece(index) {
    return this.pieces.splice(index, 1)[0];
  }

  getPieces() {
    return this.pieces;
  }
  
  hasPiece(left, right) {
    return this.pieces.some(piece => piece.left === left && piece.right === right);
  }
}

class DominoGame {
  constructor(playerNames) {
    this.pieces = this.createDominoSet();
    this.players = playerNames.map(name => new Player(name));
    this.standby = [];
    this.board = [];
    this.currentPlayer = 0;
    this.firstMove = true;
    this.distributePieces();
  }

  createDominoSet() {
    const pieces = [];
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        pieces.push(new DominoPiece(i, j));
      }
    }
    return pieces;
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  distributePieces() {
    this.shuffle(this.pieces);
    for (let i = 0; i < 24; i++) {
      this.players[i % 4].addPiece(this.pieces[i]);
    }
    for (let i = 24; i < this.pieces.length; i++) {
      this.standby.push(this.pieces[i]);
    }
  }

  determineStartingPlayer() {
    const doubles = [6, 5, 4, 3, 2, 1, 0];
    for (const double of doubles) {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].hasPiece(double, double)) {
          return i;
        }
      }
    }
    return 0; 
  }

  playPiece(playerIndex, pieceIndex, side) {
    const player = this.players[playerIndex];
    const piece = player.getPieces()[pieceIndex];

    if (!piece) return false;

    if (this.firstMove) {
      this.board.push({ piece, side: 'middle' });
      this.firstMove = false;
    } else if (this.canPlayPiece(piece, side)) {
      const endPiece = side === 'left' ? this.board[0].piece : this.board[this.board.length - 1].piece;
      if (side === 'left') {
        if (piece.right === endPiece.left) {
          this.board.unshift({ piece, side: 'left' });
        } else if (piece.left === endPiece.left) {
          const invertedPiece = new DominoPiece(piece.right, piece.left);
          this.board.unshift({ piece: invertedPiece, side: 'left' });
        } else {
          return false;
        }
      } else {
        if (piece.left === endPiece.right) {
          this.board.push({ piece, side: 'right' });
        } else if (piece.right === endPiece.right) {
          const invertedPiece = new DominoPiece(piece.right, piece.left);
          this.board.push({ piece: invertedPiece, side: 'right' });
        } else {
          return false;
        }
      }
    } else {
      return false;
    }
    player.removePiece(pieceIndex);
    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    return true;
  }

  canPlayPiece(piece, side) {
    if (!piece) return false;
    if (this.board.length === 0) return true;
    const endPiece = side === 'left' ? this.board[0].piece : this.board[this.board.length - 1].piece;
    if (!endPiece) return false;
    return piece.left === endPiece.left || piece.left === endPiece.right || piece.right === endPiece.left || piece.right === endPiece.right;
  }

  drawPiece(playerIndex) {
    if (this.standby.length > 0) {
      const piece = this.standby.pop();
      this.players[playerIndex].addPiece(piece);
      return piece;
    }
    return null;
  }

  passTurn() {
    this.currentPlayer = (this.currentPlayer + 1) % 4;
  }

  isGameOver() {
    return this.players.some(player => player.getPieces().length === 0);
  }

  getWinner() {
    if (this.isGameOver()) {
      const scores = this.players.map(player => player.getPieces().reduce((sum, piece) => sum + piece.left + piece.right, 0));
      const minScore = Math.min(...scores);
      return scores.indexOf(minScore);
    }
    return null;
  }
}

class DominoUI {
  constructor(game) {
    this.game = game;
    this.playersTable = document.querySelector('#players_table');
    this.playerBoard = document.querySelector('#player_board');
    this.statusGame = document.querySelector('#status_game');
    this.placar = document.querySelector('#placar');
  }

  displayBoard() {
    console.log('Mesa:', this.game.board.map(entry => entry.piece.toString()).join(' '));
  }

  drawFinalBoard() {
    this.playerBoard.innerHTML = '';
    this.game.board.forEach(entry => {
      console.log(entry)
      const pieceElement = document.createElement('div');
      pieceElement.style.backgroundImage = `url("../domino-icon/${entry.piece.left} ${entry.piece.right}.png")`;
      pieceElement.classList.add('piece', entry.side);
      pieceElement.innerHTML = entry.piece.toString();

      this.playerBoard.appendChild(pieceElement)
    })
  }

  playerPieces(playerIndex) {
    return {
      playerName: this.game.players[playerIndex].name,
      playerPieces: this.game.players[playerIndex].getPieces()
    };
  }

  getInitalPlayerPieces() {
    this.playersTable.innerHTML = '';
    this.game.players.forEach((_, playerIndex) => {
      const { playerName, playerPieces } = this.playerPieces(playerIndex)

      const trElement = document.createElement('tr');
      trElement.innerHTML = `
        <th scope="row">${playerIndex}</th>
        <td>${playerName}</td>
        <td>${playerPieces}</td>
      `;

      this.playersTable.appendChild(trElement);
    });
  }

  displayPlayerPieces(playerIndex) {
    const { playerName, playerPieces } = this.playerPieces(playerIndex)

    // console.log(`${playerIndex} - ${playerName}'s pieces:`, playerPieces);
  }

  playTurn(playerIndex, pieceIndex, side) {
    const player = this.game.players[playerIndex];
    const piece = player.getPieces()[pieceIndex];
    
    if (this.game.playPiece(playerIndex, pieceIndex, side)) {
      // console.log(`${player.name} jogou ${piece} na ${side}`);
      const liElement = document.createElement('li');
      liElement.innerHTML = `<b>${player.name}</b> jogou <b>${piece}</b> na ${side === 'left' ? 'esquerda' : 'direita'}`;
      this.statusGame.appendChild(liElement);

      this.displayBoard();
      this.displayPlayerPieces(playerIndex);
      this.getInitalPlayerPieces();
      return true;
    } else {
      // console.log(`${player.name} não pode jogar ${piece} na ${side}`);
      return false;
    }
  }

  passTurn() {
    this.game.passTurn();
    console.log(`Vez de ${this.game.players[this.game.currentPlayer].name}`);
  }

  drawPiece(playerIndex) {
    const piece = this.game.drawPiece(playerIndex);
    if (piece) {
      console.log(`${this.game.players[playerIndex].name} comprou ${piece}`);
      this.displayPlayerPieces(playerIndex);
    } else {
      console.log(`Não há mais peças para comprar`);
    }
  }

  async simulateGame() {
    this.displayBoard();
    this.getInitalPlayerPieces();
  
    const startingPlayer = this.game.determineStartingPlayer();
    this.game.currentPlayer = startingPlayer;
    console.log(`O jogador inicial é ${this.game.players[startingPlayer].name}`);
  
    // Simulação de jogadas
    let noMovesCount = 0;
    while (!this.game.isGameOver() && noMovesCount < this.game.players.length) {
      const player = this.game.players[this.game.currentPlayer];
      const pieces = player.getPieces();
      let played = false;
  
      for (let i = 0; i < pieces.length; i++) {
        if (this.playTurn(this.game.currentPlayer, i, 'right')) {
          played = true;
          noMovesCount = 0; // Reset noMovesCount if a move is made
          this.drawFinalBoard();
          await this.delay(500);
          break;
        } else if (this.playTurn(this.game.currentPlayer, i, 'left')) {
          played = true;
          noMovesCount = 0; // Reset noMovesCount if a move is made
          this.drawFinalBoard();
          await this.delay(500);
          break;
        }
      }
  
      if (!played) {
        if (this.game.standby.length > 0) {
          this.drawPiece(this.game.currentPlayer);
        } else {
          noMovesCount++;
          this.passTurn();
        }
      }
    }
  
    const winnerIndex = this.game.getWinner();
    if (winnerIndex !== null) {
      console.log(`O vencedor é ${this.game.players[winnerIndex].name} 🏆🏆🏆`);
      this.placar.innerHTML = `O VENCEDOR É:  🏆🏆🏆<b>${this.game.players[winnerIndex].name}</b> 🏆🏆🏆`
    } else {
      console.log('O jogo terminou em empate');
      this.placar.innerHTML = 'O jogo fechou ❌❌❌'
    }
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const playerNames = ["Teteuzinho do Ibura (maximouz)", "Palhaço Loko", "João Prazeres", "Vini Jr"];
const game = new DominoGame(playerNames);
export const ui = new DominoUI(game);