import { useState, useEffect } from 'react'
import { opportunityApi, Opportunity } from '../api'

function OpportunityList() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    customerId: '',
    value: '',
    probability: '',
    closeDate: '',
    notes: ''
  })

  useEffect(() => {
    loadOpportunities()
  }, [])

  const loadOpportunities = async () => {
    try {
      const res = await opportunityApi.getOpportunities()
      if (res.data.success && res.data.data) {
        setOpportunities(res.data.data.opportunities || [])
      }
    } catch (e) {
      console.error('加载销售机会列表失败', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        value: formData.value ? parseFloat(formData.value) : undefined,
        probability: formData.probability ? parseInt(formData.probability) : undefined
      }
      if (editing) {
        await opportunityApi.updateOpportunity(editing.id, data)
      } else {
        await opportunityApi.createOpportunity(data)
      }
      setShowForm(false)
      setEditing(null)
      setFormData({
        name: '',
        customerId: '',
        value: '',
        probability: '',
        closeDate: '',
        notes: ''
      })
      loadOpportunities()
    } catch (e) {
      console.error('操作失败', e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个销售机会吗？')) return
    try {
      await opportunityApi.deleteOpportunity(id)
      loadOpportunities()
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const handleEdit = (opportunity: Opportunity) => {
    setEditing(opportunity)
    setFormData({
      name: opportunity.name,
      customerId: opportunity.customerId || '',
      value: opportunity.value ? opportunity.value.toString() : '',
      probability: opportunity.probability ? opportunity.probability.toString() : '',
      closeDate: opportunity.closeDate ? new Date(opportunity.closeDate).toISOString().split('T')[0] : '',
      notes: opportunity.notes || ''
    })
    setShowForm(true)
  }

  const getStageBadge = (stage: string) => {
    const stageMap: Record<string, { label: string; className: string }> = {
      prospecting: { label: '初步接触', className: 'bg-blue-100 text-blue-800' },
      qualification: { label: '资格认证', className: 'bg-purple-100 text-purple-800' },
      proposal: { label: '方案提交', className: 'bg-yellow-100 text-yellow-800' },
      negotiation: { label: '谈判中', className: 'bg-orange-100 text-orange-800' },
      closed_won: { label: '已成交', className: 'bg-green-100 text-green-800' },
      closed_lost: { label: '已失败', className: 'bg-red-100 text-red-800' }
    }
    const s = stageMap[stage] || { label: stage, className: 'bg-slate-100 text-slate-800' }
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.className}`}>{s.label}</span>
  }

  if (loading) return <div className="p-4 text-slate-600">加载中...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">销售机会列表</h2>
        <button
          onClick={() => {
            setEditing(null)
            setFormData({
              name: '',
              customerId: '',
              value: '',
              probability: '',
              closeDate: '',
              notes: ''
            })
            setShowForm(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + 新增销售机会
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                机会名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                阶段
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                金额
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                成交概率
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                预计成交日
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {opportunities.map((opportunity) => (
              <tr key={opportunity.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {opportunity.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStageBadge(opportunity.stage)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-900">
                  {opportunity.value ? `¥${opportunity.value.toFixed(2)}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {opportunity.probability ? `${opportunity.probability}%` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {opportunity.closeDate ? new Date(opportunity.closeDate).toLocaleDateString('zh-CN') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleEdit(opportunity)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(opportunity.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {opportunities.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            暂无销售机会数据
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {editing ? '编辑销售机会' : '新增销售机会'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    机会名称 *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      金额
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      成交概率 (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    预计成交日期
                  </label>
                  <input
                    type="date"
                    value={formData.closeDate}
                    onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    备注
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
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

export default OpportunityList
