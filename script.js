// ==========================================
// CONFIGURAÇÕES E ESTADO
// ==========================================
const BUYIN_MONEY = 1.00; 
const REBUY_MONEY = 1.00; 
const STARTING_CHIPS = 500;
const REBUY_CHIPS = 500;

const DEFAULT_BLINDS = [
    { level: 1, sb: 5, bb: 10, duration: 15 },
    { level: 2, sb: 10, bb: 20, duration: 15 },
    { level: 3, sb: 15, bb: 30, duration: 15 },
    { level: 4, sb: 25, bb: 50, duration: 15 },
    { level: 5, sb: 50, bb: 100, duration: 15 },
    { level: 6, sb: 75, bb: 150, duration: 15 },
    { level: 7, sb: 100, bb: 200, duration: 15 },
    { level: 8, sb: 150, bb: 300, duration: 15 }
];

let blindLevels = JSON.parse(localStorage.getItem('dc_blinds')) || JSON.parse(JSON.stringify(DEFAULT_BLINDS));
let members = JSON.parse(localStorage.getItem('dc_members')) || [];
let ranking = JSON.parse(localStorage.getItem('dc_ranking')) || {}; 
let activePlayers = JSON.parse(localStorage.getItem('dc_active_game')) || []; 

let currentLevelIdx = 0;
let timerSeconds = blindLevels[0].duration * 60; 
let timerInterval = null;

window.onload = () => {
    updateBlindDisplay();
    updateTimerDisplay();
    renderMembers();
    renderRanking();
    renderPlayers();
    updateTournamentStats();
    renderBlindConfig();
};

