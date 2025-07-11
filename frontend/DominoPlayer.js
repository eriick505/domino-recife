export class DominoPlayer {
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
}