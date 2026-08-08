import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { listTags, createTag, setUserTags } from '@/apis/admin.api';
import type { DerivedTag, Tag } from '@/types';
import { TagChip } from './tag-chip';
import { Button } from '@/components/ui/button';

/**
 * The tag row on a customer.
 *
 * Manual tags are editable; derived ones are rendered dashed and without a
 * remove control, because they are computed and would simply come back. The
 * distinction is worth showing rather than hiding — an admin who tries to
 * remove "Never topped up" should be able to see why they cannot.
 */
export function UserTagsEditor({
  userId,
  tags,
  derivedTags,
}: {
  userId: string;
  tags: Tag[];
  derivedTags: DerivedTag[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const all = useQuery({
    queryKey: ['admin', 'tags'],
    queryFn: listTags,
    enabled: open,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] });
  };

  const save = useMutation({
    mutationFn: (tagIds: string[]) => setUserTags(userId, tagIds),
    onSuccess: invalidate,
  });

  const create = useMutation({
    mutationFn: () => createTag({ name: newName.trim() }),
    onSuccess: async (tag) => {
      setNewName('');
      await qc.invalidateQueries({ queryKey: ['admin', 'tags'] });
      // Attach it immediately: creating a tag from this row always means
      // wanting it on this customer.
      save.mutate([...tags.map((t) => t.id), tag.id]);
    },
  });

  const applied = new Set(tags.map((t) => t.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <TagChip
            key={t.id}
            label={t.name}
            colour={t.colour}
            title={t.description ?? undefined}
            onRemove={() =>
              save.mutate(tags.filter((x) => x.id !== t.id).map((x) => x.id))
            }
          />
        ))}
        {derivedTags.map((d) => (
          <TagChip
            key={d.key}
            label={d.label}
            colour={d.colour}
            derived
            title="Calculated automatically — cannot be removed"
          />
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
        >
          <Plus className="size-3" />
          Tag
        </button>
      </div>

      {open && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Apply tags
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {all.isLoading && (
              <span className="text-[11px] text-muted-foreground">Loading…</span>
            )}
            {all.data?.length === 0 && (
              <span className="text-[11px] text-muted-foreground">
                No tags yet — create one below.
              </span>
            )}
            {all.data?.map((t) => {
              const on = applied.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    save.mutate(
                      on
                        ? tags.filter((x) => x.id !== t.id).map((x) => x.id)
                        : [...tags.map((x) => x.id), t.id],
                    )
                  }
                  className={on ? '' : 'opacity-40 hover:opacity-80'}
                >
                  <TagChip label={t.name} colour={t.colour} />
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && newName.trim().length >= 2 && create.mutate()
              }
              placeholder="New tag name"
              maxLength={40}
              className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
            />
            <Button
              onClick={() => create.mutate()}
              disabled={newName.trim().length < 2 || create.isPending}
              className="h-8"
            >
              Create
            </Button>
          </div>
          {create.isError && (
            <p className="mt-1.5 text-[10px] text-red-600">
              Could not create — that name may already exist.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
