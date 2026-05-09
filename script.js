// ==========================================
// CONFIGURAÇÕES E ESTADO
// ==========================================
const STARTING_CHIPS = 500;
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

// O SEGREDO ESTÁ AQUI: Criamos uma variável que pode ser editada (blindLevels) em vez de usar sempre a FIXA (DEFAULT_BLINDS)
let blindLevels = JSON.parse(localStorage.getItem('dc_blinds')) || JSON.parse(JSON.stringify(DEFAULT_BLINDS));
let members = JSON.parse(localStorage.getItem('dc_members')) || [];
let ranking = JSON.parse(localStorage.getItem('dc_ranking')) || {}; 
let activePlayers = []; 

let currentLevelIdx = 0;
let timerSeconds = blindLevels[0].duration * 60; 
let timerInterval = null;

window.onload = () => {
    updateBlindDisplay();
    updateTimerDisplay();
    renderMembers();
    renderRanking();
    renderBlindConfig();
};

// ==========================================
// NAVEGAÇÃO
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
    } else {
        btn.innerText = "⏸ PAUSE";
        timerInterval = setInterval(() => {
            if (timerSeconds <= 0) {
                document.getElementById('alert-sound').play();
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
        clearInterval(timerInterval);
        alert("Torneio Finalizado!");
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
    timerSeconds = blindLevels[currentLevelIdx].duration * 60;
    updateTimerDisplay();
}

function updateBlindDisplay() {
    const current = blindLevels[currentLevelIdx];
    const next = blindLevels[currentLevelIdx + 1];
    document.getElementById('display-current-blind').innerText = `${current.sb} / ${current.bb}`;
    document.getElementById('display-next-blind').innerText = next ? `${next.sb} / ${next.bb}` : "FINAL";
}

// ==========================================
// CONFIGURAÇÃO EDITÁVEL DE BLINDS (CORRIGIDA)
// ==========================================
function renderBlindConfig() {
    const tbody = document.getElementById('blind-config-list');
    tbody.innerHTML = blindLevels.map((b, i) => `
        <tr>
            <td>Nível ${b.level}</td>
            <td><input type="number" value="${b.sb}" onchange="updateBlindData(${i}, 'sb', this.value)" style="width:100px; text-align:center;"></td>
            <td><input type="number" value="${b.bb}" onchange="updateBlindData(${i}, 'bb', this.value)" style="width:100px; text-align:center;"></td>
            <td><input type="number" value="${b.duration}" onchange="updateBlindData(${i}, 'duration', this.value)" style="width:100px; text-align:center;"></td>
        </tr>
    `).join('');
}

function updateBlindData(index, field, value) {
    blindLevels[index][field] = parseInt(value) || 0;
    localStorage.setItem('dc_blinds', JSON.stringify(blindLevels)); // Salva no cache da TV
    
    // Se você estiver alterando o nível que está tocando agora na tela, ele já atualiza ao vivo
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
// GESTÃO DE MEMBROS E JOGO (Restante igual)
// ==========================================
function registerNewMember() {
    const input = document.getElementById('new-member-name');
    const name = input.value.trim();
    if (!name) return;

    if (members.find(m => m.name === name)) return alert("Este membro já existe!");

    members.push({ name: name, date: new Date().toLocaleDateString() });
    localStorage.setItem('dc_members', JSON.stringify(members));
    input.value = "";
    renderMembers();
}

function renderMembers() {
    const table = document.getElementById('members-list-table');
    const select = document.getElementById('member-select');
    
    table.innerHTML = members.map((m, i) => `
        <tr>
            <td>${m.name}</td>
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

function addMemberToTable() {
    const select = document.getElementById('member-select');
    const name = select.value;
    if (!name) return;

    if (activePlayers.find(p => p.name === name)) return alert("Jogador já está na mesa!");

    activePlayers.push({ name: name, status: 'Ativo', rebuys: 0, finalProfit: -1.00 }); 
    renderPlayers();
    updateTournamentStats();
}

function renderPlayers() {
    const tbody = document.getElementById('player-list');
    tbody.innerHTML = activePlayers.map((p, i) => `
        <tr>
            <td class="${p.status === 'Ativo' ? '' : 'status-busted'}">${p.name}</td>
            <td>${p.status}</td>
            <td>${p.rebuys}</td>
            <td><input type="number" placeholder="Prêmio (R$)" onchange="updateProfit(${i}, this.value)" style="width:120px"></td>
            <td>
                <button class="btn-action" onclick="addRebuy(${i})">+ RB</button>
                <button class="btn-remove" onclick="toggleBust(${i})">${p.status === 'Ativo' ? 'Bust' : 'Venceu'}</button>
            </td>
        </tr>
    `).join('');
}

function addRebuy(index) {
    activePlayers[index].rebuys++;
    activePlayers[index].finalProfit -= 1.00; 
    updateTournamentStats();
    renderPlayers();
}

function toggleBust(index) {
    activePlayers[index].status = activePlayers[index].status === 'Ativo' ? 'Eliminado' : 'Ativo';
    renderPlayers();
}

function updateProfit(index, val) {
    activePlayers[index].tempGain = parseFloat(val) || 0;
}

function updateTournamentStats() {
    let totalMoney = activePlayers.length + activePlayers.reduce((sum, p) => sum + p.rebuys, 0);
    document.getElementById('display-prize-pool').innerText = `R$ ${totalMoney.toFixed(2)}`;
    document.getElementById('total-money-prize').innerText = `R$ ${totalMoney.toFixed(2)}`;
    document.getElementById('prize-winner-all').innerText = `R$ ${totalMoney.toFixed(2)}`;
}

function finishTournament() {
    if (!confirm("Isso vai encerrar o jogo e atualizar o Ranking Geral. Confirmar?")) return;

    activePlayers.forEach(p => {
        if (!ranking[p.name]) ranking[p.name] = { games: 0, wins: 0, profit: 0 };
        
        ranking[p.name].games += 1;
        
        const sessionProfit = (p.tempGain || 0) - (1.00 + p.rebuys);
        ranking[p.name].profit += sessionProfit;
        
        if (p.tempGain > 0) ranking[p.name].wins += 1; 
    });

    localStorage.setItem('dc_ranking', JSON.stringify(ranking));
    activePlayers = [];
    alert("Ranking Atualizado!");
    renderRanking();
    
    document.getElementById('display-prize-pool').innerText = "R$ 0.00";
    renderPlayers();
    showSection('ranking-section', document.querySelectorAll('.nav-btn')[3]);
}

function renderRanking() {
    const table = document.getElementById('global-ranking-table');
    const sorted = Object.entries(ranking)
        .sort((a, b) => b[1].profit - a[1].profit);

    table.innerHTML = sorted.map(([name, stats], i) => {
        let medal = i === 0 ? 'rank-gold' : (i === 1 ? 'rank-silver' : (i === 2 ? 'rank-bronze' : ''));
        return `
            <tr class="${medal}">
                <td>${i + 1}º</td>
                <td>${name}</td>
                <td>${stats.games}</td>
                <td>${stats.wins}</td>
                <td style="color: ${stats.profit >= 0 ? 'var(--primary)' : 'var(--danger)'}">
                    R$ ${stats.profit.toFixed(2)}
                </td>
            </tr>
        `;
    }).join('');
}