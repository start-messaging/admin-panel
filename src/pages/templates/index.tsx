import { useState } from 'react';
import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Edit2, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getTemplates, deleteTemplate } from '@/apis/admin.api';
import type { TemplateListParams } from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { adminQueryKeys } from '@/hooks/admin';
import {
  enumParam,
  numberParam,
  stringParam,
  useUrlFilters,
} from '@/hooks/useUrlFilters';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const FILTER_TABS = ['all', 'draft', 'published'] as const;

type FilterTab = (typeof FILTER_TABS)[number];

const TEMPLATE_SORT_OPTIONS = [
  'created_at',
  'updated_at',
  'name',
  'status',
] as const;

/** Module-level so `useUrlFilters` can memoise on a stable identity. */
const TEMPLATE_FILTER_SCHEMA = {
  page: numberParam(1),
  limit: numberParam(20),
  status: enumParam(FILTER_TABS, 'all'),
  search: stringParam(''),
  sortBy: enumParam(TEMPLATE_SORT_OPTIONS, 'created_at'),
  sortOrder: enumParam(['ASC', 'DESC'] as const, 'DESC'),
} as const;

export function TemplatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { filters, setFilters } = useUrlFilters(TEMPLATE_FILTER_SCHEMA);
  const tab = filters.status;

  // Uncontrolled between submissions so searching does not fire a request per
  // keystroke.
  const [searchInput, setSearchInput] = useState(filters.search);

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

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: adminQueryKeys.templates(filters),
    queryFn: () =>
      getTemplates({
        page: filters.page,
        limit: filters.limit,
        status: tab === 'all' ? undefined : tab,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      } satisfies TemplateListParams),
    placeholderData: keepPreviousData,
  });

  const templates = data?.data ?? [];
  const pagination = data?.pagination;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'published', label: 'Published' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pagination ? `${pagination.totalItems} total templates` : 'Manage OTP message templates'}
          </p>
        </div>
        <Link to={ROUTES.TEMPLATE_CREATE}>
          <Button size="sm">
            <Plus className="size-4" />
            Create Template
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilters({ status: key })}
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

        <div className="flex items-center gap-2">
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Search name or body…"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-64"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setFilters({ search: searchInput.trim() });
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => setFilters({ search: searchInput.trim() })}
          >
            Search
          </Button>
        </div>

        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={`${filters.sortBy}:${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split(':');
            setFilters({
              sortBy: sortBy as (typeof TEMPLATE_SORT_OPTIONS)[number],
              sortOrder: sortOrder as 'ASC' | 'DESC',
            });
          }}
        >
          <option value="created_at:DESC">Newest first</option>
          <option value="created_at:ASC">Oldest first</option>
          <option value="updated_at:DESC">Recently updated</option>
          <option value="name:ASC">Name: A → Z</option>
          <option value="name:DESC">Name: Z → A</option>
          <option value="status:ASC">Status</option>
        </select>
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
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
                        disabled={deleteMutation.isPending && deletingId === template.id}
                        onClick={() => setDeletingId(template.id)}
                      >
                        {deleteMutation.isPending && deletingId === template.id ? (
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
          <p className="mt-1 text-sm text-red-600">This action cannot be undone.</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deletingId)}
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Yes, delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Pagination
        pagination={pagination}
        onPageChange={(page) => setFilters({ page }, { keepPage: true })}
        onLimitChange={(limit) => setFilters({ limit })}
        isLoading={isPlaceholderData}
        itemLabel="templates"
      />
    </div>
  );
}
