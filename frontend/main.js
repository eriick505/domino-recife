import { DominoGame } from './DominoGame.js';
import { DominoUI } from './DominoUI.js';

const playerNames = [
"Teteuzinho",
"Palhaço Loko",
"João Prazeres",
"Vini Jr",
];
const game = new DominoGame(playerNames);
const ui = new DominoUI(game);

ui.startMatch();