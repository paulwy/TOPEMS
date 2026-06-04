import { useState, useEffect } from 'react'
import { fetchAnalyticsOverview } from '../api/client'
import { ChartCard } from '../components/ChartCard'
import { MetricCard } from '../components/MetricCard'
import type { EChartsOption } from 'echarts'

function AnalyticsOverview() {
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOverview()
  }, [])

  const loadOverview = async () => {
    try {
      const res = await fetchAnalyticsOverview()
      if (res.success && res.data) {
        setOverview(res.data)
      }
    } catch (e) {
      console.error('Failed to load overview:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 text-slate-600">加载中...</div>

  const moduleChart: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: overview?.modules ? Object.values(overview.modules).map((m: any) => m.name) : []
    },
    series: [
      {
        name: '总数量',
        type: 'bar',
        data: overview?.modules ? Object.values(overview.modules).map((m: any) => 
          m.total_projects || m.total_samples || m.total_inspections || m.total_risks || m.total_suppliers || m.total_batches || 0
        ) : [],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#3B82F6' },
              { offset: 1, color: '#8B5CF6' }
            ]
          }
        }
      }
    ]
  }

  const completionRateChart: EChartsOption = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '完成率',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: 75, name: '已完成', itemStyle: { color: '#10B981' } },
          { value: 25, name: '进行中', itemStyle: { color: '#3B82F6' } }
        ]
      }
    ]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">概览分析</h2>
          <p className="text-sm text-gray-500 mt-1">各业务模块数据总览</p>
        </div>
      </div>

      {overview?.key_metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {overview.key_metrics.map((metric: any, index: number) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </div>
      )}

      {overview?.modules && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCard 
                title="各业务模块数据统计" 
                option={moduleChart} 
                height="350px" 
              />
            </div>
            <div>
              <ChartCard 
                title="总体完成率" 
                option={completionRateChart} 
                height="350px" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(overview.modules).map(([key, module]: [string, any]) => (
              <div key={key} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-3">{module.name}</h4>
                <div className="space-y-2">
                  {module.total_projects !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">项目总数</span>
                      <span className="font-medium text-gray-900">{module.total_projects}</span>
                    </div>
                  )}
                  {module.active_projects !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">进行中</span>
                      <span className="font-medium text-blue-600">{module.active_projects}</span>
                    </div>
                  )}
                  {module.total_samples !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">样品总数</span>
                      <span className="font-medium text-gray-900">{module.total_samples}</span>
                    </div>
                  )}
                  {module.total_inspections !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">检验总数</span>
                      <span className="font-medium text-gray-900">{module.total_inspections}</span>
                    </div>
                  )}
                  {module.pass_rate !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">合格率</span>
                      <span className="font-medium text-green-600">{module.pass_rate}%</span>
                    </div>
                  )}
                  {module.completion_rate !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">完成率</span>
                      <span className="font-medium text-green-600">{module.completion_rate}%</span>
                    </div>
                  )}
                  {module.total_suppliers !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">供应商总数</span>
                      <span className="font-medium text-gray-900">{module.total_suppliers}</span>
                    </div>
                  )}
                  {module.total_batches !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">生产批次</span>
                      <span className="font-medium text-gray-900">{module.total_batches}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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