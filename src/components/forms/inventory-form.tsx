import { useState } from 'react';

import { PrimaryButton } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import type { InventoryInput } from '@/domain/crud/inventory';

export function InventoryFormSheet({
  title,
  initial,
  onSubmit,
  onClose,
}: {
  title: string;
  initial?: Partial<InventoryInput>;
  onSubmit: (input: InventoryInput) => void | Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');

  const submit = async () => {
    if (!name.trim() || !category.trim()) return;
    await onSubmit({ name, category });
    onClose();
  };

  return (
    <Sheet
      visible
      title={title}
      onClose={onClose}
      footer={
        <PrimaryButton
          label="Save"
          onPress={submit}
          disabled={!name.trim() || !category.trim()}
        />
      }>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Sunscreen" autoFocus />
      <Field label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Face" />
    </Sheet>
  );
}
