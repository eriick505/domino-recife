export class Player {
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