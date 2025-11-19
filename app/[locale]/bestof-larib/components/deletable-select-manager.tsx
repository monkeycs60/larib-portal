'use client';
import { useState } from 'react';
import { Check, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';

type Option = { id: string; name: string };

export default function DeletableSelectManager({
  options,
  onDelete,
  onCreate,
  onUpdate,
  disabled,
  deleting,
  creating,
  updating,
  createLabel,
  createPlaceholder,
  createButtonLabel,
  selectedIds,
  onSelectedIdsChange,
}: {
  options: Option[];
  onDelete: (ids: string[]) => Promise<void>;
  onCreate: (name: string) => Promise<void>;
  onUpdate?: (id: string, name: string) => Promise<void>;
  disabled?: boolean;
  deleting?: boolean;
  creating?: boolean;
  updating?: boolean;
  createLabel: string;
  createPlaceholder: string;
  createButtonLabel: string;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}) {
  const t = useTranslations('bestof');
  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const toggleSelection = (id: string) => {
    const newIds = selectedIds.includes(id)
      ? selectedIds.filter((itemId) => itemId !== id)
      : [...selectedIds, id];
    onSelectedIdsChange(newIds);
  };

  const handleCreate = async () => {
    const name = newItemName.trim();
    if (!name || name.length < 2) return;
    await onCreate(name);
    setNewItemName('');
  };

  const startEditing = (option: Option) => {
    setEditingId(option.id);
    setEditingName(option.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleUpdate = async () => {
    if (!editingId || !onUpdate) return;
    const name = editingName.trim();
    if (!name || name.length < 2) return;
    await onUpdate(editingId, name);
    setEditingId(null);
    setEditingName('');
  };

  const isWorking = disabled || deleting || creating || updating;

  return (
    <>
      <div className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>{createLabel}</label>
          <div className='flex gap-2'>
            <Input
              value={newItemName}
              onChange={(event) => setNewItemName(event.target.value)}
              placeholder={createPlaceholder}
              disabled={isWorking}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
            />
            <Button
              type='button'
              onClick={handleCreate}
              disabled={isWorking || !newItemName.trim() || newItemName.trim().length < 2}
            >
              <Plus className='size-4 mr-1' />
              {creating ? t('creating') : createButtonLabel}
            </Button>
          </div>
        </div>

        {options.length > 0 && (
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              {selectedIds.length > 0 ? t('itemsSelected', { count: selectedIds.length }) : t('existingItems')}
            </label>

            <div className='border rounded-md max-h-[250px] overflow-y-auto'>
              {options.map((option) => (
                <div key={option.id} className='border-b last:border-b-0'>
                  {editingId === option.id ? (
                    <div className='flex items-center gap-2 px-3 py-2'>
                      <Input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        disabled={isWorking}
                        className='flex-1 h-8'
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleUpdate();
                          }
                          if (event.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        type='button'
                        size='sm'
                        onClick={handleUpdate}
                        disabled={isWorking || !editingName.trim() || editingName.trim().length < 2}
                      >
                        {updating ? t('saving') : t('saveEdit')}
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant='ghost'
                        onClick={cancelEditing}
                        disabled={isWorking}
                      >
                        {t('cancelEdit')}
                      </Button>
                    </div>
                  ) : (
                    <div className='flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors'>
                      <button
                        type='button'
                        onClick={() => toggleSelection(option.id)}
                        disabled={isWorking}
                        className='flex items-center gap-2 flex-1'
                      >
                        <div
                          className={`size-4 border rounded flex items-center justify-center ${
                            selectedIds.includes(option.id) ? 'bg-primary border-primary' : 'border-input'
                          }`}
                        >
                          {selectedIds.includes(option.id) && <Check className='size-3 text-white' />}
                        </div>
                        <span className='flex-1 text-left'>{option.name}</span>
                      </button>
                      {onUpdate && (
                        <button
                          type='button'
                          onClick={() => startEditing(option)}
                          disabled={isWorking}
                          className='p-1 hover:bg-muted rounded'
                          title={t('editItem')}
                        >
                          <Pencil className='size-3.5 text-muted-foreground' />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </>
  );
}
