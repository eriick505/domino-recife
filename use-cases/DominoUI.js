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
    const doublePieces = [6, 5, 4, 3, 2, 1, 0];

    for (const doublePiece of doublePieces) {
      for (let i = 0; i < this.players.length; i++) {
        const pieceIndex = this.players[i].getPieces()
          .findIndex(piece => piece.left === doublePiece && piece.right === doublePiece);

        if (pieceIndex !== -1) {
          return { playerIndex: i, pieceIndex };
        }
      }
    }

    return { playerIndex: 0, pieceIndex: -1 };
  }

  playPiece(playerIndex, pieceIndex, side) {
    const player = this.players[playerIndex];
    const piece = player.getPieces()[pieceIndex];

    if (!piece) return false;

    if (this.firstMove) {
      this.board.push({ piece, side: 'middle' });
      this.firstMove = false;
    } else if (this.canPlayPiece(piece, side)) {
      const endPiece = side === 'left' 
        ? this.board[0].piece 
        : this.board[this.board.length - 1].piece;
      
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
      const scores = this.players
        .map(player => player.getPieces()
        .reduce((sum, piece) => sum + piece.left + piece.right, 0));

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
    this.comemoracao = document.querySelector('#comemoracao');
    this.dorme = document.querySelector('#dorme');
  }

  displayBoard() {
    console.log('Mesa:', this.game.board.map(entry => entry.piece.toString()).join(' '));
  }

  drawDorme() {
    this.dorme.innerHTML = '';
    this.game.standby.forEach(piece => {
      const pieceElement = this.drawPieceElement(piece);
      this.dorme.appendChild(pieceElement);
    })
  }

  getUrlImagePiece(piece) {
    return `../domino-icon/${piece.left} ${piece.right}.png`;
  }

  drawPieceElement(piece) {
    const pieceElement = document.createElement('div');
    const equalSides = piece.left === piece.right;

    pieceElement.style.backgroundImage = `url("${this.getUrlImagePiece(piece)}")`;
    pieceElement.classList.add('piece');
    pieceElement.classList.add(equalSides ? 'piece__vertical' : 'piece__horizontal');
    pieceElement.innerHTML = piece.toString();
    
    return pieceElement
  }

  drawFinalBoard() {
    this.playerBoard.innerHTML = '';

    this.game.board.forEach(entry => {
      const pieceElement = this.drawPieceElement(entry.piece)

      this.playerBoard.appendChild(pieceElement)
    })
  }

  drawPlayersBoard() {
    this.game.players.forEach((player, playerIndex) => {
      const playerBoardEl = document.querySelector(`#player${playerIndex}`);
      const playerNameEl = playerBoardEl.querySelector('.player_name')
      const playerPiecesEl = playerBoardEl.querySelector('.player_pieces')
      
      playerNameEl.innerHTML = player.name;

      playerPiecesEl.innerHTML = '';
      player.getPieces().forEach(piece => {
        const pieceElement = this.drawPieceElement(piece)
        playerPiecesEl.appendChild(pieceElement)
      })
    })
  }

  playHistory(player, piece, side) {
    const sideText = {
      'left': 'esquerda',
      'right': 'direita',
      'middle': 'meio'
    }

    const preposition = sideText[side] === 'meio' ? 'no' : 'na';
    const liElement = document.createElement('li');

    liElement.innerHTML = `<b>${player.name}</b> jogou <b>${piece}</b> ${preposition} ${sideText[side]}`;
    this.statusGame.prepend(liElement);
  }

  playTurn(playerIndex, pieceIndex, side) {
    const player = this.game.players[playerIndex];
    const piece = player.getPieces()[pieceIndex];
    
    if (this.game.playPiece(playerIndex, pieceIndex, side)) {
      this.playHistory(player, piece, side);
      this.drawDorme();
      this.displayBoard();
      this.drawPlayersBoard();
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

    if(!piece) return console.log(`Não há mais peças para comprar`);

    console.log(`${this.game.players[playerIndex].name} comprou ${piece}`);
  }

  async simulateGame() {
    this.displayBoard();
    this.drawPlayersBoard();
    this.drawDorme();
  
    const { playerIndex, pieceIndex } = this.game.determineStartingPlayer();
    this.game.currentPlayer = playerIndex;
    console.log(`O jogador inicial é ${this.game.players[playerIndex].name}`);

    if (pieceIndex !== -1) {
      this.playTurn(playerIndex, pieceIndex, 'middle');
      this.drawFinalBoard();
      await this.delay(900); // Delay de 3 segundos
    }
  
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
          await this.delay(900);
          break;
        } else if (this.playTurn(this.game.currentPlayer, i, 'left')) {
          played = true;
          noMovesCount = 0; // Reset noMovesCount if a move is made
          this.drawFinalBoard();
          await this.delay(900);
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
    const img = document.createElement('img');

    if (winnerIndex !== null) {
      console.log(`O vencedor é ${this.game.players[winnerIndex].name} 🏆🏆🏆`);
      this.placar.innerHTML = `O VENCEDOR É: <br /> 🏆🏆🏆<b>${this.game.players[winnerIndex].name}</b> 🏆🏆🏆`

      const playerComemoracao = {
        0: '../domino-icon/maximouz.webp',
        1: '../domino-icon/tome-tome.webp',
        2: '../domino-icon/cuida.webp',
        3: '../domino-icon/cuida.webp'
      }
      
      img.src = `${playerComemoracao[winnerIndex]}`;
    } else {
      console.log('O jogo terminou em empate');
      this.placar.innerHTML = 'O jogo fechou ❌❌❌'
      img.src = `../domino-icon/itsover.webp`;
    }

    this.comemoracao.appendChild(img);
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const playerNames = ["Teteuzinho do Ibura (maximouz)", "Palhaço Loko", "João Prazeres", "Vini Jr"];
const game = new DominoGame(playerNames);
export const ui = new DominoUI(game);