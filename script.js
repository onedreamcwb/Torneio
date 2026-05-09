// ==========================================
// CONFIGURAÇÕES DO TORNEIO (Fichas e Valores)
// ==========================================
const BUYIN_MONEY = 1.00; 
const REBUY_MONEY = 1.00; 

const STARTING_CHIPS = 500; // Baseado na maleta (5x1, 5x5, 7x10, 6x25, 5x50)
const REBUY_CHIPS = 500;

// Estrutura ajustada para Stack de 500 (Iniciando com 50 Big Blinds)
const DEFAULT_BLINDS = [
    { level: 1, sb: 5, bb: 10, duration: 15 },
    { level: 2, sb: 10, bb: 20, duration: 15 },
    { level: 3, sb: 15, bb: 30, duration: 15 },
    { level: 4, sb: 25, bb: 50, duration: 15 },
    { level: 5, sb: 50, bb: 100, duration: 15 },
    { level: 6, sb: 75, bb: 150, duration: 15 },
    { level: 7, sb: 100, bb: 200, duration: 15 },
    { level: 8, sb: 150, bb: 300, duration: 15 },
    { level: 9, sb: 200, bb: 400, duration: 15 }
];

// ==========================================
// ESTADO GLOBAL DA APLICAÇÃO
// ==========================================
let blindLevels = JSON.parse(localStorage.getItem('dc_blinds')) || DEFAULT_BLINDS;
let activePlayers = JSON.parse(localStorage.getItem('dc_active_game')) || [];

let currentLevelIdx = 0;
let timerSeconds = blindLevels[0].duration * 60; 
let timerInterval = null;

window.onload = () => {
    updateBlindDisplay();
    updateTimerDisplay();
    renderPlayers();
    updateTournamentStats();
    renderBlindConfig();
};

