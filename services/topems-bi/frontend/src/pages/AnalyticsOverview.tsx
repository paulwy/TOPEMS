import { useState, useEffect } from 'react'
import { analyticsApi } from '../api'

function AnalyticsOverview() {
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOverview()
  }, [])

  const loadOverview = async () => {
    try {
      const res = await analyticsApi.getOverview()
      if (res.data.success && res.data.data) {
        setOverview(res.data.data)
      }
    } catch (e) {
      console.error('Failed to load overview:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 text-slate-600">加载中...</div>

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-6">概览分析</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">仪表盘数量</p>
              <p className="text-3xl font-bold text-slate-900">{overview?.dashboard_count || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">报表数量</p>
              <p className="text-3xl font-bold text-slate-900">{overview?.report_count || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">组件数量</p>
              <p className="text-3xl font-bold text-slate-900">{overview?.widget_count || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🧩</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">系统状态</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-600">数据更新时间</span>
            <span className="text-sm font-medium text-slate-900">
              {overview?.generated_at ? new Date(overview.generated_at).toLocaleString('zh-CN') : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <span className="text-slate-600">系统状态</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
              正常运行
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsOverview
