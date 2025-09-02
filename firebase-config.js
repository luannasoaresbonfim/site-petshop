// Configuração do Firebase para Petshop Bela
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js"
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"

// Configuração do Firebase - SUBSTITUA PELOS SEUS DADOS
const firebaseConfig = {
    apiKey: "AIzaSyBfCETqEgtEF4f6MgrucxqhM5loz8JWOEw",
    authDomain: "petshopbela-957fe.firebaseapp.com",
    projectId: "petshopbela-957fe",
    storageBucket: "petshopbela-957fe.firebasestorage.app",
    messagingSenderId: "1096106186288",
    appId: "1:1096106186288:web:0df03ddb64745cc3e5fff5",
    measurementId: "G-BG16HL2DMK"
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Referências das coleções
const stockCollection = collection(db, "estoque")
const entriesCollection = collection(db, "entradas")
const exitsCollection = collection(db, "saidas")

// Funções utilitárias para operações no Firebase
export const FirebaseService = {
  // Operações de Estoque
  async addStock(item) {
    try {
      const docRef = await addDoc(stockCollection, {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return docRef.id
    } catch (error) {
      console.error("Erro ao adicionar item ao estoque:", error)
      throw error
    }
  },

  async getStock() {
    try {
      const q = query(stockCollection, orderBy("nome"))
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error) {
      console.error("Erro ao buscar estoque:", error)
      throw error
    }
  },

  async updateStock(id, updates) {
    try {
      const stockRef = doc(db, "estoque", id)
      await updateDoc(stockRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Erro ao atualizar estoque:", error)
      throw error
    }
  },

  async deleteStock(id) {
    try {
      await deleteDoc(doc(db, "estoque", id))
    } catch (error) {
      console.error("Erro ao deletar item do estoque:", error)
      throw error
    }
  },

  // Operações de Entrada
  async addEntry(entry) {
    try {
      const docRef = await addDoc(entriesCollection, {
        ...entry,
        createdAt: serverTimestamp(),
      })
      return docRef.id
    } catch (error) {
      console.error("Erro ao adicionar entrada:", error)
      throw error
    }
  },

  async getEntries(startDate = null, endDate = null) {
    try {
      let q = query(entriesCollection, orderBy("data", "desc"))

      if (startDate && endDate) {
        const startDateStr = startDate instanceof Date ? startDate.toISOString().split("T")[0] : startDate
        const endDateStr = endDate instanceof Date ? endDate.toISOString().split("T")[0] : endDate

        q = query(
          entriesCollection,
          where("data", ">=", startDateStr),
          where("data", "<=", endDateStr),
          orderBy("data", "desc"),
        )
      }

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error) {
      console.error("Erro ao buscar entradas:", error)
      throw error
    }
  },

  // Operações de Saída
  async addExit(exit) {
    try {
      const docRef = await addDoc(exitsCollection, {
        ...exit,
        createdAt: serverTimestamp(),
      })
      return docRef.id
    } catch (error) {
      console.error("Erro ao adicionar saída:", error)
      throw error
    }
  },

  async getExits(startDate = null, endDate = null) {
    try {
      let q = query(exitsCollection, orderBy("data", "desc"))

      if (startDate && endDate) {
        const startDateStr = startDate instanceof Date ? startDate.toISOString().split("T")[0] : startDate
        const endDateStr = endDate instanceof Date ? endDate.toISOString().split("T")[0] : endDate

        q = query(
          exitsCollection,
          where("data", ">=", startDateStr),
          where("data", "<=", endDateStr),
          orderBy("data", "desc"),
        )
      }

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error) {
      console.error("Erro ao buscar saídas:", error)
      throw error
    }
  },

  // Listener em tempo real para estoque
  onStockChange(callback) {
    const q = query(stockCollection, orderBy("nome"))
    return onSnapshot(q, (querySnapshot) => {
      const items = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      callback(items)
    })
  },

  // Função para buscar relatórios mensais
  async getMonthlyReport(year, month) {
    try {
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${month.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`

      const [entries, exits] = await Promise.all([
        this.getEntries(startDate, endDate),
        this.getExits(startDate, endDate),
      ])

      const totalEntries = entries.reduce((sum, entry) => sum + (entry.preco || 0) * (entry.quantidade || 0), 0)
      const totalExits = exits.reduce((sum, exit) => sum + (exit.preco || 0) * (exit.quantidade || 0), 0)

      return {
        entries,
        exits,
        totalEntries,
        totalExits,
        period: `${month}/${year}`,
      }
    } catch (error) {
      console.error("Erro ao gerar relatório mensal:", error)
      throw error
    }
  },
}

// Exportar instâncias para uso direto se necessário
export { db, serverTimestamp }
