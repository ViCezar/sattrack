// Configuração da API
const API_BASE = '/api';

// Estado da aplicação
let currentSection = 'dashboard';
let currentUser = null;
let opcoes = { modelos: [], operadoras: [] };

// Elementos DOM
const loginPage = document.getElementById('login-page');
const mainApp = document.getElementById('main-app');
const menuItems = document.querySelectorAll('.menu-item');
const contentSections = document.querySelectorAll('.content-section');
const pageTitle = document.getElementById('page-title');
const loadingOverlay = document.getElementById('loading-overlay');
const toastContainer = document.getElementById('toast-container');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
});

// Verificar status de autenticação
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showMainApp();
        } else {
            showLoginPage();
        }
    } catch (error) {
        showLoginPage();
    }
}

// Mostrar página de login
function showLoginPage() {
    loginPage.style.display = 'flex';
    mainApp.style.display = 'none';
}

// Mostrar aplicação principal
function showMainApp() {
    loginPage.style.display = 'none';
    mainApp.style.display = 'flex';
    
    // Atualizar informações do usuário
    document.getElementById('user-name').textContent = currentUser.username;
    const userBadge = document.getElementById('user-badge');
    userBadge.textContent = currentUser.tipo_acesso;
    userBadge.className = `user-badge ${currentUser.tipo_acesso}`;
    
    // Controlar visibilidade dos menus baseado no tipo de acesso
    const menuMovimentacoes = document.getElementById('menu-movimentacoes');
    const menuHistoricoMovimentacoes = document.getElementById('menu-historico-movimentacoes');
    const menuUsuarios = document.getElementById('menu-usuarios');
    
    if (currentUser.tipo_acesso === 'administrador') {
        menuMovimentacoes.style.display = 'flex';
        menuHistoricoMovimentacoes.style.display = 'flex';
        menuUsuarios.style.display = 'flex';
    } else {
        menuMovimentacoes.style.display = 'none';
        menuHistoricoMovimentacoes.style.display = 'none';
        menuUsuarios.style.display = 'none';
    }
    
    // Carregar opções e dados iniciais
    loadOpcoes();
    loadDashboard();
    loadColaboradores();
}

// Configurar event listeners
function setupEventListeners() {
    // Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Navegação do menu
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateToSection(section);
        });
    });

    // Botão de atualizar
    document.getElementById('refresh-btn').addEventListener('click', () => {
        refreshCurrentSection();
    });

    // Formulários
    document.getElementById('movimentacao-form').addEventListener('submit', handleMovimentacaoSubmit);
    document.getElementById('configuracao-form').addEventListener('submit', handleConfiguracaoSubmit);

    // Botões de ação
    document.getElementById('backup-reset-btn').addEventListener('click', handleBackupReset);
    document.getElementById('salvar-historico-btn').addEventListener('click', handleSalvarHistorico);
    document.getElementById('filtrar-historico-btn').addEventListener('click', handleFiltrarHistorico);
    document.getElementById('filtrar-resumo-btn').addEventListener('click', handleFiltrarResumo);
    document.getElementById('filtrar-estoque-btn').addEventListener('click', handleFiltrarEstoque);

    // Usuários (apenas admin)
    document.getElementById('novo-usuario-btn').addEventListener('click', () => openUserModal());
    document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
    document.getElementById('user-modal-close-btn').addEventListener('click', closeUserModal);
    document.getElementById('user-modal-cancel-btn').addEventListener('click', closeUserModal);
    document.getElementById('user-modal-delete-btn').addEventListener('click', handleUserDelete);
    
    // Fechar modal clicando fora
    document.getElementById('user-modal').addEventListener('click', (e) => {
        if (e.target.id === 'user-modal') {
            closeUserModal();
        }
    });
}

// Handlers de autenticação
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentUser = result.user;
            showMainApp();
            showToast('Login realizado com sucesso!', 'success');
        } else {
            showToast(result.error || 'Erro ao fazer login', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        showLoginPage();
        showToast('Logout realizado com sucesso!', 'success');
    } catch (error) {
        showToast('Erro ao fazer logout', 'error');
    }
}

