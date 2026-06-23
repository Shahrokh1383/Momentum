import { useState } from 'react';
import { Habit, HabitPayload, HabitLogPayload } from '@/types/habit';
import { useHabits } from './useHabits';
import { useHabitLogs } from './useHabitLogs';
import { getLogErrorMessage, getHabitErrorMessage } from '@/utils/habit/habitErrors';

export const useHabitsPageActions = () => {
  const {
    createHabit, isCreating, createError,
    updateHabit, isUpdating, updateError,
    archiveHabit, isArchiving, archiveError,
    restoreHabit, isRestoring, restoreError,
    deleteHabit, isDeleting, deleteError,
  } = useHabits();

  const { logHabit, updateLog, deleteLog, isProcessing: isLogProcessing } = useHabitLogs();

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [targetHabit, setTargetHabit] = useState<Habit | null>(null);
  const [isRestoringAction, setIsRestoringAction] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteHabit, setTargetDeleteHabit] = useState<Habit | null>(null);

  const [logError, setLogError] = useState<string | null>(null);

  // Handlers
  const handleOpenCreate = () => { setEditingHabit(null); setIsFormModalOpen(true); };
  const handleOpenEdit = (habit: Habit) => { setEditingHabit(habit); setIsFormModalOpen(true); };
  
  const handleFormSubmit = async (data: HabitPayload) => {
    if (editingHabit) await updateHabit({ id: editingHabit.id, payload: data });
    else await createHabit(data);
  };

  const handleArchiveToggle = (habit: Habit) => {
    setTargetHabit(habit);
    setIsRestoringAction(!!habit.archived_at);
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!targetHabit) return;
    try {
      if (isRestoringAction) await restoreHabit(targetHabit.id);
      else await archiveHabit(targetHabit.id);
      setIsArchiveModalOpen(false);
      setTargetHabit(null);
    } catch (_err) { /* Handled by React Query */ }
  };

  const handleOpenDelete = (habit: Habit) => { setTargetDeleteHabit(habit); setIsDeleteModalOpen(true); };

  const handleConfirmDelete = async () => {
    if (!targetDeleteHabit) return;
    try {
      await deleteHabit(targetDeleteHabit.id);
      setIsDeleteModalOpen(false);
      setTargetDeleteHabit(null);
    } catch (_err) { /* Handled by React Query */ }
  };

  // Logging Handlers
  const handleLog = async (habitId: number, payload: HabitLogPayload) => {
    try { await logHabit({ habitId, payload }); } catch (err) { setLogError(getLogErrorMessage(err)); }
  };

  const handleUpdateLog = async (logId: number, payload: Partial<HabitLogPayload>) => {
    try { await updateLog({ logId, payload }); } catch (err) { setLogError(getLogErrorMessage(err)); }
  };

  const handleDeleteLog = async (logId: number) => {
    try { await deleteLog(logId); } catch (err) { setLogError(getLogErrorMessage(err)); }
  };

  const getErrorMessage = () => {
    const err = createError || updateError || archiveError || restoreError || deleteError;
    return err ? getHabitErrorMessage(err) : null;
  };

  return {
    // Form Modal
    isFormModalOpen, setIsFormModalOpen, editingHabit, handleOpenCreate, handleFormSubmit,
    isSubmittingForm: isCreating || isUpdating, formError: (createError || updateError) ? getErrorMessage() : null,

    // Archive Modal
    isArchiveModalOpen, setIsArchiveModalOpen, targetHabit, isRestoringAction, handleArchiveToggle,
    handleConfirmArchive, isArchivingOrRestoring: isArchiving || isRestoring,
    archiveError: (archiveError || restoreError) ? getErrorMessage() : null,

    // Delete Modal
    isDeleteModalOpen, setIsDeleteModalOpen, targetDeleteHabit, handleOpenDelete, handleConfirmDelete,
    isDeleting, deleteError: deleteError ? getErrorMessage() : null,

    // Log Error Modal
    logError, setLogError,

    // Generic Processing State
    isProcessing: isArchiving || isRestoring || isDeleting,
    isLogProcessing,

    // Bundled Actions for Child Components (Fixes Prop Drilling)
    habitActions: { onEdit: handleOpenEdit, onArchiveToggle: handleArchiveToggle, onDelete: handleOpenDelete },
    logActions: { onLog: handleLog, onUpdateLog: handleUpdateLog, onDeleteLog: handleDeleteLog }
  };
};