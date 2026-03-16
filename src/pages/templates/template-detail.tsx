import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Eye,
  Loader2,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getTemplateDetail,
  updateTemplate,
  deleteTemplate,
  publishTemplate,
  unpublishTemplate,
} from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const PLACEHOLDERS = ['{{otp}}', '{{expiry}}', '{{appName}}'] as const;

const SAMPLE_VALUES: Record<string, string> = {
  '{{otp}}': '483926',
  '{{expiry}}': '5',
  '{{appName}}': 'MyApp',
};

function renderPreview(body: string) {
  return Object.entries(SAMPLE_VALUES).reduce(
    (text, [placeholder, value]) => text.replaceAll(placeholder, value),
    body,
  );
}

function highlightPlaceholders(body: string) {
  const parts = body.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) =>
    /^\{\{.+\}\}$/.test(part) ? (
      <span key={i} className="rounded bg-violet-100 px-1 font-mono text-violet-700">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [editTwoFactorTemplate, setEditTwoFactorTemplate] = useState('');
  const [editFast2SmsDltId, setEditFast2SmsDltId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ['admin', 'template', id],
    queryFn: () => getTemplateDetail(id!),
    enabled: !!id,
  });

  const invalidateTemplate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'template', id] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
  };

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateTemplate>[1]) => updateTemplate(id!, data),
    onSuccess: () => {
      toast.success('Template updated');
      setEditing(false);
      invalidateTemplate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => publishTemplate(id!),
    onSuccess: () => {
      toast.success('Template published');
      invalidateTemplate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishTemplate(id!),
    onSuccess: () => {
      toast.success('Template unpublished');
      invalidateTemplate();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTemplate(id!),
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      navigate(ROUTES.TEMPLATES);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  function startEditing() {
    if (!template) return;
    setEditName(template.name);
    setEditBody(template.body);
    setEditLanguage(template.language ?? '');
    setEditTwoFactorTemplate((template.metadata?.['2factor'] as string) ?? '');
    setEditFast2SmsDltId((template.metadata?.fast2sms as string) ?? '');
    setEditing(true);
  }

  function handleSave() {
    const payload: Parameters<typeof updateTemplate>[1] = {};
    if (!template) return;

    if (editName.trim() !== template.name) payload.name = editName.trim();
    if (editBody.trim() !== template.body) payload.body = editBody.trim();
    if ((editLanguage.trim() || null) !== template.language)
      payload.language = editLanguage.trim() || undefined;

    const newMetadata = {
      ...template.metadata,
      '2factor': editTwoFactorTemplate.trim() || undefined,
      fast2sms: editFast2SmsDltId.trim() || undefined,
    };

    if (JSON.stringify(newMetadata) !== JSON.stringify(template.metadata)) {
      payload.metadata = newMetadata;
    }

    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }

    if (payload.body && !/\{\{otp\}\}/.test(payload.body)) {
      toast.error('Body must contain {{otp}} placeholder');
      return;
    }

    updateMutation.mutate(payload);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">Template not found</p>
        <Button variant="link" onClick={() => navigate(ROUTES.TEMPLATES)}>
          Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(ROUTES.TEMPLATES)}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{template.name}</h1>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                template.status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  template.status === 'published' ? 'bg-green-500' : 'bg-amber-500',
                )}
              />
              {template.status === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {template.channel?.displayName} &middot; {template.language ?? '—'} &middot; Created{' '}
            {new Date(template.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {!editing && template.status === 'draft' && (
            <Button
              size="sm"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
              className="bg-green-600 hover:bg-green-700"
            >
              {publishMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Publish
            </Button>
          )}
          {!editing && template.status === 'published' && (
            <Button
              variant="outline"
              size="sm"
              disabled={unpublishMutation.isPending}
              onClick={() => unpublishMutation.mutate()}
            >
              {unpublishMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Unpublish
            </Button>
          )}
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Edit2 className="size-4" />
              Edit
            </Button>
          )}
          {!editing && (
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => setConfirmDelete(true)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Are you sure you want to delete this template?
          </p>
          <p className="mt-1 text-sm text-red-600">This action cannot be undone.</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Yes, delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Template info / Edit form */}
        <div className="rounded-xl border bg-card p-5">
          {editing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Edit Template</h2>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditing(false)}
                    disabled={updateMutation.isPending}
                  >
                    <X className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Message Body</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
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
                        onClick={() => setEditBody((prev) => prev + p)}
                        className="rounded border bg-muted/50 px-2 py-0.5 text-xs font-mono text-muted-foreground hover:bg-muted transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{editBody.length}/500</span>
                </div>
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Language</label>
                <input
                  type="text"
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value)}
                  maxLength={10}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Provider Metadata */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    2Factor Template Name
                  </label>
                  <input
                    type="text"
                    value={editTwoFactorTemplate}
                    onChange={(e) => setEditTwoFactorTemplate(e.target.value)}
                    placeholder="e.g. OTP1"
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    Fast2SMS DLT ID
                  </label>
                  <input
                    type="text"
                    value={editFast2SmsDltId}
                    onChange={(e) => setEditFast2SmsDltId(e.target.value)}
                    placeholder="e.g. 120716..."
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-semibold">Template Body</h2>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {highlightPlaceholders(template.body)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Channel</p>
                  <p className="font-medium">{template.channel?.displayName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Language</p>
                  <p className="font-medium">{template.language ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="font-medium">
                    {new Date(template.updatedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Template ID</p>
                  <p className="truncate font-mono text-xs">{template.id}</p>
                </div>
              </div>

              {/* Display Metadata */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="text-xs font-bold uppercase text-muted-foreground">Provider Settings</h3>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">2Factor Name</p>
                    <p className="mt-0.5 text-sm font-semibold">{(template.metadata?.['2factor'] as string) || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fast2SMS DLT ID</p>
                    <p className="mt-0.5 text-sm font-semibold">{(template.metadata?.fast2sms as string) || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Eye className="size-4 text-muted-foreground" />
            Preview
          </h2>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">{editing ? editName || template.name : template.name}</p>
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {renderPreview(editing ? editBody : template.body)}
            </p>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground">Sample Values</h3>
            {Object.entries(SAMPLE_VALUES).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">{key}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