// Carregar opções para checkboxes
async function loadOpcoes() {
    try {
        const response = await fetch(`${API_BASE}/opcoes`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok) {
            opcoes = data;
            createCheckboxes();
            populateEstoqueFilters();
            initializeForm();
        }
    } catch (error) {
        console.error('Erro ao carregar opções:', error);
    }
}

// Criar checkboxes para modelos e operadoras
function createCheckboxes() {
    const modeloContainer = document.getElementById('modelo-checkboxes');
    const operadoraContainer = document.getElementById('operadora-checkboxes');
    
    // Limpar containers
    modeloContainer.innerHTML = '';
    operadoraContainer.innerHTML = '';
    
    // Criar checkboxes para modelos
    opcoes.modelos.forEach(modelo => {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item';
        checkboxItem.innerHTML = `
            <input type="checkbox" id="modelo-${modelo}" name="modelo_rastreador" value="${modelo}">
            <label for="modelo-${modelo}">${modelo}</label>
        `;
        modeloContainer.appendChild(checkboxItem);
    });
    
    // Criar checkboxes para operadoras
    opcoes.operadoras.forEach(operadora => {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item';
        checkboxItem.innerHTML = `
            <input type="checkbox" id="operadora-${operadora}" name="operadora" value="${operadora}">
            <label for="operadora-${operadora}">${operadora}</label>
        `;
        operadoraContainer.appendChild(checkboxItem);
    });
}

// Preencher selects de filtro de estoque
function populateEstoqueFilters() {
    const modeloSelect = document.getElementById('filtro-modelo');
    const operadoraSelect = document.getElementById('filtro-operadora');

    if (!modeloSelect || !operadoraSelect) return;

    modeloSelect.innerHTML = '<option value="Todos">Todos</option>';
    operadoraSelect.innerHTML = '<option value="Todos">Todos</option>';

    opcoes.modelos.forEach(modelo => {
        const opt = document.createElement('option');
        opt.value = modelo;
        opt.textContent = modelo;
        modeloSelect.appendChild(opt);
    });

    opcoes.operadoras.forEach(op => {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent = op;
        operadoraSelect.appendChild(opt);
    });
}

// Inicializar formulário
function initializeForm() {
    // Definir data atual
    const today = new Date().toISOString().split('T')[0];
    const dataInput = document.getElementById('data');
    if (dataInput) {
        dataInput.value = today;
    }
}

// Navegação entre seções
function navigateToSection(section) {
    // Verificar permissões
    if (section === 'movimentacoes' && currentUser.tipo_acesso !== 'administrador') {
        showToast('Acesso negado. Apenas administradores podem acessar movimentações.', 'error');
        return;
    }

    if (section === 'historico-movimentacoes' && currentUser.tipo_acesso !== 'administrador') {
        showToast('Acesso negado. Apenas administradores podem acessar histórico de movimentações.', 'error');
        return;
    }
    
    if (section === 'usuarios' && currentUser.tipo_acesso !== 'administrador') {
        showToast('Acesso negado. Apenas administradores podem gerenciar usuários.', 'error');
        return;
    }
    
    // Atualizar menu ativo
    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });

    // Mostrar seção correspondente
    contentSections.forEach(sec => {
        sec.classList.remove('active');
        if (sec.id === section) {
            sec.classList.add('active');
        }
    });

    // Atualizar título
    const titles = {
        'dashboard': 'Dashboard',
        'movimentacoes': 'Movimentações',
        'historico-movimentacoes': 'Histórico de Movimentações',
        'configuracao': 'Configuração',
        'historico-config': 'Histórico de Config',
        'estoque': 'Estoque',
        'usuarios': 'Usuários'
    };
    pageTitle.textContent = titles[section] || 'Dashboard';

    currentSection = section;

    // Carregar dados da seção
    loadSectionData(section);
}

// Carregar dados da seção atual
function loadSectionData(section) {
    switch (section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'movimentacoes':
            loadMovimentacoes();
            break;
        case 'historico-movimentacoes':
            loadHistoricoMovimentacoes();
            break;
        case 'configuracao':
            loadColaboradores();
            break;
        case 'historico-config':
            loadHistoricoConfig();
            break;
        case 'estoque':
            const modelo = document.getElementById('filtro-modelo').value;
            const operadora = document.getElementById('filtro-operadora').value;
            loadEstoque(modelo, operadora);
            loadResumoEstoque();
            break;
        case 'usuarios':
            loadUsuarios();
            break;
    }
}

// Atualizar seção atual
function refreshCurrentSection() {
    loadSectionData(currentSection);
    showToast('Dados atualizados com sucesso!', 'success');
}

// Funções de carregamento de dados
async function loadDashboard() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/dashboard`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (response.ok) {
            document.getElementById('total-estoque').textContent = data.total_estoque;
            document.getElementById('movimentacoes-mes').textContent = data.movimentacoes_mes;
            document.getElementById('rastreadores-configurados').textContent = data.rastreadores_configurados;

            // Carregar últimas movimentações
            const tbody = document.querySelector('#ultimas-movimentacoes-table tbody');
            tbody.innerHTML = '';

            if (data.ultimas_movimentacoes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-inbox"></i><br>Nenhuma movimentação encontrada</td></tr>';
            } else {
                data.ultimas_movimentacoes.forEach(mov => {
                    const row = createMovimentacaoRow(mov);
                    tbody.appendChild(row);
                });
            }
        } else {
            showToast(data.error || 'Erro ao carregar dashboard', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function loadMovimentacoes() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/movimentacoes`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (response.ok) {
            const tbody = document.querySelector('#movimentacoes-table tbody');
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-inbox"></i><br>Nenhuma movimentação encontrada</td></tr>';
            } else {
                data.forEach(mov => {
                    const row = createMovimentacaoRow(mov, true);
                    tbody.appendChild(row);
                });
            }
        } else {
            showToast(data.error || 'Erro ao carregar movimentações', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function loadHistoricoMovimentacoes(dataFiltro = '') {
    try {
        showLoading();
        let url = `${API_BASE}/historico-movimentacoes`;
        if (dataFiltro) {
            url += `?data=${encodeURIComponent(dataFiltro)}`;
        }

        const response = await fetch(url, {
            credentials: 'include'
        });
        const data = await response.json();

        if (response.ok) {
            const tbody = document.querySelector('#historico-movimentacoes-table tbody');
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-archive"></i><br>Nenhuma movimentação encontrada</td></tr>';
            } else {
                data.forEach(mov => {
                    const row = createMovimentacaoRow(mov);
                    tbody.appendChild(row);
                });
            }
        } else {
            showToast(data.error || 'Erro ao carregar histórico', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function loadColaboradores() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/colaboradores`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (response.ok) {
            const tbody = document.querySelector('#colaboradores-table tbody');
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><i class="fas fa-users"></i><br>Nenhum configurador encontrado</td></tr>';
            } else {
                data.forEach(colaborador => {
                    const row = createColaboradorRow(colaborador);
                    tbody.appendChild(row);
                });
            }
        } else {
            showToast(data.error || 'Erro ao carregar configuradores', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function loadHistoricoConfig() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/historico-config`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (response.ok) {
            const container = document.getElementById('historico-config-container');
            container.innerHTML = '';

            if (data.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><h3>Nenhum histórico encontrado</h3></div>';
            } else {
                data.forEach(historicoDia => {
                    const historicoDiv = createHistoricoDataDiv(historicoDia);
                    container.appendChild(historicoDiv);
                });
            }
        } else {
            showToast(data.error || 'Erro ao carregar histórico de configuração', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function loadEstoque(modelo = 'Todos', operadora = 'Todos') {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/estoque?modelo=${encodeURIComponent(modelo)}&operadora=${encodeURIComponent(operadora)}`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (response.ok) {
            const tbody = document.querySelector('#estoque-table tbody');
            tbody.innerHTML = '';

            if (data.estoque.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fas fa-boxes"></i><br>Nenhum item encontrado</td></tr>';
            } else {
                data.estoque.forEach(item => {
                    const row = createEstoqueRow(item);
                    tbody.appendChild(row);
                });
            }

            const totalDiv = document.getElementById('estoque-total');
            totalDiv.textContent = `Total: ${data.total}`;
        } else {
            showToast(data.error || 'Erro ao carregar estoque', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function loadResumoEstoque(filtro = 'modelo') {
    try {
        const response = await fetch(`${API_BASE}/estoque/resumo?filtro=${filtro}`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (response.ok) {
            const tbody = document.querySelector('#resumo-estoque-table tbody');
            const header = document.getElementById('resumo-header');
            
            // Atualizar cabeçalho
            if (filtro === 'modelo') {
                header.innerHTML = '<tr><th>Modelo</th><th>Total</th></tr>';
            } else {
                header.innerHTML = '<tr><th>Operadora</th><th>Total</th></tr>';
            }

            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2" class="empty-state"><i class="fas fa-chart-bar"></i><br>Nenhum dado encontrado</td></tr>';
            } else {
                data.forEach(item => {
                    const row = createResumoRow(item, filtro);
                    tbody.appendChild(row);
                });
            }
        } else {
            showToast(data.error || 'Erro ao carregar resumo', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    }
}

async function loadUsuarios() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/auth/users`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (response.ok) {
            const tbody = document.querySelector('#usuarios-table tbody');
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-users"></i><br>Nenhum usuário encontrado</td></tr>';
            } else {
                const admins = data.filter(u => u.tipo_acesso === 'administrador');
                const configuradores = data.filter(u => u.tipo_acesso === 'configurador');

                if (admins.length > 0) {
                    const headerRow = document.createElement('tr');
                    headerRow.innerHTML = '<td colspan="5" class="user-section-header">Administradores</td>';
                    tbody.appendChild(headerRow);
                    admins.forEach(user => {
                        const row = createUserRow(user);
                        tbody.appendChild(row);
                    });
                }

                if (configuradores.length > 0) {
                    const headerRow = document.createElement('tr');
                    headerRow.innerHTML = '<td colspan="5" class="user-section-header">Configuradores</td>';
                    tbody.appendChild(headerRow);
                    configuradores.forEach(user => {
                        const row = createUserRow(user);
                        tbody.appendChild(row);
                    });
                }
            }
        } else {
            showToast(data.error || 'Erro ao carregar usuários', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

// Funções para criar linhas de tabela
function createMovimentacaoRow(mov, includeActions = false) {
    const row = document.createElement('tr');
    const tipoBadge = mov.tipo === 'Entrada' ? 'badge-entrada' : 'badge-saida';

    row.innerHTML = `
        <td>${mov.data}</td>
        <td>${mov.modelo_rastreador}</td>
        <td>${mov.operadora}</td>
        <td>${mov.quantidade}</td>
        <td><span class="badge ${tipoBadge}">${mov.tipo}</span></td>
        <td>${mov.solicitante}</td>
        <td>${mov.operador}</td>
    `;

    if (includeActions && currentUser && currentUser.username === 'Vinícius Cezar') {
        row.innerHTML += `
            <td>
                <button class="btn btn-danger btn-small" onclick="cancelMovimentacao(${mov.id})">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
    } else if (includeActions) {
        row.innerHTML += '<td></td>';
    }

    return row;
}

function createColaboradorRow(colaborador) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${colaborador.nome}</td>
        <td>${colaborador.quantidade_dia_atual}</td>
        <td>${colaborador.quantidade_total_mes}</td>
    `;
    
    return row;
}

function createHistoricoDataDiv(historicoDia) {
    const div = document.createElement('div');
    div.className = 'historico-data';
    
    let tableRows = '';
    historicoDia.colaboradores.forEach(colaborador => {
        const cancelBtn = (currentUser && currentUser.username === 'Vinícius Cezar') ?
            `<button class="btn btn-danger btn-small" onclick="cancelConfiguracao(${colaborador.id})">
                <i class="fas fa-times"></i>
            </button>` : '';
        tableRows += `
            <tr>
                <td>${colaborador.nome_colaborador}</td>
                <td>${colaborador.quantidade_dia}</td>
                <td>${colaborador.quantidade_total_mes}</td>
                <td><div class="table-actions">${cancelBtn}</div></td>
            </tr>
        `;
    });
    
    div.innerHTML = `
        <div class="historico-data-header">
            ${historicoDia.data}
        </div>
        <div class="historico-data-content">
            <table>
                <thead>
                    <tr>
                        <th>Operador</th>
                        <th>Quantidade do Dia</th>
                        <th>Total do Mês</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
    
    return div;
}

function createEstoqueRow(item) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${item.modelo_rastreador}</td>
        <td>${item.operadora}</td>
        <td>${item.quantidade_estoque}</td>
        <td>${item.data_ultima_alteracao}</td>
    `;
    
    return row;
}

function createResumoRow(item, filtro) {
    const row = document.createElement('tr');
    
    if (filtro === 'modelo') {
        row.innerHTML = `
            <td>${item.modelo_rastreador}</td>
            <td>${item.total}</td>
        `;
    } else {
        row.innerHTML = `
            <td>${item.operadora}</td>
            <td>${item.total}</td>
        `;
    }
    
    return row;
}

function createUserRow(user) {
    const row = document.createElement('tr');
    const statusBadge = user.ativo ? 'badge-entrada' : 'badge-saida';
    const statusText = user.ativo ? 'Ativo' : 'Inativo';
    
    row.innerHTML = `
        <td>${user.username}</td>
        <td>${user.tipo_acesso}</td>
        <td><span class="badge ${statusBadge}">${statusText}</span></td>
        <td>${user.data_criacao}</td>
        <td>
            <div class="table-actions">
                <button class="btn btn-secondary btn-small" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Handlers de formulários
async function handleMovimentacaoSubmit(e) {
    e.preventDefault();
    
    // Verificar se pelo menos um modelo e uma operadora foram selecionados
    const modelosSelecionados = Array.from(document.querySelectorAll('input[name="modelo_rastreador"]:checked')).map(cb => cb.value);
    const operadorasSelecionadas = Array.from(document.querySelectorAll('input[name="operadora"]:checked')).map(cb => cb.value);
    
    if (modelosSelecionados.length === 0) {
        showToast('Selecione pelo menos um modelo de rastreador', 'error');
        return;
    }
    
    if (operadorasSelecionadas.length === 0) {
        showToast('Selecione pelo menos uma operadora', 'error');
        return;
    }
    
    const formData = new FormData(e.target);
    const baseData = {
        data: formData.get('data'),
        quantidade: formData.get('quantidade'),
        tipo: formData.get('tipo'),
        solicitante: formData.get('solicitante')
    };
    
    try {
        showLoading();
        
        // Registrar uma movimentação para cada combinação modelo/operadora
        for (const modelo of modelosSelecionados) {
            for (const operadora of operadorasSelecionadas) {
                const data = {
                    ...baseData,
                    modelo_rastreador: modelo,
                    operadora: operadora
                };
                
                const response = await fetch(`${API_BASE}/movimentacoes/registrar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    showToast(result.error || 'Erro ao registrar movimentação', 'error');
                    return;
                }
            }
        }
        
        showToast('Movimentações registradas com sucesso!', 'success');
        e.target.reset();
        initializeForm();
        
        // Desmarcar todos os checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        
        // Recarregar dados se estiver na seção de movimentações ou histórico
        if (currentSection === 'movimentacoes') {
            loadMovimentacoes();
        }
        if (currentSection === 'historico-movimentacoes') {
            loadHistoricoMovimentacoes();
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function handleConfiguracaoSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/configuracao/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Configuração registrada com sucesso!', 'success');
            e.target.reset();
            loadColaboradores();
        } else {
            showToast(result.error || 'Erro ao registrar configuração', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function handleUserSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const userId = document.getElementById('user-id').value;
    
    // Converter checkbox para boolean
    data.ativo = document.getElementById('user-ativo').checked;
    
    try {
        showLoading();
        const url = userId ? `${API_BASE}/auth/users/${userId}` : `${API_BASE}/auth/users`;
        const method = userId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(userId ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!', 'success');
            closeUserModal();
            loadUsuarios();
        } else {
            showToast(result.error || 'Erro ao salvar usuário', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function handleUserDelete() {
    const userId = document.getElementById('user-id').value;
    if (!userId) {
        return;
    }

    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
        return;
    }

    try {
        showLoading();
        const response = await fetch(`${API_BASE}/auth/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Usuário excluído com sucesso!', 'success');
            closeUserModal();
            loadUsuarios();
        } else {
            showToast(result.error || 'Erro ao excluir usuário', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

// Handlers de ações
async function handleBackupReset() {
    if (!confirm('Tem certeza que deseja fazer backup e resetar o histórico de movimentações?')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/historico-movimentacoes/backup-reset`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message, 'success');
            loadHistoricoMovimentacoes();
        } else {
            showToast(result.error || 'Erro ao fazer backup', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function handleSalvarHistorico() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/historico-config/salvar-diario`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message, 'success');
            if (currentSection === 'historico-config') {
                loadHistoricoConfig();
            }
        } else {
            showToast(result.error || 'Erro ao salvar histórico', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

function handleFiltrarHistorico() {
    const data = document.getElementById('filtro-data').value;
    if (data) {
        loadHistoricoMovimentacoes(data);
    } else {
        loadHistoricoMovimentacoes();
    }
}

function handleFiltrarResumo() {
    const filtro = document.getElementById('filtro-resumo').value;
    loadResumoEstoque(filtro);
}

function handleFiltrarEstoque() {
    const modelo = document.getElementById('filtro-modelo').value;
    const operadora = document.getElementById('filtro-operadora').value;
    loadEstoque(modelo, operadora);
}

// Funções do modal de usuário
function openUserModal(user = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    const deleteBtn = document.getElementById('user-modal-delete-btn');

    if (user) {
        title.textContent = 'Editar Usuário';
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-password').value = '';
        document.getElementById('user-tipo').value = user.tipo_acesso;
        document.getElementById('user-ativo').checked = user.ativo;
        deleteBtn.style.display = 'inline-block';
    } else {
        title.textContent = 'Novo Usuário';
        form.reset();
        document.getElementById('user-id').value = '';
        document.getElementById('user-ativo').checked = true;
        deleteBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

function editUser(id) {
    // Esta função será chamada pelos botões de editar
    fetch(`${API_BASE}/auth/users`, {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(users => {
        const user = users.find(u => u.id === id);
        if (user) {
            openUserModal(user);
        }
    })
    .catch(error => {
        showToast('Erro ao carregar dados do usuário', 'error');
    });
}

async function cancelMovimentacao(id) {
    if (!confirm('Deseja realmente cancelar esta movimentação?')) {
        return;
    }

    try {
        showLoading();
        const response = await fetch(`${API_BASE}/movimentacoes/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();

        if (response.ok) {
            showToast('Movimentação cancelada com sucesso!', 'success');
            loadMovimentacoes();
            loadDashboard();
        } else {
            showToast(result.error || 'Erro ao cancelar movimentação', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

async function cancelConfiguracao(id) {
    if (!confirm('Deseja realmente cancelar esta configuração?')) {
        return;
    }

    try {
        showLoading();
        const response = await fetch(`${API_BASE}/configuracao/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();

        if (response.ok) {
            showToast('Configuração cancelada com sucesso!', 'success');
            loadHistoricoConfig();
            loadColaboradores();
        } else {
            showToast(result.error || 'Erro ao cancelar configuração', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão', 'error');
    } finally {
        hideLoading();
    }
}

// Funções utilitárias
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remover toast após 5 segundos
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Tornar funções globais para uso nos event handlers inline
window.editUser = editUser;
window.cancelMovimentacao = cancelMovimentacao;
window.cancelConfiguracao = cancelConfiguracao;

