'use client';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { MeasurementInput, ReferenceObjectType } from '@/types/photo-to-room';
import { REFERENCE_OBJECTS } from '@/types/photo-to-room';
import type { LengthUnit } from '@/types/venue';

interface MeasurementFormProps {
  measurements: MeasurementInput;
  onUpdate: (field: string, value: unknown) => void;
  onSkip: () => void;
  onNext: () => void;
}

export default function MeasurementForm({ measurements, onUpdate, onSkip, onNext }: MeasurementFormProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Providing measurements improves accuracy. You can skip this step.
      </p>

      {/* Unit toggle */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
        <div className="flex gap-1">
          {(['ft', 'm'] as LengthUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => onUpdate('unit', u)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                measurements.unit === u
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {u === 'ft' ? 'Feet' : 'Meters'}
            </button>
          ))}
        </div>
      </div>

      {/* Room dimensions */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Room width ({measurements.unit})
          </label>
          <Input
            type="number"
            placeholder="Optional"
            value={measurements.roomWidth ?? ''}
            onChange={(e) => onUpdate('roomWidth', e.target.value ? Number(e.target.value) : null)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Room length ({measurements.unit})
          </label>
          <Input
            type="number"
            placeholder="Optional"
            value={measurements.roomLength ?? ''}
            onChange={(e) => onUpdate('roomLength', e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>

      {/* Reference object */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Reference object (visible in photos)
        </label>
        <select
          value={measurements.referenceObject ?? ''}
          onChange={(e) => onUpdate('referenceObject', e.target.value || null)}
          className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">None</option>
          {REFERENCE_OBJECTS.map((ref) => (
            <option key={ref.type} value={ref.type}>
              {ref.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onSkip}>
          Skip
        </Button>
        <Button variant="primary" onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
