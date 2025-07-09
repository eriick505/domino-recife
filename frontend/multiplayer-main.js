import { MultiplayerDominoUI } from './MultiplayerDominoUI.js';

// Inicializar o modo multiplayer
const multiplayerUI = new MultiplayerDominoUI();

// Configurar modal inicial
class EntryModal {
  constructor(multiplayerUI) {
    this.multiplayerUI = multiplayerUI;
    this.modal = document.getElementById('entry-modal');
    this.connectionIndicator = document.getElementById('connection-indicator');
    this.startGameBtn = document.getElementById('start-game-btn');
    
    this.setupEventListeners();
    this.autoConnect();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Criar sala
    document.getElementById('create-room-btn').addEventListener('click', () => {
      this.createRoom();
    });

    // Entrar na sala  
    document.getElementById('join-room-btn').addEventListener('click', () => {
      this.joinRoom();
    });

    // Botão iniciar jogo
    this.startGameBtn.addEventListener('click', () => {
      this.multiplayerUI.startGame();
    });

    // Enter key nos inputs
    document.querySelectorAll('input').forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const activeTab = document.querySelector('.tab-content.active');
          const button = activeTab.querySelector('.action-btn');
          button.click();
        }
      });
    });
  }

  switchTab(tabName) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  autoConnect() {
    this.multiplayerUI.connectToServer();
    
    // Configurar callbacks do socket
    this.multiplayerUI.socketManager.setCallbacks({
      onConnected: (socketId) => {
        this.connectionIndicator.textContent = '🟢 Conectado';
        this.connectionIndicator.style.color = '#28a745';
      },
      
      onRoomCreated: (roomData) => {
        this.hideModal();
        this.showStartButton();
        this.multiplayerUI.logHistory(`Sala "${roomData.roomId}" criada! Aguardando jogadores...`);
      },
      
      onPlayerJoined: (data) => {
        this.hideModal();
        this.multiplayerUI.logHistory(`${data.playerName} entrou na sala`);
        this.multiplayerUI.updateRoomInfo(data.room);
        
        // Mostrar botão de iniciar apenas para host
        if (this.multiplayerUI.socketManager.isHost()) {
          this.showStartButton();
        }
      },
      
      onGameStarted: (gameState) => {
        this.hideStartButton();
        this.multiplayerUI.logHistory("Jogo iniciado! Boa sorte!");
        
        // Mostrar informações sobre a primeira jogada
        if (gameState.firstMoveInfo) {
          if (gameState.firstMoveInfo.piece) {
            this.multiplayerUI.logHistory(`${gameState.firstMoveInfo.playerName} iniciou com a peça ${gameState.firstMoveInfo.piece.left === gameState.firstMoveInfo.piece.right ? `[${gameState.firstMoveInfo.piece.left}-${gameState.firstMoveInfo.piece.right}] (Dupla)` : `[${gameState.firstMoveInfo.piece.left}-${gameState.firstMoveInfo.piece.right}]`}`);
          } else {
            this.multiplayerUI.logHistory(`${gameState.firstMoveInfo.playerName} deve iniciar a rodada com a maior dupla!`);
          }
        }
        
        // Iniciar transição animada do jogo
        this.multiplayerUI.startGameWithAnimation(gameState);
      },
      
      onGameUpdate: (gameState) => {
        this.multiplayerUI.game.updateFromServer(gameState);
        this.multiplayerUI.updateUI();
        this.multiplayerUI.checkGameStatus();
      },
      
      onRoundEnded: (data) => {
        this.multiplayerUI.game.updateFromServer(data);
        this.multiplayerUI.updateUI();
        this.multiplayerUI.showRoundEndedModal(data.winnerInfo);
      },
      
      onError: (error) => {
        this.multiplayerUI.logHistory(`❌ Erro: ${error}`, 'error');
        this.showError(error);
      }
    });
  }

  createRoom() {
    const roomId = document.getElementById('create-room-id').value.trim();
    const playerName = document.getElementById('create-player-name').value.trim();

    if (!roomId || !playerName) {
      this.showError('Preencha todos os campos!');
      return;
    }

    this.multiplayerUI.createRoom(roomId, playerName);
  }

  joinRoom() {
    const roomId = document.getElementById('join-room-id').value.trim();
    const playerName = document.getElementById('join-player-name').value.trim();

    if (!roomId || !playerName) {
      this.showError('Preencha todos os campos!');
      return;
    }

    this.multiplayerUI.joinRoom(roomId, playerName);
  }

  hideModal() {
    this.modal.style.display = 'none';
  }

  showStartButton() {
    this.startGameBtn.style.display = 'flex';
  }

  hideStartButton() {
    this.startGameBtn.style.display = 'none';
  }

  showError(message) {
    // Criar toast temporário
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #dc3545;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 3000;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Inicializar modal
const entryModal = new EntryModal(multiplayerUI);

// Disponibilizar globalmente para compatibilidade
window.multiplayerGame = {
  ui: multiplayerUI,
  modal: entryModal,
  
  // Métodos de conveniência (ainda funcionam para testes no console)
  connect: () => multiplayerUI.connectToServer(),
  createRoom: (roomId, playerName) => multiplayerUI.createRoom(roomId, playerName),
  joinRoom: (roomId, playerName) => multiplayerUI.joinRoom(roomId, playerName),
  startGame: () => multiplayerUI.startGame(),
  passTurn: () => multiplayerUI.passTurn()
};

console.log('🎮 Modo Multiplayer carregado com interface melhorada!');