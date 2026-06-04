import React, { useState } from 'react';
import { 
  Camera, 
  Video, 
  Mic, 
  Image, 
  Play, 
  Pause,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  Share2
} from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'audio';
  title: string;
  thumbnail?: string;
  duration?: string;
  size?: string;
  date: string;
}

const MediaPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'photo' | 'video' | 'audio'>('photo');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaItems: Record<string, MediaItem[]> = {
    photo: [
      { id: '1', type: 'photo', title: '巡检现场照片', date: '2024-01-15 14:30', size: '2.3 MB' },
      { id: '2', type: 'photo', title: '设备检查记录', date: '2024-01-15 14:28', size: '1.8 MB' },
      { id: '3', type: 'photo', title: '安全隐患拍照', date: '2024-01-14 16:45', size: '3.1 MB' },
      { id: '4', type: 'photo', title: '工作环境记录', date: '2024-01-14 10:20', size: '2.5 MB' },
      { id: '5', type: 'photo', title: '设施维护照片', date: '2024-01-13 09:15', size: '1.9 MB' },
      { id: '6', type: 'photo', title: '施工现场记录', date: '2024-01-13 15:30', size: '2.8 MB' },
    ],
    video: [
      { id: 'v1', type: 'video', title: '设备巡检视频', duration: '03:45', date: '2024-01-15 14:35', size: '45 MB' },
      { id: 'v2', type: 'video', title: '安全培训录像', duration: '15:20', date: '2024-01-14 10:00', size: '120 MB' },
      { id: 'v3', type: 'video', title: '工作流程演示', duration: '08:15', date: '2024-01-12 16:00', size: '85 MB' },
    ],
    audio: [
      { id: 'a1', type: 'audio', title: '工作汇报录音', duration: '05:30', date: '2024-01-15 17:00', size: '5 MB' },
      { id: 'a2', type: 'audio', title: '会议记录', duration: '25:00', date: '2024-01-14 09:30', size: '23 MB' },
      { id: 'a3', type: 'audio', title: '现场声音记录', duration: '02:15', date: '2024-01-13 14:00', size: '2 MB' },
    ],
  };

  const currentItems = mediaItems[activeTab];

  const handlePhotoUpload = () => {
    alert('拍照功能开发中...');
  };

  const handleVideoRecord = () => {
    alert('录像功能开发中...');
  };

  const handleAudioRecord = () => {
    alert('录音功能开发中...');
  };

  const togglePlay = (id: string) => {
    setPlayingId(playingId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
          <ChevronLeft size={24} />
          <span>返回</span>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">媒体记录</h1>
        <div className="w-16"></div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          {[
            { key: 'photo', label: '照片', icon: Camera },
            { key: 'video', label: '视频', icon: Video },
            { key: 'audio', label: '音频', icon: Mic },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-3 flex items-center justify-center space-x-2 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{tab.label}</span>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {mediaItems[tab.key].length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'photo' && (
          <>
            <button
              onClick={handlePhotoUpload}
              className="w-full bg-blue-600 text-white rounded-xl p-4 flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors mb-4"
            >
              <Camera size={24} />
              <span className="font-medium">拍照记录</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              {currentItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <Image size={40} className="text-gray-400" />
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'video' && (
          <>
            <button
              onClick={handleVideoRecord}
              className="w-full bg-red-600 text-white rounded-xl p-4 flex items-center justify-center space-x-2 hover:bg-red-700 transition-colors mb-4"
            >
              <Video size={24} />
              <span className="font-medium">录制视频</span>
            </button>

            <div className="space-y-2">
              {currentItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl p-3 flex items-center space-x-3">
                  <div className="w-20 h-14 bg-gray-100 rounded-lg flex items-center justify-center relative">
                    <Video size={24} className="text-gray-400" />
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {item.duration}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.date} · {item.size}</p>
                  </div>
                  <button className="text-gray-400 hover:text-blue-600">
                    <Play size={20} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'audio' && (
          <>
            <button
              onClick={handleAudioRecord}
              className="w-full bg-green-600 text-white rounded-xl p-4 flex items-center justify-center space-x-2 hover:bg-green-700 transition-colors mb-4"
            >
              <Mic size={24} />
              <span className="font-medium">开始录音</span>
            </button>

            <div className="space-y-2">
              {currentItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl p-3 flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    {playingId === item.id ? (
                      <Pause size={20} className="text-green-600" />
                    ) : (
                      <Play size={20} className="text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.date} · {item.size}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                      <div className="bg-green-500 h-1.5 rounded-full w-1/3"></div>
                    </div>
                  </div>
                  <button 
                    onClick={() => togglePlay(item.id)}
                    className="text-gray-400 hover:text-green-600"
                  >
                    {playingId === item.id ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex flex-col"
          onClick={() => setSelectedItem(null)}
        >
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setSelectedItem(null)} className="text-white">
              <ChevronLeft size={28} />
            </button>
            <span className="text-white font-medium">{selectedItem.title}</span>
            <div className="flex items-center space-x-2">
              <button className="text-white hover:text-gray-300">
                <Download size={24} />
              </button>
              <button className="text-white hover:text-gray-300">
                <Share2 size={24} />
              </button>
              <button className="text-white hover:text-red-400">
                <Trash2 size={24} />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-lg aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
              <Image size={120} className="text-gray-600" />
            </div>
          </div>
          <div className="flex items-center justify-center space-x-4 p-4">
            <button className="text-white/60 hover:text-white">
              <ChevronLeft size={32} />
            </button>
            <div className="flex-1 h-1 bg-white/20 rounded-full">
              <div className="h-full bg-white rounded-full w-1/3"></div>
            </div>
            <button className="text-white/60 hover:text-white">
              <ChevronRight size={32} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPage;