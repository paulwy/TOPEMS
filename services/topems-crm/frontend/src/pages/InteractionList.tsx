import { useState, useEffect } from 'react'
import { interactionApi, Interaction } from '../api'

function InteractionList() {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Interaction | null>(null)
  const [formData, setFormData] = useState({
    customerId: '',
    contactId: '',
    type: '',
    subject: '',
    content: '',
    scheduledAt: '',
    notes: ''
  })

  useEffect(() => {
    loadInteractions()
  }, [])

  const loadInteractions = async () => {
    try {
      const res = await interactionApi.getInteractions()
      if (res.data.success && res.data.data) {
        setInteractions(res.data.data.interactions || [])
      }
    } catch (e) {
      console.error('加载交互记录列表失败', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await interactionApi.updateInteraction(editing.id, formData)
      } else {
        await interactionApi.createInteraction(formData)
      }
      setShowForm(false)
      setEditing(null)
      setFormData({
        customerId: '',
        contactId: '',
        type: '',
        subject: '',
        content: '',
        scheduledAt: '',
        notes: ''
      })
      loadInteractions()
    } catch (e) {
      console.error('操作失败', e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条交互记录吗？')) return
    try {
      await interactionApi.deleteInteraction(id)
      loadInteractions()
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const handleEdit = (interaction: Interaction) => {
    setEditing(interaction)
    setFormData({
      customerId: interaction.customerId || '',
      contactId: interaction.contactId || '',
      type: interaction.type,
      subject: interaction.subject || '',
      content: interaction.content || '',
      scheduledAt: interaction.scheduledAt ? new Date(interaction.scheduledAt).toISOString().slice(0, 16) : '',
      notes: ''
    })
    setShowForm(true)
  }

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      call: '电话',
      email: '邮件',
      meeting: '会议',
      demo: '演示',
      note: '备注'
    }
    return typeMap[type] || type
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      scheduled: { label: '已计划', className: 'bg-blue-100 text-blue-800' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-800' },
      cancelled: { label: '已取消', className: 'bg-red-100 text-red-800' }
    }
    const s = statusMap[status] || { label: status, className: 'bg-slate-100 text-slate-800' }
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.className}`}>{s.label}</span>
  }

  if (loading) return <div className="p-4 text-slate-600">加载中...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">交互记录列表</h2>
        <button
          onClick={() => {
            setEditing(null)
            setFormData({
              customerId: '',
              contactId: '',
              type: '',
              subject: '',
              content: '',
              scheduledAt: '',
              notes: ''
            })
            setShowForm(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + 新增交互记录
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                主题
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                计划时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {interactions.map((interaction) => (
              <tr key={interaction.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {getTypeLabel(interaction.type)}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {interaction.subject || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {interaction.scheduledAt ? new Date(interaction.scheduledAt).toLocaleString('zh-CN') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(interaction.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleEdit(interaction)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(interaction.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {interactions.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            暂无交互记录数据
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {editing ? '编辑交互记录' : '新增交互记录'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    类型 *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择</option>
                    <option value="call">电话</option>
                    <option value="email">邮件</option>
                    <option value="meeting">会议</option>
                    <option value="demo">演示</option>
                    <option value="note">备注</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    主题
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    内容
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    计划时间
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditing(null)
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InteractionList