function showSection(sectionId, btnElement) {
    document.querySelectorAll('.spa-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    btnElement.classList.add('active');
}

// ==========================================
// FUNÇÃO AUXILIAR: AVATAR INTELIGENTE
// ==========================================
// Se o cara não tiver foto cadastrada, cria um avatar verde com as iniciais do nome dele
function getPlayerPhoto(playerName) {
    const member = members.find(m => m.name === playerName);
    if (member && member.photo) {
        return member.photo;
    }
    // API que gera a imagem com iniciais
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&background=22c55e&color=fff&bold=true&size=100`;
}

// ==========================================
// TIMER E BLINDS 
// ==========================================
function updateTimerDisplay() {
    const min = Math.floor(timerSeconds / 60);
    const sec = timerSeconds % 60;
    const timerElement = document.getElementById('timer');
    
    timerElement.innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

    timerElement.classList.remove('timer-warning', 'timer-danger');
    if (timerSeconds <= 60 && timerSeconds > 10) {
        timerElement.classList.add('timer-warning'); 
    } else if (timerSeconds <= 10 && timerSeconds > 0) {
        timerElement.classList.add('timer-danger'); 
    }
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
            if (timerSeconds === 60) {
                document.getElementById('warning-sound').play().catch(e=>console.log("Audio blq"));
            }
            if (timerSeconds <= 0) {
                document.getElementById('alert-sound').play().catch(e=>console.log("Audio blq"));
                nextLevel(); 
            } else {
                timerSeconds--;
                updateTimerDisplay();
            }
        }, 1000);
    }
}

function nextLevel() {
    if (currentLevelIdx < blindLevels.length - 1) {
        currentLevelIdx++;
        timerSeconds = blindLevels[currentLevelIdx].duration * 60; 
        updateBlindDisplay();
        updateTimerDisplay();
    } else {
        alert("Último nível da estrutura atingido!");
        resetTimer();
    }
}

function previousLevel() {
    if (currentLevelIdx > 0) {
        currentLevelIdx--;
        timerSeconds = blindLevels[currentLevelIdx].duration * 60; 
        updateBlindDisplay();
        updateTimerDisplay();
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

function updateBlindDisplay() {
    const current = blindLevels[currentLevelIdx];
    const next = blindLevels[currentLevelIdx + 1];
    document.getElementById('display-current-blind').innerText = `${current.sb} / ${current.bb}`;
    document.getElementById('display-next-blind').innerText = next ? `${next.sb} / ${next.bb}` : "FINAL";
}

// ==========================================
// CONFIGURAÇÃO EDITÁVEL DE BLINDS
// ==========================================
function renderBlindConfig() {
    const tbody = document.getElementById('blind-config-list');
    tbody.innerHTML = blindLevels.map((b, i) => `
        <tr>
            <td>Nível ${b.level}</td>
            <td><input type="number" value="${b.sb}" onchange="updateBlindData(${i}, 'sb', this.value)"></td>
            <td><input type="number" value="${b.bb}" onchange="updateBlindData(${i}, 'bb', this.value)"></td>
            <td><input type="number" value="${b.duration}" onchange="updateBlindData(${i}, 'duration', this.value)"></td>
        </tr>
    `).join('');
}

function updateBlindData(index, field, value) {
    blindLevels[index][field] = parseInt(value) || 0;
    localStorage.setItem('dc_blinds', JSON.stringify(blindLevels)); 
    if (index === currentLevelIdx || index === currentLevelIdx + 1) {
        updateBlindDisplay();
    }
}

function resetDefaultBlinds() {
    if(confirm("Restaurar estrutura padrão (Stack 500, começando em 5/10)?")) {
        blindLevels = JSON.parse(JSON.stringify(DEFAULT_BLINDS)); 
        localStorage.setItem('dc_blinds', JSON.stringify(blindLevels));
        renderBlindConfig();
        updateBlindDisplay();
        resetTimer();
    }
}

// ==========================================
// GESTÃO DE MEMBROS E AVATARES
// ==========================================
function registerNewMember() {
    const nameInput = document.getElementById('new-member-name');
    const photoInput = document.getElementById('new-member-photo');
    
    const name = nameInput.value.trim();
    const photo = photoInput.value.trim();
    
    if (!name) return;

    if (members.find(m => m.name === name)) return alert("Este membro já existe!");

    // Salva o membro com a foto (se tiver), se não fica vazio e a API resolve
    members.push({ name: name, photo: photo, date: new Date().toLocaleDateString() });
    localStorage.setItem('dc_members', JSON.stringify(members));
    
    nameInput.value = "";
    photoInput.value = "";
    renderMembers();
}

function renderMembers() {
    const table = document.getElementById('members-list-table');
    const select = document.getElementById('member-select');
    
    table.innerHTML = members.map((m, i) => `
        <tr>
            <td>
                <div class="player-profile">
                    <img src="${getPlayerPhoto(m.name)}" class="player-avatar" alt="${m.name}">
                    <span>${m.name}</span>
                </div>
            </td>
            <td>${m.date}</td>
            <td><button class="btn-remove" onclick="deleteMember(${i})">X</button></td>
        </tr>
    `).join('');

    select.innerHTML = '<option value="">Selecione um membro...</option>' + 
        members.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
}

function deleteMember(index) {
    if (confirm("Remover membro permanentemente?")) {
        members.splice(index, 1);
        localStorage.setItem('dc_members', JSON.stringify(members));
        renderMembers();
    }
}

// ==========================================
// GESTÃO DO JOGO ATUAL
// ==========================================
function addMemberToTable() {
    const select = document.getElementById('member-select');
    const name = select.value;
    if (!name) return;

    if (activePlayers.find(p => p.name === name)) return alert("Jogador já está na mesa!");

    activePlayers.push({ name: name, status: 'Ativo', rebuys: 0, tempGain: 0 }); 
    saveGameState();
    renderPlayers();
    updateTournamentStats();
}

function renderPlayers() {
    const tbody = document.getElementById('player-list');
    
    if(activePlayers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim);">A mesa está vazia. Adicione os jogadores acima.</td></tr>`;
        return;
    }

    tbody.innerHTML = activePlayers.map((p, i) => `
        <tr>
            <td class="${p.status === 'Ativo' ? 'status-active' : 'status-busted'}">
                <div class="player-profile">
                    <img src="${getPlayerPhoto(p.name)}" class="player-avatar" alt="${p.name}">
                    <span>${p.name}</span>
                </div>
            </td>
            <td class="${p.status === 'Ativo' ? 'status-active' : 'status-busted'}">${p.status}</td>
            <td>${p.rebuys}</td>
            <td>
                <input type="number" placeholder="0.00" step="1" min="0" onchange="updateProfit(${i}, this.value)" value="${p.tempGain > 0 ? p.tempGain : ''}">
            </td>
            <td>
                <button class="btn-action" onclick="addRebuy(${i})">+ RB</button>
                <button class="btn-remove" onclick="toggleBust(${i})">${p.status === 'Ativo' ? 'Bust (Caiu)' : 'Voltar'}</button>
            </td>
        </tr>
    `).join('');
}

