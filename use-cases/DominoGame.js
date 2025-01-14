import { DominoPiece } from '../domain/DominoPiece.js';
import { Player } from '../domain/Player.js';


export class DominoGame {
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