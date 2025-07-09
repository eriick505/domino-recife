import { DominoPiece } from "./DominoPiece.js";
import { DominoPlayer } from "./DominoPlayer.js";

export class DominoGame {
  constructor(playerNames) {
    this.players = playerNames.map((name) => new DominoPlayer(name));
    this.teamNames = [
      `Dupla 1 (${this.players[0].name} & ${this.players[2].name})`,
      `Dupla 2 (${this.players[1].name} & ${this.players[3].name})`,
    ];
    this.scores = [0, 0];
    this.targetScore = 1;
    this.firstPiece = null;
    this.startNewRound();
  }

  startNewRound() {
    this.pieces = this.createDominoSet();
    this.standby = [];
    this.board = [];
    this.firstPiece = null;
    this.players.forEach((p) => (p.pieces = []));
    this.currentPlayer = 0;
    this.firstMove = true;
    this.consecutivePasses = 0;
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
  }

  distributePieces() {
    this.shuffle(this.pieces);
    for (let i = 0; i < 24; i++) this.players[i % 4].addPiece(this.pieces[i]);
    for (let i = 24; i < this.pieces.length; i++) this.standby.push(this.pieces[i]);
  }

  determineStartingPlayer() {
    const doubles = [6, 5, 4, 3, 2, 1, 0];
    for (const double of doubles) {
      for (let i = 0; i < this.players.length; i++) {
        const pieceIndex = this.players[i]
          .getPieces()
          .findIndex((p) => p.left === double && p.right === double);
        if (pieceIndex !== -1) return { playerIndex: i, pieceIndex: pieceIndex };
      }
    }
    return { playerIndex: 0, pieceIndex: 0 };
  }

  playPiece(playerIndex, pieceIndex, side) {
    const player = this.players[playerIndex];
    const pieceToPlay = player.getPieces()[pieceIndex];
    const pieceCopy = new DominoPiece(pieceToPlay.left, pieceToPlay.right);

    if (this.firstMove) {
      this.board.push(pieceCopy);
      this.firstPiece = pieceCopy;
      this.firstMove = false;
    } else {
      const leftEndValue = this.board[0].left;
      const rightEndValue = this.board[this.board.length - 1].right;

      if (side === "left") {
        if (pieceCopy.right === leftEndValue) {
          // No flip needed
        } else if (pieceCopy.left === leftEndValue) {
          [pieceCopy.left, pieceCopy.right] = [pieceCopy.right, pieceCopy.left];
        } else return false;
        this.board.unshift(pieceCopy);
      } else if (side === "right") {
        if (pieceCopy.left === rightEndValue) {
          // No flip needed
        } else if (pieceCopy.right === rightEndValue) {
          [pieceCopy.left, pieceCopy.right] = [pieceCopy.right, pieceCopy.left];
        } else return false;
        this.board.push(pieceCopy);
      } else return false;
    }

    player.removePiece(pieceIndex);
    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    this.consecutivePasses = 0;
    return true;
  }

  canPlayOnBoard(piece) {
    if (this.board.length === 0) return { canPlay: true, sides: ["right"] };
    const leftEnd = this.board[0].left;
    const rightEnd = this.board[this.board.length - 1].right;
    const possibleSides = [];
    if (piece.left === leftEnd || piece.right === leftEnd) possibleSides.push("left");
    if (piece.left === rightEnd || piece.right === rightEnd) possibleSides.push("right");
    return { canPlay: possibleSides.length > 0, sides: possibleSides };
  }

  passTurn() {
    this.consecutivePasses++;
    this.currentPlayer = (this.currentPlayer + 1) % 4;
  }

  isRoundOver() {
    if (this.players.some((player) => player.getPieces().length === 0)) return true;
    if (this.consecutivePasses >= 4) return true;
    return false;
  }

  getRoundWinnerInfo() {
    if (!this.isRoundOver()) return null;

    let winnerPlayerIndex = this.players.findIndex((p) => p.getPieces().length === 0);

    if (winnerPlayerIndex === -1) {
      let teamScores = [0, 0];
      this.players.forEach((player, index) => {
        const teamIndex = index % 2;
        teamScores[teamIndex] += player.getPieces().reduce((sum, piece) => sum + piece.left + piece.right, 0);
      });
      winnerPlayerIndex = teamScores[0] <= teamScores[1] ? 0 : 1;
    }

    const winnerTeamIndex = winnerPlayerIndex % 2;
    return {
      teamIndex: winnerTeamIndex,
      playerName: this.players[winnerPlayerIndex].name,
    };
  }

  awardPoints(teamIndex, points) {
    this.scores[teamIndex] += points;
  }
  isMatchOver() {
    return this.scores.some((score) => score >= this.targetScore);
  }
}
