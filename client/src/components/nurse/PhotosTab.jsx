import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Upload, Trash2, X } from 'lucide-react';
import { formatTimeIST } from '../../utils/date';
import api, { getAssetUrl } from '../../api/client';

export default function PhotosTab({ patientId, selectedDate, photos = [], onRefresh, showToast }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('meal');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({ type: 'error', message: 'Please select a valid image file (JPEG, PNG, WebP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({ type: 'error', message: 'Image size must be less than 5MB.' });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast({ type: 'error', message: 'Please select a photo to upload.' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      formData.append('caption', caption.trim());
      formData.append('category', category);
      formData.append('logged_at', `${selectedDate}T${new Date().toISOString().split('T')[1]}`);

      await api.post(`/patients/${patientId}/photos`, formData);
      showToast({ type: 'success', message: 'Care photo uploaded successfully!' });
      clearSelection();
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to upload photo' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await api.delete(`/patients/${patientId}/photos/${id}`);
      showToast({ type: 'success', message: 'Photo deleted' });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to delete' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center space-x-2">
          <Camera className="w-5 h-5 text-teal-600" />
          <span>Upload Care Photo (Meal or Activity)</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Visual photo updates help families living in other cities stay connected with their loved one's day.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Category selection */}
          <div className="flex space-x-2">
            {[
              { id: 'meal', label: 'Meal / Nutrition' },
              { id: 'activity', label: 'Activity / Physio' },
              { id: 'general', label: 'General / Well-being' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition ${
                  category === cat.id
                    ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* File Picker or Preview */}
          {!previewUrl ? (
            <label className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-teal-50/20 transition">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-xs font-bold text-slate-700">Tap to Choose or Take Photo</span>
              <span className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WebP up to 5MB</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-w-sm mx-auto">
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
              <button
                type="button"
                onClick={clearSelection}
                className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black text-white rounded-full transition"
                title="Cancel image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {previewUrl && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Photo Caption
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Enjoying fresh khichdi at lunch / Morning walker exercises"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-40 transition shadow-sm"
          >
            {uploading ? 'Uploading...' : 'Save & Attach Photo to Timeline'}
          </button>
        </form>
      </div>

      {/* Logged Photos for this date */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span>Photos Attached for {selectedDate}</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </span>
        </h4>

        {photos.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">
            No care photos attached for this date yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="relative rounded-xl overflow-hidden border border-slate-200 group bg-slate-50">
                <img src={getAssetUrl(p.file_path)} alt={p.caption || 'Care photo'} className="w-full h-32 object-cover" />
                <div className="p-2">
                  <div className="text-[11px] font-bold text-slate-800 truncate">
                    {p.caption || `${p.category} photo`}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatTimeIST(p.logged_at)}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-lg transition opacity-0 group-hover:opacity-100"
                  title="Delete photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

