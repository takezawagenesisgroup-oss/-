'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { MetaResponse } from '@/lib/types';
import PhotoCapture from '@/components/PhotoCapture';
import ItemPicker from '@/components/ItemPicker';
import VehiclePicker from '@/components/VehiclePicker';

export default function EditRecordPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [troubleTypeId, setTroubleTypeId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<number>>(new Set());
  const [existingPhotos, setExistingPhotos] = useState<{ id: number; filename: string }[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/meta').then((r) => r.json()),
      fetch(`/api/records/${params.id}`).then((r) => r.json()),
    ]).then(([metaData, recordData]) => {
      setMeta(metaData);
      const r = recordData.record;
      setFacilityId(r.facility_id);
      setTroubleTypeId(r.trouble_type_id);
      setTitle(r.title);
      setDescription(r.description || '');
      setWorkDate(r.work_date);
      setAssigneeId(r.assignee_id);
      setDurationMinutes(r.duration_minutes ?? '');
      setSelectedItemIds(new Set(recordData.items.map((i: any) => i.id)));
      setSelectedVehicleIds(new Set(recordData.vehicles.map((v: any) => v.id)));
      setExistingPhotos(recordData.photos);
      setLoaded(true);
    });
  }, [params.id]);

  function toggleItem(id: number) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleVehicle(id: number) {
    setSelectedVehicleIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const form = new FormData();
    form.set('facility_id', String(facilityId));
    if (troubleTypeId) form.set('trouble_type_id', String(troubleTypeId));
    form.set('title', title);
    form.set('description', description);
    form.set('raw_transcript', description);
    form.set('work_date', workDate);
    if (assigneeId) form.set('assignee_id', String(assigneeId));
    if (durationMinutes !== '') form.set('duration_minutes', String(durationMinutes));
    form.set('item_ids', JSON.stringify([...selectedItemIds]));
    form.set('vehicle_ids', JSON.stringify([...selectedVehicleIds]));
    for (const photo of newPhotos) form.append('photos', photo);

    const res = await fetch(`/api/records/${params.id}`, { method: 'PUT', body: form });
    setSaving(false);
    if (res.ok) {
      router.push(`/records/${params.id}`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '保存に失敗しました');
    }
  }

  if (!loaded || !meta) {
    return <p className="text-xl text-center py-10">読み込み中…</p>;
  }

  return (
    <div className="py-4 space-y-6">
      <h1 className="text-2xl font-bold">✏️ 作業記録の修正</h1>

      <div className="card p-5">
        <h2 className="text-xl font-bold mb-3">施設</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {meta.facilities.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFacilityId(f.id)}
              className={`icon-tile ${facilityId === f.id ? 'selected' : ''}`}
            >
              <span className="text-2xl">{f.icon}</span>
              <span className="text-base">{f.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-xl font-bold mb-3">作業内容</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {meta.troubleTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTroubleTypeId(t.id)}
              className={`icon-tile ${troubleTypeId === t.id ? 'selected' : ''}`}
            >
              <span className="text-3xl">{t.icon}</span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-lg font-bold mb-1">タイトル</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg"
          />
        </div>
        <div>
          <label className="block text-lg font-bold mb-1">対処方法・メモ</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-lg font-bold mb-1">作業日</label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg"
            />
          </div>
          <div>
            <label className="block text-lg font-bold mb-1">作業時間（分）</label>
            <input
              type="number"
              min={0}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-lg font-bold mb-1">担当者</label>
          <select
            value={assigneeId ?? ''}
            onChange={(e) => setAssigneeId(Number(e.target.value))}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg"
          >
            {meta.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-xl font-bold mb-3">📷 写真</h2>
        {existingPhotos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {existingPhotos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={`/uploads/${p.filename}`}
                alt="登録済み写真"
                className="rounded-xl border-2 border-gray-200 aspect-square object-cover"
              />
            ))}
          </div>
        )}
        <p className="text-base text-gray-500 mb-2">新しい写真を追加できます</p>
        <PhotoCapture photos={newPhotos} onChange={setNewPhotos} />
      </div>

      <div className="card p-5">
        <h2 className="text-xl font-bold mb-3">🧰 道具・備品</h2>
        <ItemPicker
          items={meta.items}
          selectedIds={selectedItemIds}
          suggestedIds={new Set()}
          onToggle={toggleItem}
        />
        <h3 className="font-bold text-lg mt-6 mb-2">🚚 車両</h3>
        <VehiclePicker
          vehicles={meta.vehicles}
          selectedIds={selectedVehicleIds}
          suggestedIds={new Set()}
          onToggle={toggleVehicle}
        />
      </div>

      {error && <p className="text-red-600 font-bold text-lg">{error}</p>}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="big-btn bg-gray-200 flex-1"
        >
          キャンセル
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="big-btn bg-brand-600 text-white flex-1 disabled:opacity-40"
        >
          {saving ? '保存中…' : '✅ 保存する'}
        </button>
      </div>
    </div>
  );
}
