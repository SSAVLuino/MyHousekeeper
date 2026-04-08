'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { UserPlus, Trash2, Users, Shield } from 'lucide-react'
import { loadValueLists } from '@/lib/valueListsHelper'

interface Member {
  user_id: string
  role: string
  email?: string
}

interface ProjectMembersProps {
  projectId: string
  currentMembers: Member[]
  isOwner: boolean
}

export default function ProjectMembers({ projectId, currentMembers, isOwner }: ProjectMembersProps) {
  const [members, setMembers] = useState<Member[]>(currentMembers)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('editor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roles, setRoles] = useState<any[]>([])
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadRoles()
    loadMembersWithEmails()
  }, [])

  const loadRoles = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const roles = await loadValueLists(supabase, 'member_role', user.id, true)
    setRoles(roles)
  }

  const loadMembersWithEmails = async () => {
    // Per ora mostriamo solo gli ID
    // In futuro si potrebbe creare una tabella user_profiles
    setMembers(currentMembers)
  }

  const handleAddMember = async () => {
    setLoading(true)
    setError(null)

    try {
      const userIdInput = newMemberEmail.trim()
      
      if (!userIdInput) {
        setError('Inserisci l\'ID utente')
        setLoading(false)
        return
      }

      // Verifica se è già membro
      const isAlreadyMember = members.some(m => m.user_id === userIdInput)
      if (isAlreadyMember) {
        setError('Questo utente è già membro del progetto.')
        setLoading(false)
        return
      }

      // Aggiungi il membro
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userIdInput,
          role: newMemberRole
        })

      if (insertError) {
        if (insertError.code === '23503') {
          setError('ID utente non valido. L\'utente non esiste.')
        } else {
          throw insertError
        }
        setLoading(false)
        return
      }

      setIsAddingMember(false)
      setNewMemberEmail('')
      setNewMemberRole('editor')
      router.refresh()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Sei sicuro di voler rimuovere questo membro?')) return

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId)

      if (error) throw error

      router.refresh()
    } catch (error: any) {
      alert('Errore: ' + error.message)
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('project_id', projectId)
        .eq('user_id', userId)

      if (error) throw error

      router.refresh()
    } catch (error: any) {
      alert('Errore: ' + error.message)
    }
  }

  const getRoleLabel = (roleValue: string) => {
    const role = roles.find(r => r.value === roleValue)
    return role ? role.label : roleValue
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Membri</h2>
          <span className="text-sm text-gray-500">({members.length})</span>
        </div>
        {isOwner && (
          <button
            onClick={() => setIsAddingMember(true)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            <UserPlus className="h-4 w-4" />
            Aggiungi
          </button>
        )}
      </div>

      <div className="p-6">
        {/* Form aggiungi membro */}
        {isAddingMember && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-3">Aggiungi Nuovo Membro</h3>
            
            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Utente (UUID)
                </label>
                <input
                  type="text"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  L'utente può trovare il proprio ID in Impostazioni
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ruolo
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddMember}
                  disabled={loading || !newMemberEmail}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Aggiunta...' : 'Aggiungi Membro'}
                </button>
                <button
                  onClick={() => {
                    setIsAddingMember(false)
                    setError(null)
                    setNewMemberEmail('')
                  }}
                  className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista membri */}
        {members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.email || `Utente ${member.user_id.substring(0, 8)}...`}
                    </p>
                    {!member.email && (
                      <p className="text-xs text-gray-500">{member.user_id.substring(0, 16)}...</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {getRoleLabel(member.role)}
                    </span>
                  )}
                  
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Rimuovi membro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Nessun membro</p>
            {isOwner && (
              <button
                onClick={() => setIsAddingMember(true)}
                className="mt-3 text-sm text-primary-600 hover:text-primary-700"
              >
                Aggiungi il primo membro
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
