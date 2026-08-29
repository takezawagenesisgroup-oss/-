'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FACILITY_TYPE_LABELS } from '@/lib/labels';
import type { MetaResponse } from '@/lib/types';
import PhotoCapture from '@/components/PhotoCapture';
import VoiceRecorder from '@/components/VoiceRecorder';
import ItemPicker from '@/components/ItemPicker';
import VehiclePicker from '@/components/VehiclePicker';

type SimilarRecord = { id: number; title: string; work_date: string; facility_name: string };

const TOTAL_STEPS = 7;

function RegisterWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [facilityId, setFacilityId] = useState<number | null>(
    searchParams.get('facility_id') ? Number(searchParams.get('facility_id')) : null
  );
  const [troubleTypeId, setTroubleTypeId] = useState<number | null>(null);
  const [parentId, setParentId] = useState<number | null>(null);
  const [similarRecords, setSimilarRecords] = useState<SimilarRecord[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [transcript, setTranscript] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<number>>(new Set());
  const [suggestedItemIds, setSuggestedItemIds] = useState<Set<number>>(new Set());
  const [suggestedVehicleIds, setSuggestedVehicleIds] = useState<Set<number>>(new Set());
  const [title, setTitle] = useState('');
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');

  useEffect(() => {
    fetch('/api/meta')
      .then((r) => r.json())
      .then((data: MetaResponse) => {
        setMeta(data);
        if (data.me) setAssigneeId(data.me.id);
      });
  }, []);

  useEffect(() => {
    if (!facilityId && !troubleTypeId) return;
    const qs = new URLSearchParams();
    if (facilityId) qs.set('facility_id', String(facilityId));
    if (troubleTypeId) qs.set('trouble_type_id', String(troubleTypeId));
    fetch(`/api/records?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => setSimilarRecords(data.records || []));
  }, [facilityId, troubleTypeId]);

  useEffect(() => {
    if (!meta || !transcript) return;
    const found = new Set<number>();
    for (const item of meta.items) {
      if (transcript.includes(item.name)) found.add(item.id);
    }
    const foundV = new Set<number>();
    for (const v of meta.vehicles) {
      if (transcript.includes(v.name)) foundV.add(v.id);
    }
    setSuggestedItemIds(found);
    setSuggestedVehicleIds(foundV);
    setSelectedItemIds((prev) => new Set([...prev, ...found]));
    setSelectedVehicleIds((prev) => new Set([...prev, ...foundV]));
  }, [transcript, meta]);

  const facility = meta?.facilities.find((f) => f.id === facilityId) || null;
  const trouble = meta?.troubleTypes.find((t) => t.id === troubleTypeId) || null;

  useEffect(() => {
    if (facility && trouble && !title) {
      setTitle(`${facility.name}：${trouble.name}`);
    }
  }, [facility, trouble, title]);

  const groupedFacilities = useMemo(() => {
    const map = new Map<string, NonNullable<typeof meta>['facilities']>();
    if (!meta) return map;
    for (const f of meta.facilities) {
      if (!map.has(f.type)) map.set(f.type, []);
      map.get(f.type)!.push(f);
    }
    return map;
  }, [meta]);

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
    if (parentId) form.set('parent_id', String(parentId));
    form.set('title', title);
    form.set('description', transcript);
    form.set('raw_transcript', transcript);
    form.set('work_date', workDate);
    if (assigneeId) form.set('assignee_id', String(assigneeId));
    if (durationMinutes !== '') form.set('duration_minutes', String(durationMinutes));
    form.set('item_ids', JSON.stringify([...selectedItemIds]));
    form.set('vehicle_ids', JSON.stringify([...selectedVehicleIds]));
    for (const photo of photos) form.append('photos', photo);

    const res = await fetch('/api/records', { method: 'POST', body: form });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/records/${data.id}?saved=1`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '保存に失敗しました');
    }
  }

  if (!meta) {
    return <p className="text-xl text-center py-10">読み込み中…</p>;
  }

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">📝 作業の登録</h1>
        <span className="text-lg text-gray-500">ステップ {step} / {TOTAL_STEPS}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div
          className="bg-brand-500 h-3 rounded-full transition-all"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {step === 1 && (
        <StepWrap title="① どの施設ですか？">
          {[...groupedFacilities.entries()].map(([type, list]) => {
            const meta2 = FACILITY_TYPE_LABELS[type] ?? { label: type, icon: '🏢' };
            return (
              <div key={type} className="mb-5">
                <h3 className="font-bold text-lg mb-2">
                  {meta2.icon} {meta2.label}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {list.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFacilityId(f.id)}
                      className={`icon-tile ${facilityId === f.id ? 'selected' : ''}`}
                    >
                      <span className="text-3xl">{f.icon}</span>
                      <span>{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </StepWrap>
      )}

      {step === 2 && (
        <StepWrap title="② どんな作業でしたか？">
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
        </StepWrap>
      )}

      {step === 3 && (
        <StepWrap title="③ 似た作業はありますか？（任意）">
          <p className="text-lg text-gray-500 mb-3">
            関連する過去の作業があれば選んでください。ツリー形式でまとめて見られるようになります。
          </p>
          {similarRecords.length === 0 ? (
            <p className="text-lg text-gray-400 mb-3">似た作業は見つかりませんでした。</p>
          ) : (
            <div className="space-y-2 mb-3">
              {similarRecords.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setParentId(parentId === r.id ? null : r.id)}
                  className={`card w-full text-left p-4 ${parentId === r.id ? 'border-brand-500 border-2' : ''}`}
                >
                  <span className="font-bold text-lg">{r.title}</span>
                  <span className="block text-base text-gray-500">
                    {r.facility_name} ／ {r.work_date}
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setParentId(null)}
            className="text-lg text-brand-700 font-bold underline"
          >
            関連付けなくてよい（なし）
          </button>
        </StepWrap>
      )}

      {step === 4 && (
        <StepWrap title="④ 写真をとってください">
          <PhotoCapture photos={photos} onChange={setPhotos} />
        </StepWrap>
      )}

      {step === 5 && (
        <StepWrap title="⑤ 音声で作業内容を伝えてください">
          <VoiceRecorder value={transcript} onChange={setTranscript} />
        </StepWrap>
      )}

      {step === 6 && (
        <StepWrap title="⑥ 使った道具・車両を確認してください">
          <p className="text-lg text-gray-500 mb-3">
            音声から自動で見つかった道具にはチェックが付いています。タップで追加・解除できます。
          </p>
          <ItemPicker
            items={meta.items}
            selectedIds={selectedItemIds}
            suggestedIds={suggestedItemIds}
            onToggle={toggleItem}
          />
          <h3 className="font-bold text-lg mt-6 mb-2">🚚 使った車両</h3>
          <VehiclePicker
            vehicles={meta.vehicles}
            selectedIds={selectedVehicleIds}
            suggestedIds={suggestedVehicleIds}
            onToggle={toggleVehicle}
          />
        </StepWrap>
      )}

      {step === 7 && (
        <StepWrap title="⑦ 最後に確認して保存してください">
          <div className="space-y-4">
            <div>
              <label className="block text-lg font-bold mb-1">タイトル</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                  placeholder="例：90"
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
            <div className="card p-4">
              <p className="font-bold text-lg mb-1">施設・作業内容</p>
              <p className="text-lg">
                {facility?.icon} {facility?.name} ／ {trouble?.icon} {trouble?.name}
              </p>
              {parentId && <p className="text-base text-gray-500 mt-1">関連作業ID: {parentId}</p>}
              <p className="font-bold text-lg mt-3 mb-1">メモ</p>
              <p className="text-base whitespace-pre-wrap">{transcript || '(なし)'}</p>
              <p className="font-bold text-lg mt-3 mb-1">写真</p>
              <p className="text-base">{photos.length} 枚</p>
              <p className="font-bold text-lg mt-3 mb-1">道具・車両</p>
              <p className="text-base">
                道具 {selectedItemIds.size} 点／車両 {selectedVehicleIds.size} 台
              </p>
            </div>
            {error && <p className="text-red-600 font-bold text-lg">{error}</p>}
          </div>
        </StepWrap>
      )}

      <div className="flex justify-between mt-8 gap-4">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className="big-btn bg-gray-200 flex-1 disabled:opacity-40"
        >
          ← もどる
        </button>
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            disabled={(step === 1 && !facilityId) || (step === 2 && !troubleTypeId)}
            onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
            className="big-btn bg-brand-600 text-white flex-1 disabled:opacity-40"
          >
            つぎへ →
          </button>
        ) : (
          <button
            type="button"
            disabled={saving || !title}
            onClick={handleSave}
            className="big-btn bg-brand-600 text-white flex-1 disabled:opacity-40"
          >
            {saving ? '保存中…' : '✅ 保存する'}
          </button>
        )}
      </div>
    </div>
  );
}

function StepWrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-xl text-center py-10">読み込み中…</p>}>
      <RegisterWizard />
    </Suspense>
  );
}
