import { ClientDominoPiece, ClientDominoGame } from "./MultiplayerDominoGame.js";
import { MultiplayerSocketManager } from "./MultiplayerSocketManager.js";

export class MultiplayerDominoUI {
  constructor() {
    this.game = new ClientDominoGame();
    this.socketManager = new MultiplayerSocketManager();
    this.myPlayerIndex = null;
    
    // Elementos do DOM (usando os mesmos do jogo original)
    this.canvas = document.querySelector("#game_board_canvas");
    this.ctx = this.canvas.getContext("2d");
    this.statusGame = document.querySelector("#status_game");
    this.placarRodada = document.querySelector("#placar_rodada");
    this.scoreboardEl = document.querySelector("#scoreboard");
    this.victoryModal = document.querySelector("#victory-modal");
    this.victoryModalContent = document.querySelector("#victory-modal-content");

    this.PIECE_WIDTH = 72;
    this.PIECE_HEIGHT = 36;
    this.PIP_RADIUS = 3;

    this.hideGameElements(); // <-- Esconde elementos ao iniciar
    this.setupSocketCallbacks();
    this.setupEventListeners();
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    this.setupSettingsMenu();
  }

  hideGameElements() {
    // Esconde todos os elementos principais do jogo, exceto o histórico
    [
      '#scoreboard-overlay',
      '#player0-container',
      '#player1-container',
      '#player2-container',
      '#player3-container',
      '#game_board_canvas',
      '#dorme-overlay',
      '#pass-turn-btn'
      // Removido: '#history-overlay' ou '#status_game'
    ].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.classList.add('game-hidden');
    });
  }

  showGameElements() {
    // Remove a classe que esconde os elementos e aplica fade-in simples
    [
      '#scoreboard-overlay',
      '#player0-container',
      '#player1-container',
      '#player2-container',
      '#player3-container',
      '#game_board_canvas',
      '#dorme-overlay',
      '#pass-turn-btn'
      // Removido: '#history-overlay' ou '#status_game'
    ].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        el.classList.remove('game-hidden', 'game-initializing', 'animate-scoreboard', 'animate-player-bottom', 'animate-player-left', 'animate-player-top', 'animate-player-right', 'animate-board', 'animate-dorme', 'animate-history', 'animate-pass-button');
        // Força reflow para reiniciar animação
        void el.offsetWidth;
        el.classList.add('game-fade-in');
      }
    });
  }

  setupSocketCallbacks() {
    // Remover callbacks duplicados - apenas configurar os essenciais aqui
    this.socketManager.setCallbacks({
      onConnected: (socketId) => {
        this.logHistory(`Conectado ao servidor: ${socketId}`);
        this.showConnectionStatus(true);
      },
      onPlayerLeft: (data) => {
        if (data && data.room) {
          this.updateRoomInfo(data.room);
          // Descobrir quem saiu comparando listas de jogadores
          if (this.lastPlayersList) {
            const prevNames = this.lastPlayersList;
            const currNames = data.room.players.map(p => p.name);
            const left = prevNames.find(name => !currNames.includes(name));
            if (left) {
              this.logHistory(`${left} saiu da sala`);
            } else {
              this.logHistory(`Um jogador saiu da sala`);
            }
          } else {
            this.logHistory(`Um jogador saiu da sala`);
          }
          this.lastPlayersList = data.room.players.map(p => p.name);
        }
      },
      
      onError: (error) => {
        this.logHistory(`❌ Erro: ${error}`, 'error');
        this.showError(error);
      }
    });
  }

  setupEventListeners() {
    // Event listeners para cliques nas peças do jogador
    document.addEventListener('click', (event) => {
      if (event.target.closest('.piece-in-hand')) {
        this.handlePieceClick(event);
      }
    });
  }

  handlePieceClick(event) {
    if (!this.isMyTurn()) {
      this.showError("Não é sua vez!");
      return;
    }

    const pieceElement = event.target.closest('.piece-in-hand');
    if (pieceElement.classList.contains('hidden-piece')) {
      this.showError("Você não pode jogar peças dos outros jogadores!");
      return;
    }
    const playerContainer = pieceElement.closest('.player-hand-container');
    if (playerContainer.id !== 'player0-container') {
      this.showError("Você só pode jogar suas próprias peças!");
      return;
    }
    const pieceIndex = Array.from(playerContainer.querySelector('.player_pieces').children).indexOf(pieceElement);

    // BLOQUEIO: Primeira jogada só pode jogar a maior dupla
    if (this.game.board.length === 0) {
      const obrigatoria = this.getMaiorDuplaIndex();
      if (pieceIndex !== obrigatoria) {
        this.showError("Na primeira jogada, você deve jogar a maior dupla!");
        return;
      }
    }
    this.showMoveOptions(pieceIndex);
  }

  getMaiorDuplaIndex() {
    // Retorna o índice da maior dupla do jogador atual (ou -1 se não houver)
    const minhasPecas = this.game.players[this.myPlayerIndex].getPieces();
    let maior = -1;
    let valor = -1;
    for (let i = 6; i >= 0; i--) {
      for (let j = 0; j < minhasPecas.length; j++) {
        if (minhasPecas[j].left === i && minhasPecas[j].right === i) {
          if (i > valor) {
            valor = i;
            maior = j;
          }
        }
      }
    }
    return maior;
  }

  showMoveOptions(pieceIndex) {
    const piece = this.game.players[this.myPlayerIndex].getPieces()[pieceIndex];
    
    if (this.game.board.length === 0) {
      // Primeira jogada
      this.makeMove(pieceIndex, 'right');
      return;
    }

    // Verificar onde a peça pode ser jogada
    const canPlayLeft = this.canPlayOnSide(piece, 'left');
    const canPlayRight = this.canPlayOnSide(piece, 'right');

    if (!canPlayLeft && !canPlayRight) {
      this.showError("Esta peça não pode ser jogada!");
      return;
    }

    if (canPlayLeft && canPlayRight) {
      // Mostrar opções para o jogador escolher
      this.showSideSelection(pieceIndex, piece);
    } else {
      // Jogar automaticamente no lado disponível
      const side = canPlayLeft ? 'left' : 'right';
      this.makeMove(pieceIndex, side);
    }
  }

  showSideSelection(pieceIndex, piece) {
    // Remove qualquer modal anterior
    const existingModal = document.querySelector('.side-selection-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'side-selection-overlay';
    modal.innerHTML = `
      <h4>🎯 Jogar ${piece.toString()}</h4>
      <div class="side-selection-buttons">
        <button class="side-option-btn" data-side="left">⬅️ Esquerda</button>
        <button class="side-option-btn" data-side="right">Direita ➡️</button>
      </div>
      <button class="side-cancel-btn">Cancelar</button>
    `;

    // Posicionar o modal próximo ao container do jogador atual (sempre player0)
    const playerContainer = document.getElementById('player0-container');
    const playerNameEl = document.getElementById('player0_name');
    
    // Posicionar acima do nome do jogador
    const containerRect = playerContainer.getBoundingClientRect();
    const nameRect = playerNameEl.getBoundingClientRect();
    
    modal.style.left = `${containerRect.left + (containerRect.width / 2) - 100}px`; // Centralizar
    modal.style.bottom = `${window.innerHeight - nameRect.top + 10}px`; // Acima do nome

    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('side-option-btn')) {
        const side = e.target.dataset.side;
        this.makeMove(pieceIndex, side);
        modal.remove();
      } else if (e.target.classList.contains('side-cancel-btn')) {
        modal.remove();
      }
    });

    // Adicionar ao container do jogo
    document.getElementById('game-container').appendChild(modal);

    // Auto-remover após 10 segundos
    setTimeout(() => {
      if (document.contains(modal)) {
        modal.remove();
      }
    }, 10000);
  }

  canPlayOnSide(piece, side) {
    if (this.game.board.length === 0) return true;
    
    const leftEnd = this.game.board[0].left;
    const rightEnd = this.game.board[this.game.board.length - 1].right;
    
    if (side === 'left') {
      return piece.left === leftEnd || piece.right === leftEnd;
    } else {
      return piece.left === rightEnd || piece.right === rightEnd;
    }
  }

  makeMove(pieceIndex, side) {
    this.socketManager.makeMove(pieceIndex, side);
    this.logHistory(`Você jogou a peça ${this.game.players[this.myPlayerIndex].pieces[pieceIndex].toString()}`);
  }

  passTurn() {
    if (!this.isMyTurn()) {
      this.showError("Não é sua vez!");
      return;
    }
    this.socketManager.passTurn();
    this.logHistory("Você passou a vez");
  }

  // Métodos de conexão e sala
  connectToServer() {
    this.socketManager.connect();
  }

  createRoom(roomId, playerName) {
    this.socketManager.createRoom(roomId, playerName);
  }

  joinRoom(roomId, playerName) {
    this.socketManager.joinRoom(roomId, playerName);
  }

  startGame() {
    if (!this.socketManager.isHost()) {
      this.showError("Apenas o host pode iniciar o jogo!");
      return;
    }
    this.socketManager.startGame();
  }

  // Método para iniciar o jogo com animações suaves
  startGameWithAnimation(gameState) {
    // Esconde elementos antes de atualizar dados
    this.hideGameElements();
    this.game.updateFromServer(gameState);
    this.findMyPlayerIndex();
    this.updateUI();
    this.showGameLoadingOverlay();
    setTimeout(() => {
      this.hideGameLoadingOverlay();
      this.showGameElements(); // Todos aparecem juntos com fade-in
    }, 1000);
  }

  showGameLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'game-loading-overlay';
    overlay.id = 'game-loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">Preparando o jogo...</div>
        <div class="loading-subtext">Distribuindo as peças</div>
      </div>
    `;
    document.getElementById('game-container').appendChild(overlay);
  }

  hideGameLoadingOverlay() {
    const overlay = document.getElementById('game-loading-overlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.remove();
      }, 500);
    }
  }

  prepareElementsForAnimation() {
    // Marcar elementos como invisíveis IMEDIATAMENTE
    const elements = [
      '#scoreboard-overlay',
      '#player0-container',
      '#player1-container', 
      '#player2-container',
      '#player3-container',
      '#game_board_canvas',
      '#dorme-overlay',
      '#history-overlay',
      '#pass-turn-btn'
    ];
    
    elements.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        // Forçar invisibilidade imediata
        element.style.opacity = '0';
        element.classList.add('game-initializing');
      }
    });
  }

  startAnimationSequence() {
    // Sequência de animações - agora os elementos já estão invisíveis
    setTimeout(() => {
      this.animateElement('#scoreboard-overlay', 'animate-scoreboard');
    }, 200);
    
    setTimeout(() => {
      this.animateElement('#player0-container', 'animate-player-bottom');
      this.animatePiecesWithDelay('#player0_pieces', 0);
    }, 400);
    
    setTimeout(() => {
      this.animateElement('#player1-container', 'animate-player-left');
      this.animatePiecesWithDelay('#player1_pieces', 100);
    }, 600);
    
    setTimeout(() => {
      this.animateElement('#player2-container', 'animate-player-top');
      this.animatePiecesWithDelay('#player2_pieces', 200);
    }, 800);
    
    setTimeout(() => {
      this.animateElement('#player3-container', 'animate-player-right');
      this.animatePiecesWithDelay('#player3_pieces', 300);
    }, 1000);
    
    setTimeout(() => {
      this.animateElement('#game_board_canvas', 'animate-board');
    }, 1200);
    
    setTimeout(() => {
      this.animateElement('#dorme-overlay', 'animate-dorme');
    }, 1400);
    
    setTimeout(() => {
      this.animateElement('#history-overlay', 'animate-history');
    }, 1600);
    
    setTimeout(() => {
      this.animateElement('#pass-turn-btn', 'animate-pass-button');
      this.placarRodada.textContent = "Jogo em andamento";
    }, 1800);
  }

  animateElement(selector, animationClass) {
    const element = document.querySelector(selector);
    if (element) {
      // Remover invisibilidade forçada e aplicar animação
      element.style.opacity = '';
      element.classList.remove('game-initializing');
      element.classList.add(animationClass);
    }
  }

  animatePiecesWithDelay(containerSelector, baseDelay) {
    const container = document.querySelector(containerSelector);
    if (container) {
      const pieces = container.querySelectorAll('.piece-in-hand');
      pieces.forEach((piece, index) => {
        setTimeout(() => {
          piece.classList.add('piece-appearing');
        }, baseDelay + (index * 100)); // 100ms entre cada peça
      });
    }
  }

  // Métodos de atualização da UI
  findMyPlayerIndex() {
    // Usar o índice enviado pelo servidor
    this.myPlayerIndex = this.game.myPlayerIndex;
  }

  isMyTurn() {
    return this.myPlayerIndex === this.game.currentPlayer && this.game.gameState === 'playing';
  }

  updateUI() {
    this.drawPlayersBoards();
    this.updateDorme();
    this.drawGameBoard();
    this.updateScoreboard();
    this.updateTurnIndicator();
    this.updatePassTurnButton(); // Adicionar verificação do botão
    if (this.updateSettingsMenuRestartBtn) this.updateSettingsMenuRestartBtn();
  }

  setupSettingsMenu() {
    // Configura o menu de opções (engrenagem)
    const settingsBtn = document.getElementById('settings-btn');
    const dropdown = document.getElementById('settings-dropdown');
    const restartBtn = document.getElementById('menu-restart-btn');
    const leaveBtn = document.getElementById('menu-leave-btn');

    if (!settingsBtn || !dropdown || !restartBtn) return;

    // Toggle do menu
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
    });
    // Fecha ao clicar fora
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== settingsBtn) {
        dropdown.style.display = 'none';
      }
    });
    // Ação do botão Nova Rodada
    restartBtn.addEventListener('click', () => {
      dropdown.style.display = 'none';
      this.restartGame();
    });
    // Ação do botão Sair do Jogo
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        dropdown.style.display = 'none';
        this.leaveGame();
      });
    }
    // Atualiza visibilidade do botão Nova Rodada
    this.updateSettingsMenuRestartBtn = () => {
      if (this.socketManager.isHost() && this.game.gameState === 'playing' && !this.game.isMatchOver) {
        restartBtn.style.display = 'block';
      } else {
        restartBtn.style.display = 'none';
      }
    };
    // Chama sempre que atualizar UI
    this.updateSettingsMenuRestartBtn();
  }

  updatePassTurnButton() {
    const passTurnBtn = document.getElementById('pass-turn-btn');
    
    if (!this.isMyTurn() || this.game.gameState !== 'playing') {
      passTurnBtn.style.display = 'none';
      return;
    }

    // Verificar se o jogador pode jogar alguma peça
    const myPieces = this.game.players[this.myPlayerIndex]?.pieces || [];
    const canPlayAnyPiece = myPieces.some(piece => this.canPiecePlay(piece));

    if (canPlayAnyPiece) {
      passTurnBtn.style.display = 'none'; // Esconder se pode jogar
    } else {
      passTurnBtn.style.display = 'block'; // Mostrar se não pode jogar
    }
  }

  updateTurnIndicator() {
    if (this.game.gameState === 'playing') {
      const currentPlayerName = this.game.players[this.game.currentPlayer]?.name;
      const isMyTurn = this.isMyTurn();
      
      this.placarRodada.innerHTML = isMyTurn 
        ? "<strong>🎯 SUA VEZ!</strong>"
        : `Vez de: <strong>${currentPlayerName}</strong>`;
    }
  }

  updateRoomInfo(roomData) {
    const playerList = roomData.players.map(p => p.name).join(", ");
    this.placarRodada.innerHTML = `
      <div>Sala: <strong>${roomData.roomId}</strong></div>
      <div>Jogadores (${roomData.playerCount}/${roomData.maxPlayers}): ${playerList}</div>
      ${roomData.playerCount === 4 ? '<div><strong>Sala completa! Host pode iniciar o jogo.</strong></div>' : ''}
    `;
  }

  checkGameStatus() {
    if (this.game.isMatchOver) {
      const winnerTeam = this.game.scores[0] >= this.game.scores[1] ? 0 : 1;
      const winnerTeamName = this.game.teamNames[winnerTeam];
      this.showVictoryModal(winnerTeamName);
    }
  }

  // Métodos de desenho (reutilizando da DominoUI original)
  resizeCanvas() {
    const container = document.getElementById("game-container");
    this.canvas.width = container.clientWidth * 0.8;
    this.canvas.height = container.clientHeight * 0.7;
    this.drawGameBoard();
  }

  drawHandPieceElement(piece, isVertical = false) {
    const pieceElement = document.createElement("div");
    pieceElement.classList.add("piece-in-hand", isVertical ? "vertical" : "horizontal");
    
    // Adicionar classe para indicar se é jogável
    // Destacar a peça obrigatória na primeira jogada
    if (this.isMyTurn() && this.game.board.length === 0) {
      const obrigatoria = this.getMaiorDuplaIndex();
      const minhasPecas = this.game.players[this.myPlayerIndex].getPieces();
      if (obrigatoria !== -1 && minhasPecas[obrigatoria] === piece) {
        pieceElement.classList.add("obrigatoria-piece");
      } else {
        pieceElement.classList.add("bloqueada-piece");
      }
    } else if (this.isMyTurn() && this.canPiecePlay(piece)) {
      pieceElement.classList.add("playable-piece");
    }
    
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

  canPiecePlay(piece) {
    if (this.game.board.length === 0) return true;
    return this.canPlayOnSide(piece, 'left') || this.canPlayOnSide(piece, 'right');
  }

  drawPlayersBoards() {
    // Reorganizar jogadores para que o jogador atual sempre apareça na posição inferior
    const myIndex = this.game.myPlayerIndex;
    if (myIndex === undefined || myIndex === null) return;

    // Mapear posições visuais baseado no jogador atual
    const visualPositions = this.getVisualPositions(myIndex);

    visualPositions.forEach((gamePlayerIndex, visualPosition) => {
      const player = this.game.players[gamePlayerIndex];
      if (!player) return;

      const playerNameEl = document.querySelector(`#player${visualPosition}_name`);
      const playerTeamEl = document.querySelector(`#player${visualPosition}_team`);
      const playerPiecesEl = document.querySelector(`#player${visualPosition}_pieces`);

      if (playerNameEl) {
        playerNameEl.textContent = player.name;
        // Destacar o jogador atual
        if (gamePlayerIndex === this.game.currentPlayer && this.game.gameState === 'playing') {
          playerNameEl.style.backgroundColor = 'rgba(255, 215, 0, 0.8)';
          playerNameEl.style.color = 'black';
        } else {
          playerNameEl.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          playerNameEl.style.color = 'white';
        }
      }
      
      if (playerTeamEl) {
        playerTeamEl.textContent = `Dupla ${(gamePlayerIndex % 2) + 1}`;
      }
      
      if (playerPiecesEl) {
        playerPiecesEl.innerHTML = "";
        const isVertical = visualPosition === 1 || visualPosition === 3;
        
        if (gamePlayerIndex === myIndex && player.pieces.length > 0) {
          // Mostrar peças do jogador atual
          player.pieces.forEach((piece) => {
            const pieceElement = this.drawHandPieceElement(piece, !isVertical);
            playerPiecesEl.appendChild(pieceElement);
          });
        } else {
          // Mostrar número de peças dos outros jogadores
          for (let i = 0; i < player.pieceCount; i++) {
            const hiddenPiece = document.createElement("div");
            hiddenPiece.classList.add("piece-in-hand", isVertical ? "horizontal" : "vertical", "hidden-piece");
            hiddenPiece.textContent = "?";
            playerPiecesEl.appendChild(hiddenPiece);
          }
        }
      }
    });
  }

  // Função para mapear as posições visuais baseado no jogador atual
  getVisualPositions(myPlayerIndex) {
    // Layout padrão: [bottom, left, top, right] = [0, 1, 2, 3]
    // O jogador atual sempre fica em baixo (posição 0)
    const positions = [null, null, null, null];
    
    // Jogador atual sempre na posição 0 (embaixo)
    positions[0] = myPlayerIndex;
    
    // Distribuir outros jogadores em sentido horário
    positions[1] = (myPlayerIndex + 1) % 4; // esquerda
    positions[2] = (myPlayerIndex + 2) % 4; // topo  
    positions[3] = (myPlayerIndex + 3) % 4; // direita
    
    return positions;
  }

  drawGameBoard() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.game.board.length === 0) return;

    // Implementação simplificada do desenho do tabuleiro
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.game.board.forEach((piece, index) => {
      const x = centerX + (index - this.game.board.length / 2) * (this.PIECE_WIDTH + 5);
      const y = centerY;
      this.drawCanvasPiece(piece, x, y);
    });
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

    this.drawPips(ctx, piece.left, -w / 4, 0, swapPips);
    this.drawPips(ctx, piece.right, w / 4, 0, swapPips);

    ctx.restore();
  }

  drawPips(ctx, value, centerX, centerY, swapAxes = false) {
    ctx.fillStyle = "#333";
    const positions = {
      1: [[0, 0]],
      2: [[-0.25, -0.25], [0.25, 0.25]],
      3: [[-0.25, -0.25], [0, 0], [0.25, 0.25]],
      4: [[-0.25, -0.25], [-0.25, 0.25], [0.25, -0.25], [0.25, 0.25]],
      5: [[-0.25, -0.25], [-0.25, 0.25], [0, 0], [0.25, -0.25], [0.25, 0.25]],
      6: [[-0.35, -0.35], [-0.35, 0], [-0.35, 0.35], [0.35, -0.35], [0.35, 0], [0.35, 0.35]]
    };
    
    if (positions[value]) {
      const pipAreaSize = this.PIECE_HEIGHT * 0.6;
      positions[value].forEach(([px, py]) => {
        ctx.beginPath();
        if (swapAxes) {
          ctx.arc(centerX + py * pipAreaSize, centerY + px * pipAreaSize, this.PIP_RADIUS, 0, 2 * Math.PI);
        } else {
          ctx.arc(centerX + px * pipAreaSize, centerY + py * pipAreaSize, this.PIP_RADIUS, 0, 2 * Math.PI);
        }
        ctx.fill();
      });
    }
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
    if (this.game.teamNames.length === 0) return;
    
    this.scoreboardEl.innerHTML = `
      <div class="team-names-scoreboard">
        <span>${this.game.players[0]?.name || 'Jogador 1'}</span>
        <span>${this.game.players[2]?.name || 'Jogador 3'}</span>
      </div>
      <span class="score-number">${this.game.scores[0]}</span>
      <span class="versus-separator">x</span>
      <span class="score-number">${this.game.scores[1]}</span>
      <div class="team-names-scoreboard">
        <span>${this.game.players[1]?.name || 'Jogador 2'}</span>
        <span>${this.game.players[3]?.name || 'Jogador 4'}</span>
      </div>
    `;
  }

  logHistory(message, type = 'info') {
    const liElement = document.createElement("li");
    liElement.innerHTML = `<span class="${type}">${message}</span>`;
    this.statusGame.prepend(liElement);
  }

  showError(message) {
    this.logHistory(`❌ ${message}`, 'error');
    // Pode adicionar um toast ou modal aqui
  }

  showConnectionStatus(connected) {
    const status = connected ? '🟢 Conectado' : '🔴 Desconectado';
    this.logHistory(status);
  }

  showVictoryModal(winnerTeamName) {
    this.victoryModalContent.innerHTML = `
      <h2>🎉 Vitória!</h2>
      <p>A dupla vencedora é</p>
      <h3>${winnerTeamName}</h3>
      <button id="close-modal-btn">Fechar</button>
    `;
    this.victoryModal.style.display = "flex";

    document.getElementById("close-modal-btn").addEventListener("click", () => {
      this.victoryModal.style.display = "none";
    });
  }

  showRoundEndedModal(winnerInfo) {
    const { winType, teamIndex, playerName, teamScores, playerScores, pointDifference } = winnerInfo;
    
    let modalContent = '';
    
    if (winType === 'batida') {
      modalContent = `
        <h2>🎉 Batida!</h2>
        <p><strong>${playerName}</strong> venceu por batida!</p>
        <p>A dupla <strong>${this.game.teamNames[teamIndex]}</strong> ganhou a rodada</p>
      `;
    } else if (winType === 'fechado') {
      const winnerTeamName = this.game.teamNames[teamIndex];
      const loserTeamScore = teamScores[teamIndex === 0 ? 1 : 0];
      const winnerTeamScore = teamScores[teamIndex];
      
      modalContent = `
        <h2>🔒 Jogo Fechado!</h2>
        <p>Todos os jogadores passaram a vez</p>
        <h3>🏆 ${winnerTeamName} venceu!</h3>
        <div class="score-details">
          <h4>Pontuação das Duplas:</h4>
          <p><strong>${this.game.teamNames[0]}:</strong> ${teamScores[0]} pontos</p>
          <p><strong>${this.game.teamNames[1]}:</strong> ${teamScores[1]} pontos</p>
          <p><em>Diferença: ${pointDifference} pontos</em></p>
        </div>
        <div class="player-details">
          <h4>Pontuação Individual:</h4>
          ${this.game.players.map((player, index) => 
            `<p><strong>${player.name}:</strong> ${playerScores[index]} pontos</p>`
          ).join('')}
        </div>
      `;
    }
    
    // Verificar se a partida terminou completamente
    const isMatchOver = this.game.isMatchOver;
    const restartButtonHtml = this.socketManager.isHost() && !isMatchOver 
      ? '<button id="restart-game-btn" class="restart-btn">🔄 Nova Rodada</button>' 
      : '';
    
    this.victoryModalContent.innerHTML = `
      ${modalContent}
      <div class="modal-buttons">
        <button id="close-modal-btn">Continuar</button>
        ${restartButtonHtml}
      </div>
    `;
    
    this.victoryModal.style.display = "flex";

    // Event listeners
    document.getElementById("close-modal-btn").addEventListener("click", () => {
      this.victoryModal.style.display = "none";
    });

    // Botão de reiniciar (apenas para host)
    const restartBtn = document.getElementById("restart-game-btn");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        this.restartGame();
        this.victoryModal.style.display = "none";
      });
    }

    // Atualizar o histórico com informações da rodada
    if (winType === 'batida') {
      this.logHistory(`🎉 ${playerName} venceu por batida!`);
    } else {
      this.logHistory(`🔒 Jogo fechado! ${this.game.teamNames[teamIndex]} venceu por ${pointDifference} pontos de diferença`);
    }
  }

  restartGame() {
    if (!this.socketManager.isHost()) {
      this.showError("Apenas o host pode reiniciar o jogo!");
      return;
    }
    this.socketManager.restartGame();
    this.logHistory("🔄 Host solicitou nova rodada...");
  }

  leaveGame() {
    // Desconecta do servidor e recarrega a página (ou volta para tela inicial)
    this.socketManager.disconnect && this.socketManager.disconnect();
    window.location.reload();
  }

  // Método para inicializar o modo multiplayer
  startMultiplayer() {
    this.logHistory("🚀 Modo Multiplayer iniciado!");
    this.logHistory("Use os métodos: connectToServer(), createRoom(), joinRoom()");
    this.placarRodada.textContent = "Aguardando conexão com servidor...";
  }
}