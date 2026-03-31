import { useState, useEffect } from 'react';
import { photosAPI, personsAPI } from '../services/api';
import { Trash2, User, Search } from 'lucide-react';

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [persons, setPersons] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [labelNames, setLabelNames] = useState({});
  const [labelMsg, setLabelMsg] = useState('');
 

  useEffect(() => {
    loadPhotos();
    personsAPI.getAll().then(r => setPersons(r.data)).catch(console.error);
  }, []);

  const loadPhotos = (person = '') => {
    const params = person ? { person } : {};
    photosAPI.getAll(params).then(r => setPhotos(r.data)).catch(console.error);
  };

  const handleFilter = (e) => {
    setFilter(e.target.value);
    loadPhotos(e.target.value);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this photo?')) return;
    await photosAPI.delete(id);
    setPhotos(photos.filter(p => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const handleSelectPhoto = (photo) => {
    if (selected?.id === photo.id) {
      setSelected(null);
      setFaces([]);
      return;
    }
    setSelected(photo);
    // Create face slots based on faces_detected count
    const faceCount = photo.faces_detected || 1;
    const initialNames = {};
    for (let i = 0; i < faceCount; i++) {
      initialNames[i] = '';
    }
    setLabelNames(initialNames);
    setLabelMsg('');
  };

  const handleLabel = async (faceIndex) => {
    const name = labelNames[faceIndex];
    if (!name?.trim() || !selected) return;
    try {
      await personsAPI.label({ 
        name: name.trim(), 
        photo_id: selected.id,
        face_index: faceIndex
      });
      setLabelMsg(`✅ Face ${faceIndex + 1} labeled as ${name}!`);
      setLabelNames(prev => ({ ...prev, [faceIndex]: '' }));
      loadPhotos(filter);
      personsAPI.getAll().then(r => setPersons(r.data));
      setTimeout(() => setLabelMsg(''), 3000);
    } catch (err) {
      setLabelMsg('❌ ' + (err.response?.data?.error || 'Failed to label'));
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Gallery</h1>
        <p className="text-gray-400 mt-1">{photos.length} photos</p>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={filter} onChange={handleFilter}
            placeholder="Filter by person name..."
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-purple-500 text-sm"
          />
        </div>
        {persons.map(p => (
          <button key={p.id} onClick={() => { setFilter(p.name); loadPhotos(p.name); }}
            className="px-4 py-2 bg-gray-800 hover:bg-purple-600 text-gray-300 hover:text-white rounded-xl text-sm transition-colors">
            {p.name}
          </button>
        ))}
        {filter && (
          <button onClick={() => { setFilter(''); loadPhotos(''); }}
            className="px-4 py-2 bg-gray-800 text-gray-400 rounded-xl text-sm hover:bg-gray-700">
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {photos.map(photo => (
          <div key={photo.id}
            className={`group relative aspect-square bg-gray-800 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selected?.id === photo.id ? 'border-purple-500' : 'border-transparent'}`}
            onClick={() => handleSelectPhoto(photo)}
          >
            <img src={photosAPI.getFileUrl(photo.filename)} alt={photo.original_name}
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
              <button onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                className="self-end bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg">
                <Trash2 size={14} />
              </button>
              {photo.persons?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {photo.persons.map(name => (
                    <span key={name} className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">{name}</span>
                  ))}
                </div>
              )}
            </div>
            {photo.faces_detected > 0 && (
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                {photo.faces_detected} face{photo.faces_detected > 1 ? 's' : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
            <img src={photosAPI.getFileUrl(selected.filename)} alt="" className="w-full rounded-xl mb-4 max-h-64 object-cover" />
            <p className="text-white font-medium mb-1">{selected.original_name}</p>
            <p className="text-gray-400 text-sm mb-4">
              {selected.faces_detected} face{selected.faces_detected > 1 ? 's' : ''} detected
              {selected.persons?.length > 0 && ` • Tagged: ${selected.persons.join(', ')}`}
            </p>

            {/* Label each face separately */}
            <div className="space-y-3">
              {Object.keys(labelNames).map(i => (
                <div key={i}>
                  <p className="text-gray-400 text-xs mb-1">Face {parseInt(i) + 1}</p>
                  <div className="flex gap-2">
                    <input 
                      value={labelNames[i]} 
                      onChange={e => setLabelNames(prev => ({ ...prev, [i]: e.target.value }))}
                      placeholder={`Label face ${parseInt(i) + 1} as...`}
                      className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                      onKeyDown={e => e.key === 'Enter' && handleLabel(parseInt(i))}
                    />
                    <button onClick={() => handleLabel(parseInt(i))}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-1">
                      <User size={14} /> Label
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {labelMsg && <p className="text-sm text-green-400 mt-3">{labelMsg}</p>}
          </div>
        </div>
      )}

      {photos.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No photos yet. Upload some from the Dashboard!</p>
        </div>
      )}
    </div>
  );
}