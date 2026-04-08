'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { List, Plus, Edit2, Trash2, Save, X, Globe, User } from 'lucide-react'

interface ValueListItem {
  id: string
  category: string
  value: string
  label: string
  order_index: number
  is_active: boolean
  user_id: string | null
}

const CATEGORIES = [
  { value: 'asset_type', label: 'Tipi Asset' },
  { value: 'deadline_category', label: 'Categorie Scadenze' },
  { value: 'deadline_frequency', label: 'Frequenze Scadenze' },
  { value: 'member_role', label: 'Ruoli Membri' },
]

export default function ValueListsPage() {
  const [selectedCategory, setSelectedCategory] = useState('asset_type')
  const [items, setItems] = useState<ValueListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Form state
  const [formValue, setFormValue] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formOrderIndex, setFormOrderIndex] = useState(0)
  
  const supabase = createClient()

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadItems()
    }
  }, [selectedCategory, currentUserId])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }

  const loadItems = async () => {
    setLoading(true)
    try {
      // Carica valori default (user_id = null) + valori personali dell'utente
      const { data, error } = await supabase
        .from('value_lists')
        .select('*')
        .eq('category', selectedCategory)
        .or(`user_id.is.null,user_id.eq.${currentUserId}`)
        .order('order_index')

      if (error) throw error

      // Filtra per mostrare: se esiste versione personale, nascondi quella default
      const personalValues = (data || []).filter(item => item.user_id === currentUserId)
      const defaultValues = (data || []).filter(item => item.user_id === null)
      
      const mergedItems = defaultValues.map(defaultItem => {
        const personalOverride = personalValues.find(p => p.value === defaultItem.value)
        return personalOverride || defaultItem
      })

      // Aggiungi valori personali che non hanno default
      const personalOnlyValues = personalValues.filter(
        p => !defaultValues.some(d => d.value === p.value)
      )

      setItems([...mergedItems, ...personalOnlyValues].sort((a, b) => a.order_index - b.order_index))
    } catch (error: any) {
      console.error('Errore:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setIsAdding(true)
    setFormValue('')
    setFormLabel('')
    setFormOrderIndex(items.length + 1)
  }

  const handleEdit = (item: ValueListItem) => {
    setEditingId(item.id)
    setFormValue(item.value)
    setFormLabel(item.label)
    setFormOrderIndex(item.order_index)
  }

  const handleSave = async () => {
    try {
      if (isAdding) {
        // Nuovo valore personale
        const { error } = await supabase
          .from('value_lists')
          .insert({
            category: selectedCategory,
            value: formValue,
            label: formLabel,
            order_index: formOrderIndex,
            is_active: true,
            user_id: currentUserId, // Sempre personale
          })

        if (error) throw error
      } else if (editingId) {
        const currentItem = items.find(i => i.id === editingId)
        
        if (currentItem?.user_id === null) {
          // Sta modificando un valore default → crea override personale
          const { error } = await supabase
            .from('value_lists')
            .insert({
              category: selectedCategory,
              value: currentItem.value, // Stesso value per override
              label: formLabel,
              order_index: formOrderIndex,
              is_active: true,
              user_id: currentUserId,
            })

          if (error) throw error
        } else {
          // Sta modificando un suo valore personale → aggiorna
          const { error } = await supabase
            .from('value_lists')
            .update({
              label: formLabel,
              order_index: formOrderIndex,
            })
            .eq('id', editingId)

          if (error) throw error
        }
      }

      setIsAdding(false)
      setEditingId(null)
      loadItems()
    } catch (error: any) {
      alert('Errore: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    const item = items.find(i => i.id === id)
    
    if (item?.user_id === null) {
      alert('Non puoi eliminare i valori di default. Puoi solo personalizzarli.')
      return
    }

    if (!confirm('Sei sicuro di voler eliminare questo valore personalizzato?')) return

    try {
      const { error } = await supabase
        .from('value_lists')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadItems()
    } catch (error: any) {
      alert('Errore: ' + error.message)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const item = items.find(i => i.id === id)
    
    if (item?.user_id === null) {
      // Valore default → crea override personale disattivato
      const { error } = await supabase
        .from('value_lists')
        .insert({
          category: item.category,
          value: item.value,
          label: item.label,
          order_index: item.order_index,
          is_active: !currentStatus,
          user_id: currentUserId,
        })

      if (error) {
        alert('Errore: ' + error.message)
        return
      }
    } else {
      // Valore personale → aggiorna
      const { error } = await supabase
        .from('value_lists')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) {
        alert('Errore: ' + error.message)
        return
      }
    }

    loadItems()
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormValue('')
    setFormLabel('')
    setFormOrderIndex(0)
  }

  const handleResetToDefault = async (value: string) => {
    if (!confirm('Ripristinare il valore di default per questo elemento?')) return

    try {
      // Elimina l'override personale
      const { error } = await supabase
        .from('value_lists')
        .delete()
        .eq('category', selectedCategory)
        .eq('value', value)
        .eq('user_id', currentUserId)

      if (error) throw error
      loadItems()
    } catch (error: any) {
      alert('Errore: ' + error.message)
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Gestione Value List</h1>
        <p className="page-subtitle">Personalizza le tue liste di valori</p>
      </div>

      {/* Category Selector */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Seleziona Categoria
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 transition-colors text-xs sm:text-sm ${
                selectedCategory === cat.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              {CATEGORIES.find(c => c.value === selectedCategory)?.label}
            </h2>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 sm:gap-2 bg-primary-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-primary-700 transition-colors text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Aggiungi</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {/* Form Aggiungi */}
            {isAdding && (
              <div className="p-3 sm:p-4 bg-blue-50">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3">
                  <div className="sm:col-span-1">
                    <input
                      type="number"
                      value={formOrderIndex}
                      onChange={(e) => setFormOrderIndex(parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
                      placeholder="#"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      placeholder="valore"
                      className="w-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                      placeholder="Etichetta"
                      className="w-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div className="sm:col-span-3 flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-1.5 rounded text-xs sm:text-sm hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mx-auto" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 sm:flex-none bg-gray-600 text-white px-3 py-1.5 rounded text-xs sm:text-sm hover:bg-gray-700"
                    >
                      <X className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista Valori */}
            {items.map((item) => (
              <div key={item.id} className={`p-3 sm:p-4 ${editingId === item.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                {editingId === item.id ? (
                  // Edit Mode
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3">
                    <div className="sm:col-span-1">
                      <input
                        type="number"
                        value={formOrderIndex}
                        onChange={(e) => setFormOrderIndex(parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={formValue}
                        disabled
                        className="w-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded bg-gray-50 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={formLabel}
                        onChange={(e) => setFormLabel(e.target.value)}
                        className="w-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div className="sm:col-span-3 flex gap-2">
                      <button
                        onClick={handleSave}
                        className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-1.5 rounded text-xs sm:text-sm"
                      >
                        <Save className="h-4 w-4 mx-auto" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex-1 sm:flex-none bg-gray-600 text-white px-3 py-1.5 rounded text-xs sm:text-sm"
                      >
                        <X className="h-4 w-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                      <span className="text-xs sm:text-sm text-gray-500 w-6 sm:w-8 flex-shrink-0">#{item.order_index}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <code className="text-xs sm:text-sm font-mono text-gray-900 truncate">{item.value}</code>
                        {item.user_id === null ? (
                          <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" title="Valore globale" />
                        ) : (
                          <User className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" title="Personalizzato" />
                        )}
                      </div>
                      <span className="hidden sm:inline text-sm text-gray-900 truncate">{item.label}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActive(item.id, item.is_active)}
                        className={`text-xs px-2 py-1 rounded ${
                          item.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {item.is_active ? 'ON' : 'OFF'}
                      </button>
                      
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 sm:p-2 text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                      
                      {item.user_id !== null && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Mobile label - mostrato solo su schermi piccoli */}
                {editingId !== item.id && (
                  <div className="sm:hidden mt-2 text-sm text-gray-600 truncate">
                    {item.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-blue-900 font-medium mb-2">ℹ️ Come funziona:</p>
        <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
          <li className="flex items-start gap-2">
            <Globe className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span><strong>Globale:</strong> Valore di default visibile a tutti</span>
          </li>
          <li className="flex items-start gap-2">
            <User className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span><strong>Personalizzato:</strong> La tua versione, visibile solo a te</span>
          </li>
          <li className="ml-6">• Modificando un valore globale, crei automaticamente la tua versione personale</li>
          <li className="ml-6">• I valori globali non possono essere eliminati, solo personalizzati</li>
        </ul>
      </div>
    </div>
  )
}