// ==========================================
// NAVEGAÇÃO SPA
// ==========================================
function showSection(sectionId, btnElement) {
    document.querySelectorAll('.spa-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    btnElement.classList.add('active');
}

// ==========================================
// TIMER E BLINDS
// ==========================================
function updateTimerDisplay() {
    const min = Math.floor(timerSeconds / 60);
    const sec = timerSeconds % 60;
    document.getElementById('timer').innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function toggleTimer() {
    const btn = document.getElementById('btn-play');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        btn.innerText = "▶ PLAY";
        btn.style.backgroundColor = "var(--primary)";
    } else {
        btn.innerText = "⏸ PAUSE";
        btn.style.backgroundColor = "var(--accent)";
        timerInterval = setInterval(() => {
            if (timerSeconds <= 0) {
                document.getElementById('alert-sound').play().catch(e => console.log("Áudio bloqueado"));
                nextLevel();
            } else {
                timerSeconds--;
                updateTimerDisplay();
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = blindLevels[currentLevelIdx].duration * 60;
    document.getElementById('btn-play').innerText = "▶ PLAY";
    document.getElementById('btn-play').style.backgroundColor = "var(--primary)";
    updateTimerDisplay();
}

function nextLevel() {
    if (currentLevelIdx < blindLevels.length - 1) {
        currentLevelIdx++;
        resetTimer(); 
        updateBlindDisplay();
    } else { alert("Último nível atingido!"); }
}

function previousLevel() {
    if (currentLevelIdx > 0) {
        currentLevelIdx--;
        resetTimer(); 
        updateBlindDisplay();
    }
}

function updateBlindDisplay() {
    const current = blindLevels[currentLevelIdx];
    const next = blindLevels[currentLevelIdx + 1];
    document.getElementById('display-current-blind').innerText = `${current.sb} / ${current.bb}`;
    document.getElementById('display-next-blind').innerText = next ? `${next.sb} / ${next.bb}` : "FINAL";
}

// ==========================================
// ESTATÍSTICAS, JOGADORES E MATEMÁTICA
// ==========================================
function handleEnter(event) { if (event.key === 'Enter') addPlayer(); }

function addPlayer() {
    const input = document.getElementById('player-name');
    const name = input.value.trim();
    if (name === "") return;

    activePlayers.push({ name: name, rebuys: 0, status: 'Ativo' });
    input.value = "";
    input.focus();
    
    saveGameState();
    renderPlayers();
    updateTournamentStats();
}

function updateTournamentStats() {
    let totalMoney = 0;
    let totalChips = 0;
    let playersAlive = 0;
    let totalEntries = activePlayers.length;

    activePlayers.forEach(p => {
        totalMoney += BUYIN_MONEY + (p.rebuys * REBUY_MONEY);
        totalChips += STARTING_CHIPS + (p.rebuys * REBUY_CHIPS);
        if (p.status === 'Ativo') playersAlive++;
    });

    const averageStack = playersAlive > 0 ? Math.floor(totalChips / playersAlive) : 0;

    // Atualiza Painel do Timer
    document.getElementById('display-active-players').innerText = `${playersAlive} / ${totalEntries}`;
    document.getElementById('display-prize-pool').innerText = `R$ ${totalMoney.toFixed(2).replace('.', ',')}`;
    document.getElementById('display-average-stack').innerText = averageStack.toLocaleString('pt-BR');

    // Atualiza Aba de Premiação
    document.getElementById('total-money-prize').innerText = `R$ ${totalMoney.toFixed(2).replace('.', ',')}`;
    document.getElementById('prize-winner-all').innerText = `R$ ${totalMoney.toFixed(2).replace('.', ',')}`;
    document.getElementById('prize-first').innerText = `R$ ${(totalMoney * 0.70).toFixed(2).replace('.', ',')}`;
    document.getElementById('prize-second').innerText = `R$ ${(totalMoney * 0.30).toFixed(2).replace('.', ',')}`;
}

// Ações Rápidas da Mesa
function toggleStatus(index) {
    activePlayers[index].status = activePlayers[index].status === 'Ativo' ? 'Eliminado' : 'Ativo';
    saveGameState();
    renderPlayers();
    updateTournamentStats();
}

function addRebuy(index) {
    if(activePlayers[index].status === 'Eliminado') {
        if(!confirm(`${activePlayers[index].name} vai fazer Rebuy e voltar pro jogo?`)) return;
        activePlayers[index].status = 'Ativo';
    }
    activePlayers[index].rebuys += 1;
    saveGameState();
    renderPlayers();
    updateTournamentStats();
}

function removePlayer(index) {
    if(confirm("Remover este jogador da mesa definitivamente?")) {
        activePlayers.splice(index, 1);
        saveGameState();
        renderPlayers();
        updateTournamentStats();
    }
}

function renderPlayers() {
    const tbody = document.getElementById('player-list');
    if(activePlayers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-dim);">A mesa está vazia.</td></tr>`;
        return;
    }

    tbody.innerHTML = activePlayers.map((p, i) => {
        const statusClass = p.status === 'Ativo' ? 'status-active' : 'status-busted';
        return `
        <tr>
            <td class="${statusClass}">${p.name}</td>
            <td class="${statusClass}">${p.status}</td>
            <td>${p.rebuys}</td>
            <td>
                <button class="btn-action" onclick="addRebuy(${i})">+ Rebuy</button>
                <button class="btn-remove" onclick="toggleStatus(${i})">${p.status === 'Ativo' ? 'Bust (Eliminar)' : 'Voltar à Vida'}</button>
                <button class="btn-remove" style="background:#334155;" onclick="removePlayer(${i})">X</button>
            </td>
        </tr>`;
    }).join('');
}

function saveGameState() { localStorage.setItem('dc_active_game', JSON.stringify(activePlayers)); }

function resetTournament() {
    if(confirm("Encerrar este torneio e limpar a mesa para um novo jogo?")) {
        activePlayers = [];
        currentLevelIdx = 0;
        saveGameState();
        resetTimer();
        renderPlayers();
        updateTournamentStats();
        updateBlindDisplay();
        showSection('timer-section', document.querySelectorAll('.nav-btn')[0]);
    }
}

// ==========================================
// CONFIGURAÇÃO DE BLINDS
// ==========================================
function renderBlindConfig() {
    const tbody = document.getElementById('blind-config-list');
    tbody.innerHTML = blindLevels.map((b) => `
        <tr>
            <td>Nível ${b.level}</td>
            <td>${b.sb}</td>
            <td>${b.bb}</td>
            <td>${b.duration}</td>
        </tr>
    `).join('');
}