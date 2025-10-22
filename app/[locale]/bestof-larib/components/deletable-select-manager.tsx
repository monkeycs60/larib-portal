'use client';
import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';

type Option = { id: string; name: string };

export default function DeletableSelectManager({
  options,
  onDelete,
  onCreate,
  disabled,
  deleting,
  creating,
  createLabel,
  createPlaceholder,
  selectedIds,
  onSelectedIdsChange,
  onDeleteClick,
}: {
  options: Option[];
  onDelete: (ids: string[]) => Promise<void>;
  onCreate: (name: string) => Promise<void>;
  disabled?: boolean;
  deleting?: boolean;
  creating?: boolean;
  createLabel: string;
  createPlaceholder: string;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onDeleteClick?: () => void;
}) {
  const t = useTranslations('bestof');
  const [newItemName, setNewItemName] = useState('');

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

  const isWorking = disabled || deleting || creating;

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
              {creating ? t('creating') : t('create')}
            </Button>
          </div>
        </div>

        {options.length > 0 && (
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              {selectedIds.length > 0 ? t('itemsSelected', { count: selectedIds.length }) : 'Existing items'}
            </label>

            <div className='border rounded-md max-h-[250px] overflow-y-auto'>
              {options.map((option) => (
                <button
                  key={option.id}
                  type='button'
                  onClick={() => toggleSelection(option.id)}
                  disabled={isWorking}
                  className='w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors border-b last:border-b-0'
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
              ))}
            </div>
          </div>
        )}
      </div>

    </>
  );
}