function addRebuy(index) {
    activePlayers[index].rebuys++;
    saveGameState();
    updateTournamentStats();
    renderPlayers();
}

function toggleBust(index) {
    activePlayers[index].status = activePlayers[index].status === 'Ativo' ? 'Eliminado' : 'Ativo';
    saveGameState();
    renderPlayers();
}

function updateProfit(index, val) {
    activePlayers[index].tempGain = parseFloat(val) || 0;
    saveGameState();
}

function updateTournamentStats() {
    let totalMoney = (activePlayers.length * BUYIN_MONEY) + activePlayers.reduce((sum, p) => sum + (p.rebuys * REBUY_MONEY), 0);
    let playersAlive = activePlayers.filter(p => p.status === 'Ativo').length;
    let totalChips = (activePlayers.length * STARTING_CHIPS) + activePlayers.reduce((sum, p) => sum + (p.rebuys * REBUY_CHIPS), 0);
    let averageStack = playersAlive > 0 ? Math.floor(totalChips / playersAlive) : 0;

    document.getElementById('display-active-players').innerText = `${playersAlive} / ${activePlayers.length}`;
    document.getElementById('display-average-stack').innerText = averageStack.toLocaleString('pt-BR');
    document.getElementById('display-prize-pool').innerText = `R$ ${totalMoney.toFixed(2)}`;
    document.getElementById('total-money-prize').innerText = `R$ ${totalMoney.toFixed(2)}`;
    document.getElementById('prize-winner-all').innerText = `R$ ${totalMoney.toFixed(2)}`;
}

function saveGameState() { 
    localStorage.setItem('dc_active_game', JSON.stringify(activePlayers)); 
}

// ==========================================
// RANKING
// ==========================================
function finishTournament() {
    if (activePlayers.length === 0) return alert("Não há jogo para encerrar.");
    if (!confirm("Isso vai encerrar o jogo e atualizar o Ranking Geral. Confirmar?")) return;

    activePlayers.forEach(p => {
        if (!ranking[p.name]) ranking[p.name] = { games: 0, wins: 0, profit: 0 };
        
        ranking[p.name].games += 1;
        
        const sessionProfit = (p.tempGain || 0) - (BUYIN_MONEY + (p.rebuys * REBUY_MONEY));
        ranking[p.name].profit += sessionProfit;
        
        if (p.tempGain > 0) ranking[p.name].wins += 1; 
    });

    localStorage.setItem('dc_ranking', JSON.stringify(ranking));
    activePlayers = [];
    currentLevelIdx = 0;
    saveGameState();
    
    alert("Ranking Atualizado!");
    resetTimer();
    renderPlayers();
    updateTournamentStats();
    renderRanking();
    
    showSection('ranking-section', document.querySelectorAll('.nav-btn')[3]);
}

function renderRanking() {
    const table = document.getElementById('global-ranking-table');
    const sorted = Object.entries(ranking)
        .sort((a, b) => b[1].profit - a[1].profit);

    if (sorted.length === 0) {
        table.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim);">Nenhum histórico registrado.</td></tr>`;
        return;
    }

    table.innerHTML = sorted.map(([name, stats], i) => {
        let medal = i === 0 ? 'rank-gold' : (i === 1 ? 'rank-silver' : (i === 2 ? 'rank-bronze' : ''));
        return `
            <tr class="${medal}">
                <td>${i + 1}º</td>
                <td>
                    <div class="player-profile">
                        <img src="${getPlayerPhoto(name)}" class="player-avatar" alt="${name}">
                        <span>${name}</span>
                    </div>
                </td>
                <td>${stats.games}</td>
                <td>${stats.wins}</td>
                <td style="color: ${stats.profit >= 0 ? 'var(--primary)' : 'var(--danger)'}">
                    R$ ${stats.profit.toFixed(2)}
                </td>
            </tr>
        `;
    }).join('');
}