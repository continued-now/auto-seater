'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { MeasurementInput, ReferenceObjectType, ReferenceDimension, CapturedPhoto } from '@/types/photo-to-room';
import { REFERENCE_OBJECTS } from '@/types/photo-to-room';
import type { LengthUnit } from '@/types/venue';

/** Legacy measurement form for upload flow */
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

/** Reference measurement form for camera capture flow */
interface ReferenceMeasureFormProps {
  referencePhoto: CapturedPhoto;
  unit: LengthUnit;
  onBack: () => void;
  onNext: (dim: ReferenceDimension) => void;
}

export function ReferenceMeasureForm({ referencePhoto, unit, onBack, onNext }: ReferenceMeasureFormProps) {
  const [selectedType, setSelectedType] = useState<ReferenceObjectType | 'custom' | ''>('');
  const [customValue, setCustomValue] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<LengthUnit>(unit);

  const handleNext = () => {
    if (selectedType === 'custom') {
      const val = parseFloat(customValue);
      if (isNaN(val) || val <= 0) return;
      onNext({ type: 'custom', value: val, unit: selectedUnit });
    } else if (selectedType) {
      const ref = REFERENCE_OBJECTS.find((r) => r.type === selectedType);
      if (!ref) return;
      onNext({ type: selectedType, value: ref.knownSize, unit: 'ft' });
    }
  };

  const isValid =
    selectedType === 'custom'
      ? customValue !== '' && parseFloat(customValue) > 0
      : selectedType !== '';

  return (
    <div className="space-y-4">
      {/* Reference photo preview */}
      <div className="flex gap-3 items-start">
        <img
          src={referencePhoto.preview}
          alt="Reference object"
          className="w-24 h-18 object-cover rounded-lg border border-slate-200 shrink-0"
        />
        <div>
          <p className="text-sm font-medium text-slate-700">What is this object?</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a known object or enter a custom measurement.
          </p>
        </div>
      </div>

      {/* Object type select */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Object type</label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as ReferenceObjectType | 'custom' | '')}
          className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Select...</option>
          {REFERENCE_OBJECTS.map((ref) => (
            <option key={ref.type} value={ref.type}>
              {ref.label}
            </option>
          ))}
          <option value="custom">Custom measurement</option>
        </select>
      </div>

      {/* Custom measurement input */}
      {selectedType === 'custom' && (
        <div className="space-y-2">
          <div className="flex gap-1.5 mb-2">
            {(['ft', 'm'] as LengthUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setSelectedUnit(u)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  selectedUnit === u
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {u === 'ft' ? 'Feet' : 'Meters'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Size ({selectedUnit})
            </label>
            <Input
              type="number"
              placeholder={`e.g. ${selectedUnit === 'ft' ? '3' : '0.9'}`}
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Enter the width or height of the object you photographed
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" disabled={!isValid} onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
