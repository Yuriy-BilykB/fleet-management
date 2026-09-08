import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

/**
 * Slide-out shell shared by every create/edit form. The form element lives here
 * so the footer's submit button can stay outside the scrolling body.
 */
export function ResourceSheet({
  open, onOpenChange, title, description, onSubmit, isPending, submitLabel = 'Save', children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  onSubmit: () => void
  isPending?: boolean
  submitLabel?: string
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="grid flex-1 grid-cols-2 content-start gap-4 overflow-y-auto px-4 pb-4">
            {children}
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {submitLabel}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
