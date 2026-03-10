import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, ArrowRight, Loader2, X } from 'lucide-react';
import type { SubmitKycPayload } from '@/apis/onboarding.api';

interface Props {
  onSubmit: (payload: SubmitKycPayload) => void;
  isSubmitting: boolean;
}

export function BusinessDetailsStep({ onSubmit, isSubmitting }: Props) {
  const [form, setForm] = useState({
    businessName: '',
    pan: '',
    gstin: '',
    businessAddress: '',
    websiteUrl: '',
  });
  const [document, setDocument] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValid =
    form.businessName.trim() &&
    form.pan.trim() &&
    form.businessAddress.trim() &&
    document;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !document) return;
    onSubmit({ ...form, document });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Business Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit your business information for KYC verification
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">
            Business Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            placeholder="Your Business Pvt Ltd"
            value={form.businessName}
            onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            PAN <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            placeholder="ABCDE1234F"
            value={form.pan}
            onChange={(e) =>
              setForm((f) => ({ ...f, pan: e.target.value.toUpperCase().slice(0, 10) }))
            }
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">GSTIN (optional)</label>
          <input
            type="text"
            placeholder="22ABCDE1234F1Z5"
            value={form.gstin}
            onChange={(e) =>
              setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase().slice(0, 15) }))
            }
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">
            Business Address <span className="text-destructive">*</span>
          </label>
          <textarea
            placeholder="Full address with city, state, and PIN code"
            value={form.businessAddress}
            onChange={(e) => setForm((f) => ({ ...f, businessAddress: e.target.value }))}
            className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Website URL (optional)</label>
          <input
            type="url"
            placeholder="https://yourbusiness.com"
            value={form.websiteUrl}
            onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Document upload */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">
            KYC Document <span className="text-destructive">*</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Upload business registration, PAN card, or GSTIN certificate (PDF, JPG, PNG - max 5MB)
          </p>

          {document ? (
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Upload className="size-5 text-primary" />
              <span className="flex-1 truncate text-sm">{document.name}</span>
              <button
                type="button"
                onClick={() => {
                  setDocument(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="rounded-md p-1 hover:bg-muted"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Upload className="size-5" />
              Click to upload document
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>
      </div>

      <Button size="lg" disabled={!isValid || isSubmitting} className="w-full">
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            Submit for Review
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}
