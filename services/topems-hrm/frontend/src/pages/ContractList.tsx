import { useState, useEffect } from 'react'
import { contractApi, Contract } from '../api'

function ContractList() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Contract | null>(null)
  const [formData, setFormData] = useState({
    employeeId: '',
    contractType: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    salary: '',
    notes: ''
  })

  useEffect(() => {
    loadContracts()
  }, [])

  const loadContracts = async () => {
    try {
      const res = await contractApi.getContracts()
      if (res.data.success && res.data.data) {
        setContracts(res.data.data.contracts || [])
      }
    } catch (e) {
      console.error('加载合同列表失败', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : undefined
      }
      if (editing) {
        await contractApi.updateContract(editing.id, data)
      } else {
        await contractApi.createContract(data)
      }
      setShowForm(false)
      setEditing(null)
      setFormData({
        employeeId: '',
        contractType: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        salary: '',
        notes: ''
      })
      loadContracts()
    } catch (e) {
      console.error('操作失败', e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个合同吗？')) return
    try {
      await contractApi.deleteContract(id)
      loadContracts()
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const handleEdit = (contract: Contract) => {
    setEditing(contract)
    setFormData({
      employeeId: contract.employeeId,
      contractType: contract.contractType,
      startDate: new Date(contract.startDate).toISOString().split('T')[0],
      endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : '',
      salary: contract.salary ? contract.salary.toString() : '',
      notes: contract.notes || ''
    })
    setShowForm(true)
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: '有效', className: 'bg-green-100 text-green-800' },
      expired: { label: '过期', className: 'bg-orange-100 text-orange-800' },
      terminated: { label: '终止', className: 'bg-red-100 text-red-800' }
    }
    const s = statusMap[status] || { label: status, className: 'bg-slate-100 text-slate-800' }
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.className}`}>{s.label}</span>
  }

  if (loading) return <div className="p-4 text-slate-600">加载中...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">合同列表</h2>
        <button
          onClick={() => {
            setEditing(null)
            setFormData({
              employeeId: '',
              contractType: '',
              startDate: new Date().toISOString().split('T')[0],
              endDate: '',
              salary: '',
              notes: ''
            })
            setShowForm(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + 新增合同
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                合同类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                开始日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                结束日期
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                薪资
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
            {contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {contract.contractType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {new Date(contract.startDate).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {contract.endDate ? new Date(contract.endDate).toLocaleDateString('zh-CN') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-900">
                  {contract.salary ? `¥${contract.salary.toFixed(2)}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(contract.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleEdit(contract)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(contract.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {contracts.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            暂无合同数据
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {editing ? '编辑合同' : '新增合同'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    员工ID *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    合同类型 *
                  </label>
                  <select
                    required
                    value={formData.contractType}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择</option>
                    <option value="劳动合同">劳动合同</option>
                    <option value="实习协议">实习协议</option>
                    <option value="劳务合同">劳务合同</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      开始日期 *
                    </label>
                    <input
                      required
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      结束日期
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    薪资
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
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

export default ContractList
