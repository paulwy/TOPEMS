import { useState, useEffect } from 'react'
import { ChartCard } from '../components/ChartCard'
import { MetricCard } from '../components/MetricCard'
import type { EChartsOption } from 'echarts'
import {
  fetchDevelopmentAnalytics,
  fetchQualityAnalytics,
  fetchProductionAnalytics,
  fetchLaboratoryAnalytics
} from '../api/client'

type ModuleType = 'development' | 'quality' | 'production' | 'laboratory' | 'rs' | 'lims' | 'qms' | 'ehs' | 'srm' | 'pdm'

const moduleConfig: Record<ModuleType, {
  title: string
  description: string
  icon: string
  fetchFn: () => Promise<any>
}> = {
  development: {
    title: '研发管理分析',
    description: '研发项目、进度、效率等关键指标分析',
    icon: '🔬',
    fetchFn: fetchDevelopmentAnalytics
  },
  quality: {
    title: '质量管理分析',
    description: '质量检验、缺陷分析、合格率等数据统计',
    icon: '✅',
    fetchFn: fetchQualityAnalytics
  },
  production: {
    title: '生产数据分析',
    description: '生产批次、产量、效率等指标监控',
    icon: '🏭',
    fetchFn: fetchProductionAnalytics
  },
  laboratory: {
    title: '实验室分析',
    description: '样品检验、仪器使用、实验数据统计',
    icon: '🧪',
    fetchFn: fetchLaboratoryAnalytics
  },
  rs: {
    title: '研发管理分析',
    description: '研发项目、进度、效率等关键指标分析',
    icon: '🔬',
    fetchFn: fetchDevelopmentAnalytics
  },
  lims: {
    title: '实验室分析',
    description: '样品检验、仪器使用、实验数据统计',
    icon: '🧪',
    fetchFn: fetchLaboratoryAnalytics
  },
  qms: {
    title: '质量管理分析',
    description: '质量检验、缺陷分析、合格率等数据统计',
    icon: '✅',
    fetchFn: fetchQualityAnalytics
  },
  ehs: {
    title: '安全环保分析',
    description: '风险评估、安全检查、事故统计',
    icon: '🛡️',
    fetchFn: fetchQualityAnalytics
  },
  srm: {
    title: '供应链分析',
    description: '供应商管理、采购订单、交付率统计',
    icon: '📦',
    fetchFn: fetchQualityAnalytics
  },
  pdm: {
    title: '生产数据分析',
    description: '生产批次、产量、效率等指标监控',
    icon: '🏭',
    fetchFn: fetchProductionAnalytics
  }
}

interface ModuleAnalysisProps {
  params?: { moduleId: string }
}

function ModuleAnalysis({ params }: ModuleAnalysisProps) {
  const moduleId = params?.moduleId
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const config = moduleId ? moduleConfig[moduleId as ModuleType] : null

  useEffect(() => {
    if (config) {
      loadData()
    }
  }, [moduleId])

  const loadData = async () => {
    if (!config) return
    try {
      setLoading(true)
      const res = await config.fetchFn()
      if (res.success && res.data) {
        setData(res.data)
      }
    } catch (e) {
      console.error('Failed to load module data:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 text-slate-600">加载中...</div>
  if (!config) return <div className="p-4 text-slate-600">模块不存在</div>

  const getMetrics = () => {
    if (!data) return []
    const metrics: any[] = []
    
    if (data.total_projects !== undefined) {
      metrics.push({ title: '项目总数', value: data.total_projects, unit: '个', change: 5, change_type: 'increase', icon: '📊' })
    }
    if (data.active_projects !== undefined) {
      metrics.push({ title: '进行中', value: data.active_projects, unit: '个', change: 2, change_type: 'increase', icon: '🔄' })
    }
    if (data.completed_projects !== undefined) {
      metrics.push({ title: '已完成', value: data.completed_projects, unit: '个', change: 8, change_type: 'increase', icon: '✅' })
    }
    if (data.total_samples !== undefined) {
      metrics.push({ title: '样品总数', value: data.total_samples, unit: '份', change: 12, change_type: 'increase', icon: '🧪' })
    }
    if (data.completed_tests !== undefined) {
      metrics.push({ title: '已检验', value: data.completed_tests, unit: '次', change: 6, change_type: 'increase', icon: '🔬' })
    }
    if (data.pending_tests !== undefined) {
      metrics.push({ title: '待检验', value: data.pending_tests, unit: '次', change: -3, change_type: 'decrease', icon: '⏳' })
    }
    if (data.pass_rate !== undefined) {
      metrics.push({ title: '合格率', value: data.pass_rate, unit: '%', change: 0.5, change_type: 'increase', icon: '📈' })
    }
    if (data.total_inspections !== undefined) {
      metrics.push({ title: '检验总数', value: data.total_inspections, unit: '次', change: 8, change_type: 'increase', icon: '✅' })
    }
    if (data.total_production_batches !== undefined) {
      metrics.push({ title: '生产批次', value: data.total_production_batches, unit: '批', change: 10, change_type: 'increase', icon: '🏭' })
    }
    if (data.production_efficiency !== undefined) {
      metrics.push({ title: '生产效率', value: data.production_efficiency, unit: '%', change: 1.2, change_type: 'increase', icon: '⚡' })
    }
    if (data.instrument_usage_rate !== undefined) {
      metrics.push({ title: '仪器使用率', value: data.instrument_usage_rate, unit: '%', change: 2.1, change_type: 'increase', icon: '🔧' })
    }
    
    return metrics.slice(0, 4)
  }

  const getTrendChart = (): EChartsOption => {
    const trendData = data?.monthly_new_projects || data?.quality_trend || data?.daily_output || []
    return {
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: trendData.map((item: any) => item.month || item.date || item.name || '')
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '数据',
          type: 'line',
          smooth: true,
          data: trendData.map((item: any) => item.count || item.pass_rate || item.output || 0),
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
              ]
            }
          },
          itemStyle: {
            color: '#3B82F6'
          }
        }
      ]
    }
  }

  const getDistributionChart = (): EChartsOption => {
    const distData = data?.project_type_distribution || data?.defect_types || data?.test_type_distribution || data?.product_line_usage || data?.project_status_distribution
    if (!distData) {
      return {
        series: [{
          type: 'pie',
          radius: '60%',
          data: [{ value: 1, name: '暂无数据' }]
        }]
      }
    }
    
    const dataList = Object.entries(distData).map(([key, value]) => {
      const labels: Record<string, string> = {
        research: '研究型',
        development: '开发型',
        improvement: '改进型',
        in_progress: '进行中',
        pending_approval: '待审批',
        completed: '已完成',
        cancelled: '已取消',
        material: '原材料',
        process: '工艺',
        equipment: '设备',
        chemical: '化学检验',
        physical: '物理检验',
        microbiological: '微生物检验',
        line_a: '生产线A',
        line_b: '生产线B',
        line_c: '生产线C'
      }
      return { name: labels[key] || key, value: value }
    })

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
    
    return {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '分布',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          data: dataList,
          color: colors
        }
      ]
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            <span className="mr-2">{config.icon}</span>
            {config.title}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{config.description}</p>
        </div>
        <button 
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          刷新数据
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getMetrics().map((metric, index) => (
              <MetricCard key={index} metric={metric} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard 
              title="趋势分析" 
              option={getTrendChart()} 
              height="350px" 
            />
            <ChartCard 
              title="分布统计" 
              option={getDistributionChart()} 
              height="350px" 
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">详细数据</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(data).map(([key, value]) => {
                    if (key === 'generated_at' || typeof value === 'object') return null
                    const labels: Record<string, string> = {
                      total_projects: '项目总数',
                      active_projects: '进行中项目',
                      completed_projects: '已完成项目',
                      total_samples: '样品总数',
                      completed_tests: '已完成检验',
                      pending_tests: '待检验',
                      pass_rate: '合格率',
                      total_inspections: '检验总数',
                      passed_inspections: '通过数量',
                      failed_inspections: '失败数量',
                      total_production_batches: '生产批次',
                      completed_batches: '已完成批次',
                      in_progress_batches: '进行中批次',
                      production_efficiency: '生产效率',
                      instrument_usage_rate: '仪器使用率'
                    }
                    const units: Record<string, string> = {
                      pass_rate: '%',
                      production_efficiency: '%',
                      instrument_usage_rate: '%'
                    }
                    return (
                      <tr key={key}>
                        <td className="px-4 py-3 text-sm text-gray-600">{labels[key] || key}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {typeof value === 'number' && !Number.isInteger(value) 
                            ? value.toFixed(2) 
                            : value}
                          {units[key] || ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ModuleAnalysis
