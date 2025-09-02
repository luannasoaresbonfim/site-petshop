// Funcionalidades da aplicação Petshop Bela
import { FirebaseService } from "./firebase-config.js"

// Global Variables
let currentSection = "dashboard"
let produtos = []
let entradas = []
let saidas = []
let editingProductId = null

// DOM Elements
const navButtons = document.querySelectorAll(".nav-btn")
const sections = document.querySelectorAll(".section")
const produtoModal = document.getElementById("produto-modal")
const produtoForm = document.getElementById("produto-form")
const entradaForm = document.getElementById("entrada-form")
const saidaForm = document.getElementById("saida-form")

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  console.log("[v0] Inicializando aplicação...")
  setupEventListeners()
  loadData()

  // Set default date inputs to today
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("entrada-data").value = today
  document.getElementById("saida-data").value = today
})

// Setup Event Listeners
function setupEventListeners() {
  console.log("[v0] Configurando event listeners...")

  // Navigation
  navButtons.forEach((btn) => {
    console.log(`[v0] Adicionando listener para botão: ${btn.dataset.section}`)
    btn.addEventListener("click", (e) => {
      e.preventDefault()
      const section = btn.dataset.section
      console.log(`[v0] Botão clicado: ${section}`)
      switchSection(section)
    })
  })

  // Modal controls
  document.getElementById("add-produto-btn").addEventListener("click", () => openProdutoModal())
  document.querySelector(".close").addEventListener("click", closeProdutoModal)
  document.getElementById("cancel-produto").addEventListener("click", closeProdutoModal)

  // Forms
  produtoForm.addEventListener("submit", handleProdutoSubmit)
  entradaForm.addEventListener("submit", handleEntradaSubmit)
  saidaForm.addEventListener("submit", handleSaidaSubmit)

  // Search and filters
  document.getElementById("search-produto").addEventListener("input", filterProdutos)
  document.getElementById("filter-categoria").addEventListener("change", filterProdutos)

  // Reports
  document.getElementById("gerar-relatorio").addEventListener("click", gerarRelatorio)

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === produtoModal) {
      closeProdutoModal()
    }
  })
}

// Navigation Functions
function switchSection(sectionName) {
  console.log(`[v0] Mudando para seção: ${sectionName}`)

  // Update navigation
  navButtons.forEach((btn) => {
    btn.classList.remove("active")
    if (btn.dataset.section === sectionName) {
      btn.classList.add("active")
    }
  })

  // Update sections
  sections.forEach((section) => {
    section.classList.remove("active")
    if (section.id === sectionName) {
      section.classList.add("active")
    }
  })

  currentSection = sectionName

  // Load section-specific data
  if (sectionName === "dashboard") {
    updateDashboard()
  } else if (sectionName === "estoque") {
    loadEstoque()
  } else if (sectionName === "entrada") {
    loadProdutosSelect("entrada-produto")
  } else if (sectionName === "saida") {
    loadProdutosSelect("saida-produto")
  }
}

// Data Loading Functions
async function loadData() {
  console.log("[v0] Carregando dados...")
  try {
    showMessage("Carregando dados do sistema...", "success")
    await Promise.all([loadProdutos(), loadEntradas(), loadSaidas()])
    updateDashboard()
    console.log("[v0] Dados carregados com sucesso")
  } catch (error) {
    console.error("[v0] Erro ao carregar dados:", error)
    showMessage("Erro ao carregar dados do sistema", "error")
  }
}

async function loadProdutos() {
  try {
    produtos = await FirebaseService.getStock()
    console.log(`[v0] ${produtos.length} produtos carregados`)
  } catch (error) {
    console.error("[v0] Erro ao carregar produtos:", error)
    produtos = []
  }
}

async function loadEntradas() {
  try {
    entradas = await FirebaseService.getEntries()
    console.log(`[v0] ${entradas.length} entradas carregadas`)
  } catch (error) {
    console.error("[v0] Erro ao carregar entradas:", error)
    entradas = []
  }
}

async function loadSaidas() {
  try {
    saidas = await FirebaseService.getExits()
    console.log(`[v0] ${saidas.length} saídas carregadas`)
  } catch (error) {
    console.error("[v0] Erro ao carregar saídas:", error)
    saidas = []
  }
}

// Dashboard Functions
function updateDashboard() {
  console.log("[v0] Atualizando dashboard...")

  // Update stats
  document.getElementById("total-produtos").textContent = produtos.length

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const entradasMes = entradas.filter((entrada) => {
    const entradaDate = new Date(entrada.data)
    return entradaDate.getMonth() === currentMonth && entradaDate.getFullYear() === currentYear
  })

  const saidasMes = saidas.filter((saida) => {
    const saidaDate = new Date(saida.data)
    return saidaDate.getMonth() === currentMonth && saidaDate.getFullYear() === currentYear
  })

  document.getElementById("entradas-mes").textContent = entradasMes.length
  document.getElementById("saidas-mes").textContent = saidasMes.length

  const faturamento = saidasMes.reduce((total, saida) => total + (saida.preco || 0) * (saida.quantidade || 0), 0)
  document.getElementById("faturamento-mes").textContent = formatCurrency(faturamento)

  // Update recent activities
  updateRecentActivities()
}

function updateRecentActivities() {
  const container = document.getElementById("atividades-recentes")
  const allActivities = [
    ...entradas.slice(0, 5).map((entrada) => ({
      type: "entrada",
      text: `Entrada: ${getProdutoNome(entrada.produto)} (${entrada.quantidade} unidades)`,
      date: entrada.data,
    })),
    ...saidas.slice(0, 5).map((saida) => ({
      type: "saida",
      text: `Saída: ${getProdutoNome(saida.produto)} - ${getTipoSaidaLabel(saida.tipo)}`,
      date: saida.data,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)

  container.innerHTML = allActivities
    .map(
      (activity) => `
        <div class="activity-item">
            <span>${activity.text}</span>
            <small>${formatDate(activity.date)}</small>
        </div>
    `,
    )
    .join("")
}

// Stock Functions
function loadEstoque() {
  console.log("[v0] Carregando estoque...")
  const tbody = document.getElementById("estoque-tbody")

  if (produtos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #9ca3af;">Nenhum produto cadastrado</td></tr>'
    return
  }

  tbody.innerHTML = produtos
    .map((produto) => {
      const quantidade = calcularQuantidadeAtual(produto.codigo)
      const status = quantidade <= (produto.estoqueMinimo || 0) ? "low" : "ok"
      const statusText = quantidade <= (produto.estoqueMinimo || 0) ? "Estoque Baixo" : "OK"

      return `
            <tr>
                <td><strong>${produto.codigo}</strong></td>
                <td>${produto.nome}</td>
                <td><span class="category-badge">${getCategoriaLabel(produto.categoria)}</span></td>
                <td><strong>${quantidade}</strong></td>
                <td>${formatCurrency(produto.preco)}</td>
                <td><span class="status-badge status-${status}">${statusText}</span></td>
                <td>
                    <button class="action-btn edit-btn" onclick="editProduto('${produto.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteProduto('${produto.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `
    })
    .join("")
}

function calcularQuantidadeAtual(codigoProduto) {
  const totalEntradas = entradas
    .filter((entrada) => entrada.produto === codigoProduto)
    .reduce((total, entrada) => total + (entrada.quantidade || 0), 0)

  const totalSaidas = saidas
    .filter((saida) => saida.produto === codigoProduto)
    .reduce((total, saida) => total + (saida.quantidade || 0), 0)

  return Math.max(0, totalEntradas - totalSaidas)
}

function filterProdutos() {
  const searchTerm = document.getElementById("search-produto").value.toLowerCase()
  const categoria = document.getElementById("filter-categoria").value

  const filteredProdutos = produtos.filter((produto) => {
    const matchesSearch =
      produto.nome.toLowerCase().includes(searchTerm) || produto.codigo.toLowerCase().includes(searchTerm)
    const matchesCategoria = !categoria || produto.categoria === categoria

    return matchesSearch && matchesCategoria
  })

  const tbody = document.getElementById("estoque-tbody")

  if (filteredProdutos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #9ca3af;">Nenhum produto encontrado</td></tr>'
    return
  }

  tbody.innerHTML = filteredProdutos
    .map((produto) => {
      const quantidade = calcularQuantidadeAtual(produto.codigo)
      const status = quantidade <= (produto.estoqueMinimo || 0) ? "low" : "ok"
      const statusText = quantidade <= (produto.estoqueMinimo || 0) ? "Estoque Baixo" : "OK"

      return `
            <tr>
                <td><strong>${produto.codigo}</strong></td>
                <td>${produto.nome}</td>
                <td><span class="category-badge">${getCategoriaLabel(produto.categoria)}</span></td>
                <td><strong>${quantidade}</strong></td>
                <td>${formatCurrency(produto.preco)}</td>
                <td><span class="status-badge status-${status}">${statusText}</span></td>
                <td>
                    <button class="action-btn edit-btn" onclick="editProduto('${produto.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteProduto('${produto.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `
    })
    .join("")
}

// Modal Functions
function openProdutoModal(produtoId = null) {
  console.log(`[v0] Abrindo modal para produto: ${produtoId || "novo"}`)

  const modal = document.getElementById("produto-modal")
  const title = document.getElementById("modal-title")
  const form = document.getElementById("produto-form")

  editingProductId = produtoId

  if (produtoId) {
    const produto = produtos.find((p) => p.id === produtoId)
    if (!produto) {
      showMessage("Produto não encontrado", "error")
      return
    }

    title.textContent = "Editar Produto"

    document.getElementById("produto-codigo").value = produto.codigo
    document.getElementById("produto-nome").value = produto.nome
    document.getElementById("produto-categoria").value = produto.categoria
    document.getElementById("produto-preco").value = produto.preco
    document.getElementById("produto-estoque-minimo").value = produto.estoqueMinimo
  } else {
    title.textContent = "Adicionar Produto"
    form.reset()
  }

  modal.style.display = "block"
}

function closeProdutoModal() {
  document.getElementById("produto-modal").style.display = "none"
  editingProductId = null
}

// Form Handlers
async function handleProdutoSubmit(e) {
  e.preventDefault()
  console.log("[v0] Salvando produto...")

  const codigo = document.getElementById("produto-codigo").value.trim()
  const nome = document.getElementById("produto-nome").value.trim()

  // Validate required fields
  if (!codigo || !nome) {
    showMessage("Código e nome são obrigatórios", "error")
    return
  }

  // Check for duplicate codes (only for new products or different products)
  const existingProduct = produtos.find((p) => p.codigo === codigo && p.id !== editingProductId)
  if (existingProduct) {
    showMessage("Já existe um produto com este código", "error")
    return
  }

  const formData = {
    codigo: codigo,
    nome: nome,
    categoria: document.getElementById("produto-categoria").value,
    preco: Number.parseFloat(document.getElementById("produto-preco").value) || 0,
    estoqueMinimo: Number.parseInt(document.getElementById("produto-estoque-minimo").value) || 0,
  }

  try {
    if (editingProductId) {
      await FirebaseService.updateStock(editingProductId, formData)
      showMessage("Produto atualizado com sucesso!", "success")
    } else {
      await FirebaseService.addStock(formData)
      showMessage("Produto adicionado com sucesso!", "success")
    }

    closeProdutoModal()
    await loadProdutos()
    loadEstoque()
    updateDashboard()
  } catch (error) {
    console.error("[v0] Erro ao salvar produto:", error)
    showMessage("Erro ao salvar produto", "error")
  }
}

async function handleEntradaSubmit(e) {
  e.preventDefault()
  console.log("[v0] Registrando entrada...")

  const produto = document.getElementById("entrada-produto").value
  const quantidade = Number.parseInt(document.getElementById("entrada-quantidade").value)
  const preco = Number.parseFloat(document.getElementById("entrada-preco").value)

  if (!produto || quantidade <= 0 || preco < 0) {
    showMessage("Preencha todos os campos corretamente", "error")
    return
  }

  const formData = {
    produto: produto,
    quantidade: quantidade,
    preco: preco,
    fornecedor: document.getElementById("entrada-fornecedor").value.trim(),
    nota: document.getElementById("entrada-nota").value.trim(),
    data: document.getElementById("entrada-data").value,
    observacoes: document.getElementById("entrada-observacoes").value.trim(),
  }

  try {
    await FirebaseService.addEntry(formData)
    showMessage("Entrada registrada com sucesso!", "success")

    e.target.reset()
    document.getElementById("entrada-data").value = new Date().toISOString().split("T")[0]

    await loadEntradas()
    updateDashboard()
    if (currentSection === "estoque") {
      loadEstoque()
    }
  } catch (error) {
    console.error("[v0] Erro ao registrar entrada:", error)
    showMessage("Erro ao registrar entrada", "error")
  }
}

async function handleSaidaSubmit(e) {
  e.preventDefault()
  console.log("[v0] Registrando saída...")

  const produto = document.getElementById("saida-produto").value
  const quantidade = Number.parseInt(document.getElementById("saida-quantidade").value)
  const preco = Number.parseFloat(document.getElementById("saida-preco").value)

  if (!produto || quantidade <= 0 || preco < 0) {
    showMessage("Preencha todos os campos corretamente", "error")
    return
  }

  // Verificar se há estoque suficiente
  const quantidadeAtual = calcularQuantidadeAtual(produto)
  if (quantidade > quantidadeAtual) {
    showMessage(`Quantidade insuficiente em estoque! Disponível: ${quantidadeAtual}`, "error")
    return
  }

  const formData = {
    produto: produto,
    quantidade: quantidade,
    tipo: document.getElementById("saida-tipo").value,
    cliente: document.getElementById("saida-cliente").value.trim(),
    preco: preco,
    data: document.getElementById("saida-data").value,
    observacoes: document.getElementById("saida-observacoes").value.trim(),
  }

  try {
    await FirebaseService.addExit(formData)
    showMessage("Saída registrada com sucesso!", "success")

    e.target.reset()
    document.getElementById("saida-data").value = new Date().toISOString().split("T")[0]

    await loadSaidas()
    updateDashboard()
    if (currentSection === "estoque") {
      loadEstoque()
    }
  } catch (error) {
    console.error("[v0] Erro ao registrar saída:", error)
    showMessage("Erro ao registrar saída", "error")
  }
}

// Product Management
function loadProdutosSelect(selectId) {
  const select = document.getElementById(selectId)

  if (produtos.length === 0) {
    select.innerHTML = '<option value="">Nenhum produto cadastrado</option>'
    return
  }

  select.innerHTML =
    '<option value="">Selecione um produto</option>' +
    produtos
      .map(
        (produto) => `
            <option value="${produto.codigo}">${produto.nome} (${produto.codigo}) - Estoque: ${calcularQuantidadeAtual(produto.codigo)}</option>
        `,
      )
      .join("")
}

// Global functions for onclick handlers
window.editProduto = async (produtoId) => {
  openProdutoModal(produtoId)
}

window.deleteProduto = async (produtoId) => {
  const produto = produtos.find((p) => p.id === produtoId)
  if (!produto) {
    showMessage("Produto não encontrado", "error")
    return
  }

  if (confirm(`Tem certeza que deseja excluir o produto "${produto.nome}"?`)) {
    try {
      await FirebaseService.deleteStock(produtoId)
      showMessage("Produto excluído com sucesso!", "success")

      await loadProdutos()
      loadEstoque()
      updateDashboard()
    } catch (error) {
      console.error("[v0] Erro ao excluir produto:", error)
      showMessage("Erro ao excluir produto", "error")
    }
  }
}

// Reports
async function gerarRelatorio() {
  console.log("[v0] Gerando relatório...")

  const mes = document.getElementById("relatorio-mes").value
  if (!mes) {
    showMessage("Selecione um mês para gerar o relatório", "error")
    return
  }

  const [ano, mesNum] = mes.split("-")

  try {
    const relatorio = await FirebaseService.getMonthlyReport(Number.parseInt(ano), Number.parseInt(mesNum))

    // Update summary
    document.getElementById("relatorio-total-entradas").textContent = relatorio.entries.length
    document.getElementById("relatorio-total-saidas").textContent = relatorio.exits.length
    document.getElementById("relatorio-faturamento").textContent = formatCurrency(relatorio.totalExits)

    const medicamentos = relatorio.exits.filter((saida) => saida.tipo === "medicamento").length
    document.getElementById("relatorio-medicamentos").textContent = medicamentos

    const banhos = relatorio.exits.filter((saida) => saida.tipo === "banho").length
    document.getElementById("relatorio-banhos").textContent = banhos

    // Update tables
    updateRelatorioEntradas(relatorio.entries)
    updateRelatorioSaidas(relatorio.exits)

    document.getElementById("relatorio-content").classList.add("active")
    showMessage("Relatório gerado com sucesso!", "success")
  } catch (error) {
    console.error("[v0] Erro ao gerar relatório:", error)
    showMessage("Erro ao gerar relatório", "error")
  }
}

function updateRelatorioEntradas(entradasPeriodo) {
  const tbody = document.getElementById("relatorio-entradas-tbody")

  if (entradasPeriodo.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #9ca3af;">Nenhuma entrada no período</td></tr>'
    return
  }

  tbody.innerHTML = entradasPeriodo
    .map(
      (entrada) => `
        <tr>
            <td>${formatDate(entrada.data)}</td>
            <td>${getProdutoNome(entrada.produto)}</td>
            <td>${entrada.quantidade}</td>
            <td>${entrada.fornecedor}</td>
            <td>${entrada.nota}</td>
            <td>${formatCurrency((entrada.preco || 0) * (entrada.quantidade || 0))}</td>
        </tr>
    `,
    )
    .join("")
}

function updateRelatorioSaidas(saidasPeriodo) {
  const tbody = document.getElementById("relatorio-saidas-tbody")

  if (saidasPeriodo.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #9ca3af;">Nenhuma saída no período</td></tr>'
    return
  }

  tbody.innerHTML = saidasPeriodo
    .map(
      (saida) => `
        <tr>
            <td>${formatDate(saida.data)}</td>
            <td>${getProdutoNome(saida.produto)}</td>
            <td>${saida.quantidade}</td>
            <td>${getTipoSaidaLabel(saida.tipo)}</td>
            <td>${saida.cliente}</td>
            <td>${formatCurrency((saida.preco || 0) * (saida.quantidade || 0))}</td>
        </tr>
    `,
    )
    .join("")
}

// Utility Functions
function getProdutoNome(codigo) {
  const produto = produtos.find((p) => p.codigo === codigo)
  return produto ? produto.nome : codigo
}

function getCategoriaLabel(categoria) {
  const labels = {
    medicamentos: "Medicamentos",
    racao: "Ração",
    brinquedos: "Brinquedos",
    higiene: "Higiene",
    acessorios: "Acessórios",
  }
  return labels[categoria] || categoria
}

function getTipoSaidaLabel(tipo) {
  const labels = {
    venda: "Venda",
    medicamento: "Medicamento",
    banho: "Banho e Tosa",
    consulta: "Consulta Veterinária",
  }
  return labels[tipo] || tipo
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0)
}

function formatDate(dateString) {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleDateString("pt-BR")
}

function showMessage(message, type) {
  // Remove existing messages
  const existingMessages = document.querySelectorAll(".message")
  existingMessages.forEach((msg) => msg.remove())

  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${type}`
  messageDiv.textContent = message

  document.body.appendChild(messageDiv)

  setTimeout(() => {
    messageDiv.remove()
  }, 5000)
}
