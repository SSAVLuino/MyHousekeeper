router.get('/', withProject, async (req, res) => {
  const { data, error } = await supabase
    .from('deadlines')
    .select('*, assets(name)')
    .eq('project_id', req.projectId)
    .order('due_date')

  if (error) return res.status(500).json(error)
  res.json(data)
})

router.post('/', withProject, async (req, res) => {
  const { asset_id, title, category, due_date, notes } = req.body

  const { data, error } = await supabase
    .from('deadlines')
    .insert({
      project_id: req.projectId,
      asset_id,
      title,
      category,
      due_date,
      notes
    })
    .select()

  if (error) return res.status(500).json(error)
  res.json(data)
})
