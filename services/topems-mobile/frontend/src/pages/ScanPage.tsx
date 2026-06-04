import React, { useState, useEffect } from 'react';
import { scanApi } from '../api/client';
import { 
  QrCode, 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle,
  History,
  Package
} from 'lucide-react';

const ScanPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<{ barcode: string; time: string; type: string }[]>([]);
  const [inputCode, setInputCode] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const records = await scanApi.getAll();
    const recent = records.slice(0, 10).map(r => ({
      barcode: r.scan_code,
      time: new Date(r.scan_time).toLocaleString('zh-CN'),
      type: r.scan_type === 'equipment' ? '设备' : r.scan_type === 'material' ? '物料' : '其他'
    }));
    setHistory(recent);
  };

  const handleScan = async () => {
    setScanning(true);
    setResult(null);
    
    setTimeout(async () => {
      try {
        const testCode = `TEST${Date.now()}`;
        await navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 5000 });

        await scanApi.create({
          scan_type: 'equipment',
          scan_code: testCode,
          scanned_by: 'current_user',
          location: '测试位置',
        });

        setResult(testCode);
        setSuccess(true);
        loadHistory();
      } catch (error) {
        setResult('扫码失败');
        setSuccess(false);
        console.error('Scan error:', error);
      } finally {
        setScanning(false);
      }
    }, 2000);
  };

  const handleManualInput = async () => {
    if (!inputCode.trim()) return;
    
    try {
      await navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 5000 });

      await scanApi.create({
        scan_type: 'equipment',
        scan_code: inputCode,
        scanned_by: 'current_user',
        location: '手动输入',
      });

      setResult(inputCode);
      setSuccess(true);
      setInputCode('');
      loadHistory();
    } catch (error) {
      setResult('输入失败');
      setSuccess(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center space-x-2 text-gray-300 hover:text-white">
          <X size={24} />
          <span>返回</span>
        </button>
        <h1 className="text-lg font-semibold">扫码</h1>
        <div className="w-16"></div>
      </div>

      <div className="relative p-6">
        <div className={`relative aspect-square max-w-[300px] mx-auto ${scanning ? 'animate-pulse' : ''}`}>
          <div className="absolute inset-0 border-4 border-blue-500 rounded-2xl opacity-50"></div>
          <div className="absolute inset-4 border-2 border-blue-400 rounded-xl"></div>
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-t-4 border-l-4 border-blue-500"></div>
          </div>
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-t-4 border-r-4 border-blue-500"></div>
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="w-4 h-4 border-b-4 border-l-4 border-blue-500"></div>
          </div>
          <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2">
            <div className="w-4 h-4 border-b-4 border-r-4 border-blue-500"></div>
          </div>

          {scanning ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : result ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/90 rounded-xl">
              {success ? (
                <>
                  <CheckCircle size={64} className="text-green-500 mb-4" />
                  <p className="text-xl font-bold text-green-400">扫码成功</p>
                  <p className="text-gray-400 mt-2">{result}</p>
                  <button 
                    onClick={handleReset}
                    className="mt-4 px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    继续扫码
                  </button>
                </>
              ) : (
                <>
                  <AlertCircle size={64} className="text-red-500 mb-4" />
                  <p className="text-xl font-bold text-red-400">扫码失败</p>
                  <button 
                    onClick={handleReset}
                    className="mt-4 px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    重试
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <QrCode size={80} className="text-gray-600 mb-4" />
              <p className="text-gray-400">将二维码对准扫描框</p>
            </div>
          )}
        </div>

        <button
          onClick={handleScan}
          disabled={scanning}
          className={`w-full mt-6 py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors ${
            scanning 
              ? 'bg-gray-700 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Camera size={20} />
          <span>{scanning ? '扫描中...' : '开始扫描'}</span>
        </button>

        <div className="mt-6">
          <div className="flex items-center space-x-2 mb-3">
            <div className="flex-1 h-px bg-gray-700"></div>
            <span className="text-gray-500 text-sm">或</span>
            <div className="flex-1 h-px bg-gray-700"></div>
          </div>
          
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="手动输入条码"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleManualInput()}
            />
            <button
              onClick={handleManualInput}
              disabled={!inputCode.trim()}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              确认
            </button>
          </div>
        </div>

        {history.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center space-x-2 mb-3">
              <History size={20} className="text-gray-400" />
              <span className="text-gray-400">扫描历史</span>
            </div>
            <div className="space-y-2">
              {history.map((item, index) => (
                <div key={index} className="bg-gray-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                      <Package size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">{item.barcode}</p>
                      <p className="text-xs text-gray-500">{item.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanPage;