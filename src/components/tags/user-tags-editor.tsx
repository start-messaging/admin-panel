import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { listTags, createTag, setUserTags } from '@/apis/admin.api';
import type { DerivedTag, Tag } from '@/types';
import { TagChip } from './tag-chip';
import {
  Combobox,
  ComboboxAction,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSearchInput,
  ComboboxTrigger,
} from '@/components/ui/combobox';

/**
 * The tag row on a customer.
 *
 * Manual tags are editable; derived ones are rendered dashed and without a
 * remove control, because they are computed and would simply come back. The
 * distinction is worth showing rather than hiding — an admin who tries to
 * remove "Never topped up" should be able to see why they cannot.
 *
 * Applying a tag goes through a search rather than a wall of chips: the tag
 * list grows without bound, and past a couple of dozen the flat list stopped
 * being scannable. Typing filters the existing names, so the same tag gets
 * reused instead of a near-duplicate being created — and if nothing matches,
 * the typed text becomes the new tag in one step.
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
  const [query, setQuery] = useState('');

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
    mutationFn: (name: string) => createTag({ name }),
    onSuccess: async (tag) => {
      setQuery('');
      await qc.invalidateQueries({ queryKey: ['admin', 'tags'] });
      // Creating a tag from this row always means wanting it on this customer.
      save.mutate([...tags.map((t) => t.id), tag.id]);
    },
  });

  const options = all.data ?? [];
  const trimmed = query.trim();

  // Only offer "Create" when the name is new. Comparison is case-insensitive
  // because "Trusted" and "trusted" being separate tags is never intended.
  const exists = useMemo(
    () => options.some((t) => t.name.toLowerCase() === trimmed.toLowerCase()),
    [options, trimmed],
  );
  const canCreate = trimmed.length >= 2 && !exists && !create.isPending;

  return (
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
          title="Calculated from this account's own activity — it updates itself and cannot be removed by hand"
        />
      ))}

      {/*
        Multi-select rather than a picker: the applied set *is* the value, so
        the list can tick what is already on the customer, and the popup stays
        open while several are applied. `setUserTags` replaces the whole set,
        which is exactly the shape onValueChange hands back.
      */}
      <Combobox<Tag, true>
        multiple
        open={open}
        onOpenChange={setOpen}
        items={options}
        inputValue={query}
        onInputValueChange={setQuery}
        itemToStringLabel={(t) => t.name}
        isItemEqualToValue={(a, b) => a.id === b.id}
        value={tags}
        onValueChange={(next) => save.mutate(next.map((t) => t.id))}
      >
        <ComboboxTrigger className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted">
          <Plus className="size-3" />
          Tag
        </ComboboxTrigger>

        <ComboboxContent className="w-64">
          <div className="p-1 pb-2">
            <ComboboxSearchInput
              placeholder="Search tags…"
              maxLength={40}
              autoFocus
            />
          </div>

          {all.isLoading ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              Loading…
            </p>
          ) : (
            <>
              <ComboboxList>
                {(tag: Tag) => (
                  <ComboboxItem key={tag.id} value={tag}>
                    <TagChip label={tag.name} colour={tag.colour} />
                  </ComboboxItem>
                )}
              </ComboboxList>

              <ComboboxEmpty>
                {trimmed.length === 0
                  ? 'No tags yet — type a name to create one.'
                  : canCreate
                    ? null
                    : 'No match.'}
              </ComboboxEmpty>
            </>
          )}

          {canCreate && (
            <div className="mt-1 border-t pt-1">
              <ComboboxAction onClick={() => create.mutate(trimmed)}>
                <Plus className="size-3 shrink-0" />
                <span className="truncate">
                  Create “{trimmed}” and apply it
                </span>
              </ComboboxAction>
            </div>
          )}

          {create.isError && (
            <p className="px-2 py-1.5 text-[10px] text-red-600">
              Could not create — that name may already exist.
            </p>
          )}
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
