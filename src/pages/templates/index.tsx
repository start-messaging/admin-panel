import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getTemplates, deleteTemplate } from '@/apis/admin.api';
import type { TemplateListParams } from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'pending_review' | 'approved' | 'rejected' | 'draft';

const TEMPLATE_STATUS_TONE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export function TemplatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<FilterTab>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const limit = 20;

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      toast.success('Template deleted');
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
      setDeletingId(null);
    },
  });

  function buildParams(): TemplateListParams {
    const params: TemplateListParams = { page, limit };
    if (tab !== 'all') params.status = tab;
    return params;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'templates', page, tab],
    queryFn: () => getTemplates(buildParams()),
  });

  const templates = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination ? pagination.totalPages : 0;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending_review', label: 'Pending review' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'draft', label: 'Draft' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pagination
              ? `${pagination.totalItems} total templates`
              : 'Manage OTP message templates'}
          </p>
        </div>
        <Link to={ROUTES.TEMPLATE_CREATE}>
          <Button size="sm">
            <Plus className="size-4" />
            Create Template
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
          <FileText className="mb-2 size-10 opacity-40" />
          <p className="text-sm">No templates found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  Channel
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Language
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr
                  key={template.id}
                  className="border-b last:border-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/templates/${template.id}`}
                      className="font-medium hover:underline"
                    >
                      {template.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground max-w-xs">
                      {template.body}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {template.channel?.displayName ?? '—'}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        TEMPLATE_STATUS_TONE[template.status],
                      )}
                    >
                      {template.status.replace('_', ' ')}
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {template.userId
                        ? (template.user?.email ?? 'customer')
                        : 'system'}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {template.language ?? '—'}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {new Date(template.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => navigate(`/templates/${template.id}`)}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        disabled={
                          deleteMutation.isPending && deletingId === template.id
                        }
                        onClick={() => setDeletingId(template.id)}
                      >
                        {deleteMutation.isPending &&
                        deletingId === template.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Are you sure you want to delete this template?
          </p>
          <p className="mt-1 text-sm text-red-600">
            This action cannot be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deletingId)}
            >
              {deleteMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Yes, delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({pagination?.totalItems} total)
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
