import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDelete } from '@/components/common/confirm-delete'

export function RowActions({
  onEdit, onDelete, deleteDescription,
}: {
  onEdit: () => void
  onDelete: () => void
  deleteDescription?: string
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit">
        <Pencil className="size-4" />
      </Button>
      <ConfirmDelete
        onConfirm={onDelete}
        description={deleteDescription}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        }
      />
    </div>
  )
}

export { MoreHorizontal, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger }
