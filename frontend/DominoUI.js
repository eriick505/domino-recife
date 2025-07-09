import { DominoPiece } from "./DominoPiece.js";

export class DominoUI {
    constructor(game) {
      this.game = game;
      this.canvas = document.querySelector("#game_board_canvas");
      this.ctx = this.canvas.getContext("2d");
      this.statusGame = document.querySelector("#status_game");
      this.placarRodada = document.querySelector("#placar_rodada");
      this.scoreboardEl = document.querySelector("#scoreboard");
      this.victoryModal = document.querySelector("#victory-modal");
      this.victoryModalContent = document.querySelector(
        "#victory-modal-content"
      );

      this.PIECE_WIDTH = 72;
      this.PIECE_HEIGHT = 36;
      this.PIP_RADIUS = 3;

      this.resizeCanvas();
      window.addEventListener("resize", () => this.resizeCanvas());
    }

    resizeCanvas() {
      const container = document.getElementById("game-container");
      this.canvas.width = container.clientWidth * 0.8;
      this.canvas.height = container.clientHeight * 0.7;
      this.drawGameBoard();
    }

    drawHandPieceElement(piece, isVertical = false) {
      const pieceElement = document.createElement("div");
      pieceElement.classList.add(
        "piece-in-hand",
        isVertical ? "vertical" : "horizontal"
      );
      const half1 = document.createElement("div");
      half1.classList.add("piece-half", `pips-${piece.left}`);
      const half2 = document.createElement("div");
      half2.classList.add("piece-half", `pips-${piece.right}`);
      for (let i = 0; i < piece.left; i++) {
        const pip = document.createElement("div");
        pip.classList.add("pip");
        half1.appendChild(pip);
      }
      for (let i = 0; i < piece.right; i++) {
        const pip = document.createElement("div");
        pip.classList.add("pip");
        half2.appendChild(pip);
      }
      pieceElement.appendChild(half1);
      pieceElement.appendChild(half2);
      return pieceElement;
    }

    drawCanvasPiece(piece, x, y, rotation = 0, swapPips = false) {
      const ctx = this.ctx;
      const w = this.PIECE_WIDTH;
      const h = this.PIECE_HEIGHT;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);

      ctx.fillStyle = "#fdfdfd";
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 5);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#ccc";
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 + 4);
      ctx.lineTo(0, h / 2 - 4);
      ctx.stroke();

      // Se swapPips, inverte os eixos dos pips
      this.drawPips(ctx, piece.left, -w / 4, 0, swapPips);
      this.drawPips(ctx, piece.right, w / 4, 0, swapPips);

      ctx.restore();
    }

    drawPips(ctx, value, centerX, centerY, swapAxes = false) {
      ctx.fillStyle = "#333";
      const positions = {
        1: [[0, 0]],
        2: [
          [-0.25, -0.25],
          [0.25, 0.25],
        ],
        3: [
          [-0.25, -0.25],
          [0, 0],
          [0.25, 0.25],
        ],
        4: [
          [-0.25, -0.25],
          [-0.25, 0.25],
          [0.25, -0.25],
          [0.25, 0.25],
        ],
        5: [
          [-0.25, -0.25],
          [-0.25, 0.25],
          [0, 0],
          [0.25, -0.25],
          [0.25, 0.25],
        ],
        6: [
          [-0.35, -0.35],
          [-0.35, 0],
          [-0.35, 0.35],
          [0.35, -0.35],
          [0.35, 0],
          [0.35, 0.35],
        ],
      };
      if (positions[value]) {
        const pipAreaSize = this.PIECE_HEIGHT * 0.6;
        positions[value].forEach(([px, py]) => {
          ctx.beginPath();
          if (swapAxes) {
            ctx.arc(
              centerX + py * pipAreaSize,
              centerY + px * pipAreaSize,
              this.PIP_RADIUS,
              0,
              2 * Math.PI
            );
          } else {
            ctx.arc(
              centerX + px * pipAreaSize,
              centerY + py * pipAreaSize,
              this.PIP_RADIUS,
              0,
              2 * Math.PI
            );
          }
          ctx.fill();
        });
      }
    }

    drawGameBoard() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.game.board.length === 0) return;

      // Nova estrutura: boardState
      this.boardState = [];

      const PADDING = 40;
      const firstPiece = this.game.firstPiece;
      if (!firstPiece) return;
      const firstPieceIndex = this.game.board.indexOf(firstPiece);

      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      const isFirstDouble = firstPiece.left === firstPiece.right;
      const firstRotation = isFirstDouble ? 90 : 0;
      const isVertical = firstRotation % 180 !== 0;
      const swapPips = isFirstDouble && isVertical;

      // Adiciona estado da peça central
      // Determina os lados visuais da peça central
      let firstVisual = {};
      if (isFirstDouble) {
        // Dupla na vertical: topo = left, baixo = right
        firstVisual = { top: firstPiece.left, bottom: firstPiece.right };
      } else {
        // Horizontal: esquerda = left, direita = right
        firstVisual = { left: firstPiece.left, right: firstPiece.right };
      }
      this.boardState[firstPieceIndex] = {
        piece: firstPiece,
        x: centerX,
        y: centerY,
        rotation: firstRotation,
        isVertical: isVertical,
        swapPips: swapPips,
        direction: "horizontal",
        round: 0,
        index: firstPieceIndex,
        ...firstVisual,
      };

      // Caminho começa horizontal (direita/esquerda)
      // Para a direita - ajuste para eliminar gap
      let rightStartX = centerX;
      let rightStartY = centerY;
      let rightAngle = 0;
      let rightOffset = isFirstDouble
        ? this.PIECE_HEIGHT / 2
        : this.PIECE_WIDTH / 2;
      // Ajuste: simplificar cálculo para eliminar espaçamento
      rightStartX += rightOffset;

      // Para a esquerda - ajuste para eliminar gap
      let leftStartX = centerX;
      let leftStartY = centerY;
      let leftAngle = 180;
      let leftOffset = isFirstDouble
        ? this.PIECE_HEIGHT / 2
        : this.PIECE_WIDTH / 2;
      // Ajuste: simplificar cálculo para eliminar espaçamento
      leftStartX -= leftOffset;

      // Função para alternar direção ao chegar perto do limite
      const processBranch = (
        pieces,
        startState,
        boardIndexes,
        isLeftBranch = false
      ) => {
        let layout = { ...startState };
        let direction = "horizontal";
        let growSign = 1;
        let round = 1;
        for (let i = 0; i < pieces.length; i++) {
          let piece = pieces[i];
          const boardIdx = boardIndexes[i];
          const isDouble = piece.left === piece.right;
          const lastState = layout;
          const lastIsDouble =
            lastState.piece.left === lastState.piece.right;

          let lastRotation = lastState.angle + (lastIsDouble ? 90 : 0);
          let currRotation = lastState.angle + (isDouble ? 90 : 0);

          let lastW =
            lastRotation % 180 === 0 ? this.PIECE_WIDTH : this.PIECE_HEIGHT;
          let lastH =
            lastRotation % 180 === 0 ? this.PIECE_HEIGHT : this.PIECE_WIDTH;
          let currW =
            currRotation % 180 === 0 ? this.PIECE_WIDTH : this.PIECE_HEIGHT;
          let currH =
            currRotation % 180 === 0 ? this.PIECE_HEIGHT : this.PIECE_WIDTH;

          // Corrigir o cálculo de movimento para eliminar gaps
          let moveX, moveY;

          if (i === 0) {
            // Para a primeira peça de cada ramo, usar posição inicial sem gap
            moveX = Math.cos((lastState.angle * Math.PI) / 180) * (currW / 2);
            moveY = Math.sin((lastState.angle * Math.PI) / 180) * (currH / 2);
          } else {
            // Para peças subsequentes, usar cálculo normal
            moveX = Math.cos((lastState.angle * Math.PI) / 180) * (lastW / 2 + currW / 2);
            moveY = Math.sin((lastState.angle * Math.PI) / 180) * (lastH / 2 + currH / 2);
          }

          let nextX = lastState.x + moveX;
          let nextY = lastState.y + moveY;
          let pieceW =
            currRotation % 180 === 0 ? this.PIECE_WIDTH : this.PIECE_HEIGHT;
          let pieceH =
            currRotation % 180 === 0 ? this.PIECE_HEIGHT : this.PIECE_WIDTH;

          const minX = PADDING + pieceW / 2;
          const maxX = this.canvas.width - PADDING - pieceW / 2;
          const minY = PADDING + pieceH / 2;
          const maxY = this.canvas.height - PADDING - pieceH / 2;

          if (direction === "horizontal") {
            if (nextX > maxX) {
              layout.angle = 90;
              direction = "vertical";
              growSign = 1;
              nextX = maxX;
              nextY = lastState.y + (lastH / 2 + currW / 2);
            } else if (nextX < minX) {
              layout.angle = 270;
              direction = "vertical";
              growSign = -1;
              nextX = minX;
              nextY = lastState.y - (lastH / 2 + currW / 2);
            }
          } else {
            if (nextY > maxY) {
              layout.angle = 180;
              direction = "horizontal";
              growSign = -1;
              nextY = maxY;
              nextX = lastState.x - (lastW / 2 + currH / 2);
            } else if (nextY < minY) {
              layout.angle = 0;
              direction = "horizontal";
              growSign = 1;
              nextY = minY;
              nextX = lastState.x + (lastW / 2 + currH / 2);
            }
          }

          layout.x = nextX;
          layout.y = nextY;

          // Refinamento: duplas sempre cruzam a direção do caminho
          let rotation = layout.angle;
          if (isDouble) {
            if (direction === "horizontal") {
              rotation += 90;
            }
          }

          // Ajuste: swapPips se for dupla E está na vertical
          const isVertical = rotation % 180 !== 0;
          const swapPips = isDouble && isVertical;

          // --- ENCAIXE LÓGICO USANDO OS LADOS VISUAIS ---
          // Descobre o valor do lado "de encaixe" da peça anterior
          let prevSideValue;
          let currSideValue;
          let flip = false;
          if (direction === "horizontal") {
            if (!isLeftBranch) {
              // ramo da direita: encaixe é right do anterior com left do atual
              prevSideValue =
                lastState.right !== undefined
                  ? lastState.right
                  : lastState.bottom;
              currSideValue = piece.left;
              // Para a primeira peça do ramo da direita, use o valor right da peça central
              if (i === 0 && startState.right !== undefined) {
                prevSideValue = startState.right;
              }
              if (currSideValue !== prevSideValue) {
                piece = new DominoPiece(piece.right, piece.left);
                flip = true;
              }
            } else {
              // ramo da esquerda: encaixe é left do anterior com left do atual
              prevSideValue =
                lastState.left !== undefined
                  ? lastState.left
                  : lastState.top;
              currSideValue = piece.left;
              // Para a primeira peça do ramo da esquerda, use o valor left da peça central
              if (i === 0 && startState.left !== undefined) {
                prevSideValue = startState.left;
              }
              // Se não encaixar, flipar
              if (currSideValue !== prevSideValue) {
                piece = new DominoPiece(piece.right, piece.left);
                flip = true;
              }
            }
          } else {
            // encaixe vertical (igual para ambos os ramos)
            prevSideValue =
              lastState.bottom !== undefined
                ? lastState.bottom
                : lastState.right;
            currSideValue =
              piece.top !== undefined ? piece.top : piece.left;
            if (currSideValue !== prevSideValue) {
              piece = new DominoPiece(piece.right, piece.left);
              flip = true;
            }
          }

          // Determina os lados visuais da peça
          let visual = {};
          if (isDouble) {
            visual = { top: piece.left, bottom: piece.right };
          } else if (rotation % 360 === 0) {
            visual = { left: piece.left, right: piece.right };
          } else if (rotation % 360 === 180) {
            visual = { left: piece.right, right: piece.left };
          } else if (rotation % 360 === 90) {
            visual = { top: piece.left, bottom: piece.right };
          } else if (rotation % 360 === 270) {
            visual = { top: piece.right, bottom: piece.left };
          }

          this.boardState[boardIdx] = {
            piece: piece,
            x: layout.x,
            y: layout.y,
            rotation: rotation,
            isVertical: isVertical,
            swapPips: swapPips,
            direction: direction,
            round: round,
            index: boardIdx,
            ...visual,
            flip,
          };

          layout.piece = piece;
          // Atualiza os extremos do layout para o próximo encaixe
          if (!isLeftBranch) {
            layout.right = visual.right;
            layout.bottom = visual.bottom;
            layout.left = undefined;
            layout.top = undefined;
          } else {
            layout.left = visual.left;
            layout.top = visual.top;
            layout.right = undefined;
            layout.bottom = undefined;
          }
          round++;
        }
      };

      // Calcula os índices reais das peças na board
      const rightBranchPieces = this.game.board.slice(firstPieceIndex + 1);
      const rightBranchIndexes = Array.from(
        { length: rightBranchPieces.length },
        (_, i) => firstPieceIndex + 1 + i
      );
      processBranch.call(
        this,
        rightBranchPieces,
        {
          x: rightStartX,
          y: rightStartY,
          angle: rightAngle,
          piece: firstPiece,
          right:
            this.boardState[firstPieceIndex]?.right ?? firstPiece.right,
        },
        rightBranchIndexes,
        false // não é ramo da esquerda
      );

      const leftBranchPieces = this.game.board
        .slice(0, firstPieceIndex)
        .reverse();
      const leftBranchIndexes = Array.from(
        { length: leftBranchPieces.length },
        (_, i) => firstPieceIndex - 1 - i
      ).reverse();
      processBranch.call(
        this,
        leftBranchPieces,
        {
          x: leftStartX,
          y: leftStartY,
          angle: leftAngle,
          piece: firstPiece,
          left: this.boardState[firstPieceIndex]?.left ?? firstPiece.left,
        },
        leftBranchIndexes,
        true // é ramo da esquerda
      );

      // Desenha todas as peças usando boardState
      for (let i = 0; i < this.game.board.length; i++) {
        const state = this.boardState[i];
        if (!state) continue;
        this.drawCanvasPiece(
          state.piece,
          state.x,
          state.y,
          state.rotation,
          state.swapPips
        );
      }
    }

    drawPlayersBoards() {
      this.game.players.forEach((player, playerIndex) => {
        const playerNameEl = document.querySelector(
          `#player${playerIndex}_name`
        );
        const playerTeamEl = document.querySelector(
          `#player${playerIndex}_team`
        );
        const playerPiecesEl = document.querySelector(
          `#player${playerIndex}_pieces`
        );

        if (playerNameEl) playerNameEl.textContent = player.name;
        if (playerTeamEl)
          playerTeamEl.textContent = `Dupla ${(playerIndex % 2) + 1}`;
        if (playerPiecesEl) {
          playerPiecesEl.innerHTML = "";
          const isVertical = playerIndex === 1 || playerIndex === 3;
          player.getPieces().forEach((piece) => {
            const pieceElement = this.drawHandPieceElement(
              piece,
              !isVertical
            );
            playerPiecesEl.appendChild(pieceElement);
          });
        }
      });
    }

    updateDorme() {
      const dormeEl = document.querySelector("#dorme");
      dormeEl.innerHTML = "";
      this.game.standby.forEach((piece) => {
        const pieceElement = this.drawHandPieceElement(piece, true);
        dormeEl.appendChild(pieceElement);
      });
    }

    updateScoreboard() {
      this.scoreboardEl.innerHTML = `
            <div class="team-names-scoreboard">
                <span>${this.game.players[0].name}</span>
                <span>${this.game.players[2].name}</span>
            </div>
            <span class="score-number">${this.game.scores[0]}</span>
            <span class="versus-separator">x</span>
            <span class="score-number">${this.game.scores[1]}</span>
            <div class="team-names-scoreboard">
                <span>${this.game.players[1].name}</span>
                <span>${this.game.players[3].name}</span>
            </div>
        `;
    }

    logHistory(message) {
      const liElement = document.createElement("li");
      liElement.innerHTML = message;
      this.statusGame.prepend(liElement);
    }

    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async runRound() {
      this.game.startNewRound();
      this.drawPlayersBoards();
      this.updateDorme();
      this.drawGameBoard();
      this.placarRodada.textContent = "Nova rodada...";

      const { playerIndex, pieceIndex } =
        this.game.determineStartingPlayer();
      this.game.currentPlayer = playerIndex;
      this.logHistory(
        `Nova rodada! O jogador inicial é <b>${this.game.players[playerIndex].name}</b>.`
      );
      await this.delay(1500);

      this.game.playPiece(playerIndex, pieceIndex, "right");
      this.drawPlayersBoards();
      this.drawGameBoard();
      this.logHistory(
        `<b>${
          this.game.players[
            this.game.currentPlayer - 1 === -1
              ? 3
              : this.game.currentPlayer - 1
          ].name
        }</b> jogou <b>${this.game.board[0].toString()}</b>.`
      );
      await this.delay(1000);

      while (!this.game.isRoundOver()) {
        const player = this.game.players[this.game.currentPlayer];
        let played = false;
        for (let i = 0; i < player.getPieces().length; i++) {
          const piece = player.getPieces()[i];
          const { canPlay, sides } = this.game.canPlayOnBoard(piece);
          if (canPlay) {
            this.game.playPiece(this.game.currentPlayer, i, sides[0]);
            this.logHistory(
              `<b>${player.name}</b> jogou <b>${piece.toString()}</b>.`
            );
            played = true;
            break;
          }
        }
        if (!played) {
          this.logHistory(`<b>${player.name}</b> passou a vez.`);
          this.game.passTurn();
        }
        this.drawPlayersBoards();
        this.drawGameBoard();
        await this.delay(1000);
      }
    }

    showVictoryModal(winnerTeamName) {
      this.victoryModalContent.innerHTML = `
            <h2>Vitória!</h2>
            <p>A dupla vencedora é</p>
            <h3>${winnerTeamName}</h3>
            <button id="close-modal-btn">Fechar</button>
        `;
      this.victoryModal.style.display = "flex";

      document
        .getElementById("close-modal-btn")
        .addEventListener("click", () => {
          this.victoryModal.style.display = "none";
        });
    }

    async startMatch() {
      this.updateScoreboard();
      while (!this.game.isMatchOver()) {
        await this.runRound();
        const winnerInfo = this.game.getRoundWinnerInfo();
        if (winnerInfo) {
          const winnerTeamName = this.game.teamNames[winnerInfo.teamIndex];
          this.logHistory(
            `<b>FIM DE RODADA!</b> A dupla <b>${winnerTeamName}</b> venceu.`
          );
          this.placarRodada.innerHTML = `A dupla <b>${winnerTeamName}</b> venceu a rodada!`;
          this.game.awardPoints(winnerInfo.teamIndex, 1);
          this.updateScoreboard();
        }
        await this.delay(4000);
      }
      const finalWinnerIndex =
        this.game.scores[0] >= this.game.targetScore ? 0 : 1;
      const finalWinnerName = this.game.teamNames[finalWinnerIndex];
      this.placarRodada.innerHTML = `FIM DE PARTIDA!`;
      this.showVictoryModal(finalWinnerName);
    }
}