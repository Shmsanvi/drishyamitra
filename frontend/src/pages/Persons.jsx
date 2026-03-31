import { useState, useEffect } from 'react';
import { personsAPI, photosAPI } from '../services/api';
import { Users, Trash2 } from 'lucide-react';

export default function Persons() {
  const [persons, setPersons] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personPhotos, setPersonPhotos] = useState([]);

  useEffect(() => {
    personsAPI.getAll().then(r => setPersons(r.data)).catch(console.error);
  }, []);

  const handleSelectPerson = async (person) => {
    setSelectedPerson(person);
    const res = await photosAPI.getAll({ person: person.name });
    setPersonPhotos(res.data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this person and all their labels?')) return;
    await personsAPI.delete(id);
    setPersons(persons.filter(p => p.id !== id));
    if (selectedPerson?.id === id) {
      setSelectedPerson(null);
      setPersonPhotos([]);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">People</h1>
        <p className="text-gray-400 mt-1">{persons.length} people recognized</p>
      </div>

      {persons.length === 0 ? (
        <div className="text-center py-20">
          <Users size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No people labeled yet.</p>
          <p className="text-gray-600 text-sm mt-2">Go to Gallery, click a photo, and label a face!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {persons.map(person => (
              <div key={person.id}
                onClick={() => handleSelectPerson(person)}
                className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${selectedPerson?.id === person.id ? 'bg-purple-600/20 border-purple-500' : 'bg-gray-900 border-gray-800 hover:border-gray-600'}`}
              >
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {person.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{person.name}</p>
                  <p className="text-gray-400 text-sm">{person.photo_count} photos</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedPerson ? (
              <>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Photos of {selectedPerson.name} ({personPhotos.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {personPhotos.map(photo => (
                    <div key={photo.id} className="aspect-square bg-gray-800 rounded-xl overflow-hidden">
                      <img src={photosAPI.getFileUrl(photo.filename)} alt={photo.original_name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Select a person to see their photos</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
