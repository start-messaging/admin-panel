import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getChannels, createTemplate } from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/lib/constants';

const PLACEHOLDERS = ['{{otp}}', '{{expiry}}', '{{appName}}'] as const;

const SAMPLE_VALUES: Record<string, string> = {
  '{{otp}}': '483926',
  '{{expiry}}': '5',
  '{{appName}}': 'MyApp',
};

export function TemplateCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [channelId, setChannelId] = useState('');
  const [language, setLanguage] = useState('en');

  const { data: channels } = useQuery({
    queryKey: ['admin', 'channels'],
    queryFn: getChannels,
  });

  const mutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      toast.success('Template created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      navigate(ROUTES.TEMPLATES);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const bodyHasOtp = /\{\{otp\}\}/.test(body);
  const canSubmit = name.trim() && body.trim() && channelId && bodyHasOtp;

  const preview = body
    ? Object.entries(SAMPLE_VALUES).reduce(
        (text, [placeholder, value]) => text.replaceAll(placeholder, value),
        body,
      )
    : '';

  function insertPlaceholder(placeholder: string) {
    setBody((prev) => prev + placeholder);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      name: name.trim(),
      body: body.trim(),
      channelId,
      language: language.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(ROUTES.TEMPLATES)}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Create Template</h1>
          <p className="text-sm text-muted-foreground">
            Create a new OTP message template. New templates are saved as draft — you can publish
            them after review.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-5 rounded-xl border bg-card p-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welcome OTP"
              maxLength={100}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Channel */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Channel</label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a channel</option>
              {channels?.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Your verification code is {{otp}}. Valid for {{expiry}} minutes."
              maxLength={500}
              rows={4}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => insertPlaceholder(p)}
                    className="rounded border bg-muted/50 px-2 py-0.5 text-xs font-mono text-muted-foreground hover:bg-muted transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{body.length}/500</span>
            </div>
            {body && !bodyHasOtp && (
              <p className="text-xs text-red-500">Body must contain {'{{otp}}'} placeholder</p>
            )}
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Language</label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="en"
              maxLength={10}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Submit */}
          <Button type="submit" disabled={!canSubmit || mutation.isPending} className="w-full">
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Create Template
          </Button>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Eye className="size-4 text-muted-foreground" />
              Preview
            </h2>
            {preview ? (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">{name || 'Untitled'}</p>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{preview}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Start typing in the message body to see a preview...
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-2 text-sm font-semibold">Sample Values</h3>
            <div className="space-y-1">
              {Object.entries(SAMPLE_VALUES).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">{key}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
