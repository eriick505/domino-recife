export class DominoPiece {
    constructor(left, right) {
      this.left = left;
      this.right = right;
    }
    
    toString() {
      return `[${this.left}|${this.right}]`;
    }
}