// This component has been consolidated into ScheduleForm with mode='multi'.
// This file is kept as a re-export for backward compatibility.
'use client';

import ScheduleForm from './ScheduleForm';

interface MultiPetScheduleFormProps {
  selectedDate: Date;
  preselectedPetIds?: number[];
  onClose: () => void;
  onSave: () => void;
}

export default function MultiPetScheduleForm(props: MultiPetScheduleFormProps) {
  return <ScheduleForm mode="multi" {...props} />;
}
