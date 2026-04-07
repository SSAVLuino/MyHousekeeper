import { supabase } from '../supabase'

export async function withProject(req, res, next) {
  const projectId = req.headers['x-project-id']

  if (!projectId) {
    return res.status(400).json({ error: 'Missing project id' })
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .single()

  if (error) return res.status(403).json({ error: 'Invalid project' })

  req.projectId = projectId
  next()
}
``
