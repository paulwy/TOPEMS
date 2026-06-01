import React, { useState, useEffect } from 'react';
import { mobileApi } from '../api/mobile';
import MobileHeader from '../components/MobileHeader';
import MobileNav from '../components/MobileNav';
import { 
  MapPin, 
  QrCode, 
  Image, 
  Mic, 
  Video, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Play,
  Pause,
  Circle
} from 'lucide-react';

const MobileWorkstationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'patrol' | 'task' | 'scan' | 'media'>('home');
  const [stats, setStats] = useState({
    today_patrols: 0,
    today_scans: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
  });
  const [patrols, setPatrols] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const statsRes = await mobileApi.getDashboardStats();
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      const patrolRes = await mobileApi.listPatrolRecords();
      if (patrolRes.success && patrolRes.data) {
        setPatrols(Array.isArray(patrolRes.data) ? patrolRes.data : patrolRes.data.items || []);
      }

      const taskRes = await mobileApi.listMobileTasks();
      if (taskRes.success && taskRes.data) {
        setTasks(Array.isArray(taskRes.data) ? taskRes.data : taskRes.data.items || []);
      }

      const scanRes = await mobileApi.listScanRecords();
      if (scanRes.success && scanRes.data) {
        setScans(Array.isArray(scanRes.data) ? scanRes.data : scanRes.data.items || []);
      }

      const photoRes = await mobileApi.listPhotoEvidences();
      if (photoRes.success && photoRes.data) {
        const photos = Array.isArray(photoRes.data) ? photoRes.data : photoRes.data.items || [];
        setMedia(prev => [...prev, ...photos]);
      }

      const audioRes = await mobileApi.listAudioRecordings();
      if (audioRes.success && audioRes.data) {
        const audios = Array.isArray(audioRes.data) ? audioRes.data : audioRes.data.items || [];
        setMedia(prev => [...prev, ...audios]);
      }

      const videoRes = await mobileApi.listVideoRecordings();
      if (videoRes.success && videoRes.data) {
        const videos = Array.isArray(videoRes.data) ? videoRes.data : videoRes.data.items || [];
        setMedia(prev => [...prev, ...videos]);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatrol = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await mobileApi.createPatrolRecord({
        title: '巡检打卡',
        description: '例行巡检',
        location_lat: position.coords.latitude,
        location_lng: position.coords.longitude,
        patrol_type: 'routine',
        checked_by: 'current_user',
      });
      alert('打卡成功！');
      loadData();
    } catch (error) {
      console.error('打卡失败:', error);
      alert('打卡失败，请检查位置权限');
    }
  };

  const handleScan = async () => {
    try {
      const code = prompt('请输入扫码内容：');
      if (!code) return;

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await mobileApi.createScanRecord({
        barcode: code,
        location_lat: position.coords.latitude,
        location_lng: position.coords.longitude,
        item_type: 'equipment',
        operator: 'current_user',
      });
      alert('扫码成功！');
      loadData();
    } catch (error) {
      console.error('扫码失败:', error);
      alert('扫码失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      case 'pending': return '待处理';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader title="移动工作台" />

      <main className="pb-20">
        {activeTab === 'home' && (
          <div className="p-4">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white mb-6">
              <h2 className="text-2xl font-bold mb-2">今日工作概览</h2>
              <p className="text-blue-100 mb-4">实时统计</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">巡检</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.today_patrols}</p>
                </div>
                <div className="bg-white/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <QrCode className="w-4 h-4" />
                    <span className="text-sm">扫码</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.today_scans}</p>
                </div>
                <div className="bg-white/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">待处理</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.pending_tasks}</p>
                </div>
                <div className="bg-white/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">已完成</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.completed_tasks}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">快捷操作</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCreatePatrol}
                  className="bg-blue-50 hover:bg-blue-100 rounded-xl p-4 flex flex-col items-center gap-2 transition-colors"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">巡检打卡</span>
                </button>
                <button
                  onClick={handleScan}
                  className="bg-purple-50 hover:bg-purple-100 rounded-xl p-4 flex flex-col items-center gap-2 transition-colors"
                >
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">扫码入库</span>
                </button>
                <button
                  onClick={() => setActiveTab('media')}
                  className="bg-green-50 hover:bg-green-100 rounded-xl p-4 flex flex-col items-center gap-2 transition-colors"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Image className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">拍照记录</span>
                </button>
                <button
                  onClick={() => setActiveTab('task')}
                  className="bg-orange-50 hover:bg-orange-100 rounded-xl p-4 flex flex-col items-center gap-2 transition-colors"
                >
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">处理任务</span>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">最近巡检</h3>
              {patrols.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">暂无巡检记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patrols.slice(0, 3).map((patrol) => (
                    <div key={patrol.id} className="bg-white rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{patrol.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patrol.status)}`}>
                          {getStatusText(patrol.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4" />
                        <span>{patrol.address || '未知位置'}</span>
                      </div>
                      {patrol.checked_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(patrol.checked_at).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'patrol' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">巡检记录</h2>
              <button
                onClick={handleCreatePatrol}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                打卡
              </button>
            </div>

            {patrols.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">暂无巡检记录</p>
                <button
                  onClick={handleCreatePatrol}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-2"
                >
                  立即巡检
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {patrols.map((patrol) => (
                  <div key={patrol.id} className="bg-white rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{patrol.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{patrol.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patrol.status)}`}>
                        {getStatusText(patrol.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{patrol.address || '未知'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{patrol.checked_at ? new Date(patrol.checked_at).toLocaleDateString('zh-CN') : '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'task' && (
          <div className="p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">任务中心</h2>
            
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {['全部', '待处理', '进行中', '已完成'].map((filter) => (
                <button
                  key={filter}
                  className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-blue-50 text-blue-600"
                >
                  {filter}
                </button>
              ))}
            </div>

            {tasks.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无任务</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ml-3 ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <AlertCircle className="w-4 h-4" />
                        <span>优先级: {task.priority || '中'}</span>
                      </div>
                      <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                        查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">扫码记录</h2>
              <button
                onClick={handleScan}
                className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-4 py-2 flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                扫码
              </button>
            </div>

            {scans.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">暂无扫码记录</p>
                <button
                  onClick={handleScan}
                  className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-6 py-2"
                >
                  立即扫码
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {scans.map((scan) => (
                  <div key={scan.id} className="bg-white rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <QrCode className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{scan.content}</h4>
                        <p className="text-sm text-gray-500 mt-1">类型: {scan.scan_type}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {scan.scanned_at ? new Date(scan.scanned_at).toLocaleString('zh-CN') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">媒体记录</h2>
              <div className="flex gap-2">
                <button className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  拍照
                </button>
                <button className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  录像
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {['全部', '照片', '视频', '音频'].map((filter) => (
                <button
                  key={filter}
                  className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-green-50 text-green-600"
                >
                  {filter}
                </button>
              ))}
            </div>

            {media.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <Image className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">暂无媒体记录</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {media.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl overflow-hidden">
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      {item.media_type === 'photo' && <Image className="w-12 h-12 text-gray-400" />}
                      {item.media_type === 'video' && <Video className="w-12 h-12 text-gray-400" />}
                      {item.media_type === 'audio' && <Mic className="w-12 h-12 text-gray-400" />}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-500 truncate">{item.description || '无描述'}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('zh-CN') : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <MobileNav 
        currentPage="mobile-workstation" 
        onNavigate={() => {}} 
      />
    </div>
  );
};

export default MobileWorkstationPage;
