import { useState, useEffect } from 'react';
import { photosAPI, personsAPI } from '../services/api';
import { Image, Users, Upload, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({ photos: 0, persons: 0 });
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  useEffect(() => {
    Promise.all([photosAPI.getAll(), personsAPI.getAll()])
      .then(([photosRes, personsRes]) => {
        setStats({ photos: photosRes.data.length, persons: personsRes.data.length });
        setRecentPhotos(photosRes.data.slice(0, 6));
      }).catch(console.error);
  }, []);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setUploading(true);
    setUploadMsg('Processing with AI...');
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    try {
      const res = await photosAPI.upload(formData);
      setUploadMsg(`✅ Uploaded ${res.data.uploaded} photos!`);
      const photosRes = await photosAPI.getAll();
      const personsRes = await personsAPI.getAll();
      setStats({ photos: photosRes.data.length, persons: personsRes.data.length });
      setRecentPhotos(photosRes.data.slice(0, 6));
    } catch (err) {
      setUploadMsg('❌ Upload failed. Try again.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMsg(''), 3000);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome to your AI photo assistant</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Photos', value: stats.photos, icon: Image, color: 'bg-blue-500/20 text-blue-400' },
          { label: 'People Recognized', value: stats.persons, icon: Users, color: 'bg-green-500/20 text-green-400' },
          { label: 'AI Powered', value: '100%', icon: Zap, color: 'bg-purple-500/20 text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
              <Icon size={24} />
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Upload</h2>
        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploading ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-purple-500'}`}>
          <Upload size={24} className="text-gray-500 mb-2" />
          <span className="text-gray-400 text-sm">{uploadMsg || 'Drop photos here or click to upload'}</span>
          <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {recentPhotos.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Photos</h2>
            <Link to="/gallery" className="text-purple-400 hover:text-purple-300 text-sm">View all →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentPhotos.map(photo => (
              <div key={photo.id} className="aspect-square bg-gray-800 rounded-xl overflow-hidden">
                <img src={photosAPI.getFileUrl(photo.filename)} alt={photo.original_name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
