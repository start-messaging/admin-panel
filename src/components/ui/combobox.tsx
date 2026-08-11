import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { Check, Search } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Thin wrappers over Base UI's combobox, in the same shape as tooltip.tsx:
 * the primitive keeps the behaviour, these keep the look.
 *
 * The popup is rendered in a portal so it escapes the `overflow-x-auto`
 * wrapper the tables live in — without that it is clipped to the cell rather
 * than floating over the page.
 */

function Combobox<Value, Multiple extends boolean | undefined = false>(
  props: ComboboxPrimitive.Root.Props<Value, Multiple>,
) {
  return <ComboboxPrimitive.Root {...props} />;
}

/**
 * The button that opens the popup. Use this rather than a bare <button>: the
 * positioner anchors to it, so a plain button leaves the popup with nothing to
 * position against.
 */
function ComboboxTrigger({
  className,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      className={cn('outline-none', className)}
      {...props}
    />
  );
}

function ComboboxInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      className={cn(
        'h-9 w-full rounded-md border bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-primary',
        className,
      )}
      {...props}
    />
  );
}

/** Input with a magnifier, for the cases where it reads as a search box. */
function ComboboxSearchInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <ComboboxPrimitive.Input
        className={cn(
          'h-9 w-full rounded-md border bg-background pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-primary',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function ComboboxContent({
  className,
  sideOffset = 4,
  children,
  ...popupProps
}: ComboboxPrimitive.Popup.Props &
  Pick<ComboboxPrimitive.Positioner.Props, 'side' | 'sideOffset' | 'align'>) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner sideOffset={sideOffset} className="z-50">
        <ComboboxPrimitive.Popup
          className={cn(
            'z-50 max-h-64 w-(--anchor-width) min-w-48 origin-(--transform-origin) overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none',
            className,
          )}
          {...popupProps}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return <ComboboxPrimitive.List className={cn('outline-none', className)} {...props} />;
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      className={cn(
        'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none',
        'data-[highlighted]:bg-muted data-[selected]:font-medium',
        className,
      )}
      {...props}
    >
      <ComboboxPrimitive.ItemIndicator className="flex size-3.5 shrink-0 items-center justify-center">
        <Check className="size-3" />
      </ComboboxPrimitive.ItemIndicator>
      <span className="min-w-0 flex-1">{children}</span>
    </ComboboxPrimitive.Item>
  );
}

/** Item without the tick column — for actions like "Create …". */
function ComboboxAction({
  className,
  children,
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs outline-none hover:bg-muted',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      className={cn('px-2 py-3 text-center text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxTrigger,
  ComboboxInput,
  ComboboxSearchInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxAction,
  ComboboxEmpty,
};
