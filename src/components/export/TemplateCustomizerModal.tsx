import React, { useState } from 'react';
import type { PrintTemplateCustomization } from '../../models/templateConfig';
import { DEFAULT_TEMPLATE_CONFIG } from '../../models/templateConfig';
import { Button } from '../ui/Button';
import { X, Upload, RotateCcw, Check, Sparkles, Building2 } from 'lucide-react';

export type TemplateCustomizerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  config: PrintTemplateCustomization;
  onSave: (config: PrintTemplateCustomization) => void;
};

export const TemplateCustomizerModal: React.FC<TemplateCustomizerModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [form, setForm] = useState<PrintTemplateCustomization>({ ...config });
  const [logoPreview, setLogoPreview] = useState<string>(config.logoUrl || '');

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setForm((prev) => ({ ...prev, logoUrl: result, showLogo: true }));
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setForm({ ...DEFAULT_TEMPLATE_CONFIG });
    setLogoPreview('');
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Visual Print Template Customizer</h3>
              <p className="text-xs text-slate-500">Configure institutional headers, logos, signatures, and layout geometry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-y-auto p-6 gap-6">
          {/* Controls Column */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Institutional Identity & Header
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institution / University Name
              </label>
              <input
                type="text"
                value={form.institutionName}
                onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. NATIONAL INSTITUTE OF TECHNOLOGY"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department / Examination Cell Subtitle
              </label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. OFFICE OF THE CONTROLLER OF EXAMINATIONS"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Crest / Logo
              </label>
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <div className="relative w-12 h-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-1 flex items-center justify-center">
                    <img src={logoPreview} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Upload Logo
                  </span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview('');
                      setForm((prev) => ({ ...prev, logoUrl: '', showLogo: false }));
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Header Alignment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Header Layout Alignment
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['center', 'left', 'split'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => setForm({ ...form, headerAlignment: align })}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      form.headerAlignment === align
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-3 border-t border-slate-200">
              2. Signature Block Titles
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Left Signature Title
                </label>
                <input
                  type="text"
                  value={form.signatureLabels.left}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      signatureLabels: { ...form.signatureLabels, left: e.target.value },
                    })
                  }
                  className="w-full text-xs rounded-xl border border-slate-300 px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Right Signature Title
                </label>
                <input
                  type="text"
                  value={form.signatureLabels.right}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      signatureLabels: { ...form.signatureLabels, right: e.target.value },
                    })
                  }
                  className="w-full text-xs rounded-xl border border-slate-300 px-2.5 py-1.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Center Signature Title (Optional)
              </label>
              <input
                type="text"
                value={form.signatureLabels.center || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    signatureLabels: { ...form.signatureLabels, center: e.target.value },
                  })
                }
                className="w-full text-xs rounded-xl border border-slate-300 px-2.5 py-1.5"
                placeholder="e.g. Verified by / Squad In-Charge"
              />
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Live Document Preview
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                A4 Scaled
              </span>
            </div>

            {/* Simulated Sheet Paper */}
            <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-xs text-center space-y-4 font-serif">
              {/* Header preview */}
              <div
                className={`pb-3 border-b border-slate-900 ${
                  form.headerAlignment === 'left'
                    ? 'text-left flex items-center gap-3'
                    : form.headerAlignment === 'split'
                    ? 'flex items-center justify-between text-left'
                    : 'text-center'
                }`}
              >
                {form.showLogo && logoPreview && (
                  <img src={logoPreview} alt="Logo" className="w-10 h-10 object-contain shrink-0 mx-auto mb-1" />
                )}
                <div>
                  <h5 className="font-bold text-sm text-slate-900 tracking-wide uppercase">
                    {form.institutionName || 'INSTITUTION NAME'}
                  </h5>
                  <p className="text-[10px] text-slate-700 tracking-wider uppercase mt-0.5">
                    {form.subtitle || 'EXAMINATION CELL'}
                  </p>
                </div>
              </div>

              {/* Sample Table Mock */}
              <div className="border border-slate-800 rounded text-[9px] font-mono">
                <div className="bg-slate-100 border-b border-slate-800 px-2 py-1 font-bold flex justify-between">
                  <span>ROOM / BENCH</span>
                  <span>REGISTER NO.</span>
                  <span>CANDIDATE SIGNATURE</span>
                </div>
                <div className="px-2 py-2 flex justify-between text-slate-600 border-b border-slate-200">
                  <span>Hall 101 / R1-C1</span>
                  <span className="font-bold text-slate-900">2026CS001</span>
                  <span className="text-slate-300 italic">_________________</span>
                </div>
                <div className="px-2 py-2 flex justify-between text-slate-600">
                  <span>Hall 101 / R1-C2</span>
                  <span className="font-bold text-slate-900">2026EC001</span>
                  <span className="text-slate-300 italic">_________________</span>
                </div>
              </div>

              {/* Signature Blocks Preview */}
              <div className="pt-8 flex items-end justify-between text-[10px] font-sans font-semibold text-slate-800">
                <div className="border-t border-slate-400 pt-1 w-28 text-center">
                  <span>{form.signatureLabels.left}</span>
                </div>
                {form.signatureLabels.center && (
                  <div className="border-t border-slate-400 pt-1 w-28 text-center">
                    <span>{form.signatureLabels.center}</span>
                  </div>
                )}
                <div className="border-t border-slate-400 pt-1 w-28 text-center">
                  <span>{form.signatureLabels.right}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic text-center">
              Customizations automatically apply across all 5 official PDF sheets and native browser printouts.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
          <Button variant="ghost" size="sm" onClick={handleReset} className="flex items-center gap-1.5 text-xs text-slate-600">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
              <Check className="w-4 h-4" /> Save Template Styles
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
