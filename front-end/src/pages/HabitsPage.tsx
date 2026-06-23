import React, { useState } from 'react';
import { useHabits } from '@/hooks/useHabits';
import { useHabitLogs } from '@/hooks/useHabitLogs';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useSubscription } from '@/hooks/useSubscription';
import { Habit, HabitPayload, HabitLogPayload } from '@/types/habit';
import Modal from '@/components/ui/Modal';
import HabitQuotaBanner from '@/components/user/habits/HabitQuotaBanner';
import HabitGrid from '@/components/user/habits/HabitGrid';
import HabitFormModal from '@/components/user/habits/HabitFormModal';
import ArchiveHabitModal from '@/components/user/habits/ArchiveHabitModal';
import DeleteHabitModal from '@/components/user/habits/DeleteHabitModal';
import '@/styles/habits.css';

const HabitsPage: React.FC = () => {
  const {
    activeHabits, isActiveLoading,
    archivedHabits, isArchivedLoading,
    createHabit, isCreating, createError,
    updateHabit, isUpdating, updateError,
    archiveHabit, isArchiving, archiveError,
    restoreHabit, isRestoring, restoreError,
    deleteHabit, isDeleting, deleteError,
  } = useHabits();

  const { logHabit, updateLog, deleteLog, isProcessing: isLogProcessing } = useHabitLogs();

  const { categories } = useCategories();
  const { tags: existingTags } = useTags();
  const { quotas } = useSubscription();

  const [isArchivedView, setIsArchivedView] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [targetHabit, setTargetHabit] = useState<Habit | null>(null);
  const [isRestoringAction, setIsRestoringAction] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteHabit, setTargetDeleteHabit] = useState<Habit | null>(null);

  const [logError, setLogError] = useState<string | null>(null);

  const currentHabits = isArchivedView ? archivedHabits : activeHabits;
  const isLoading = isArchivedView ? isArchivedLoading : isActiveLoading;
  const isProcessing = isArchiving || isRestoring || isDeleting;

  const handleOpenCreate = () => { setEditingHabit(null); setIsFormModalOpen(true); };
  const handleOpenEdit = (habit: Habit) => { setEditingHabit(habit); setIsFormModalOpen(true); };
  
  const handleFormSubmit = async (data: HabitPayload) => {
    if (editingHabit) {
      await updateHabit({ id: editingHabit.id, payload: data });
    } else {
      await createHabit(data);
    }
  };

  const handleArchiveToggle = (habit: Habit) => {
    setTargetHabit(habit);
    setIsRestoringAction(!!habit.archived_at);
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!targetHabit) return;
    try {
      if (isRestoringAction) {
        await restoreHabit(targetHabit.id);
      } else {
        await archiveHabit(targetHabit.id);
      }
      setIsArchiveModalOpen(false);
      setTargetHabit(null);
    } catch (_err) { /* Handled by React Query error states */ }
  };

  const handleOpenDelete = (habit: Habit) => {
    setTargetDeleteHabit(habit);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetDeleteHabit) return;
    try {
      await deleteHabit(targetDeleteHabit.id);
      setIsDeleteModalOpen(false);
      setTargetDeleteHabit(null);
    } catch (_err) { /* Handled by React Query error states */ }
  };

  // Logging Handlers
  const getLogErrorMessage = (err: unknown): string => {
    const error = err as any;
    return error?.response?.data?.message || error?.message || 'An unexpected error occurred while logging.';
  };

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
    const err: any = createError || updateError || archiveError || restoreError || deleteError;
    if (err?.response?.data?.error === 'quota_exceeded') {
      return `You have reached your limit of ${err.response.data.limit} active habits. Please archive a habit or upgrade your plan.`;
    }
    if (err?.response?.data?.error === 'feature_locked') {
      return `This feature requires the ${err.response.data.required_plan} plan. Please upgrade to continue.`;
    }
    return err?.response?.data?.message || err?.message || 'An unexpected error occurred.';
  };

  const logErrorFooter = (
    <button className="modal-btn modal-btn--primary" onClick={() => setLogError(null)}>
      OK
    </button>
  );

  return (
    <div className="habits-page">
      <div className="habits-page__header">
        <div>
          <h1 className="habits-page__title">Habits</h1>
          <p className="text-muted-custom mb-0">Build routines, track progress, and achieve your goals.</p>
        </div>
        
        <div className="habits-page__view-toggle">
          <button 
            className={`habits-page__toggle-btn ${!isArchivedView ? 'active' : ''}`}
            onClick={() => setIsArchivedView(false)}
          >
            <i className="fas fa-bolt me-2"></i> Active
          </button>
          <button 
            className={`habits-page__toggle-btn ${isArchivedView ? 'active' : ''}`}
            onClick={() => setIsArchivedView(true)}
          >
            <i className="fas fa-box-archive me-2"></i> Archived
          </button>
        </div>
      </div>

      {!isArchivedView && <HabitQuotaBanner onAddClick={handleOpenCreate} />}

      <HabitGrid
        habits={currentHabits}
        isLoading={isLoading}
        isProcessing={isProcessing}
        isLogProcessing={isLogProcessing}
        isArchivedView={isArchivedView}
        onEdit={handleOpenEdit}
        onArchiveToggle={handleArchiveToggle}
        onDelete={handleOpenDelete}
        onAddClick={handleOpenCreate}
        onLog={handleLog}
        onUpdateLog={handleUpdateLog}
        onDeleteLog={handleDeleteLog}
      />

      <HabitFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={isCreating || isUpdating}
        initialData={editingHabit}
        categories={categories}
        existingTags={existingTags}
        canUseReminders={quotas?.features?.smart_reminders ?? false}
        errorMessage={(createError || updateError) ? getErrorMessage() : null}
      />

      <ArchiveHabitModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onConfirm={handleConfirmArchive}
        isLoading={isArchiving || isRestoring}
        habitTitle={targetHabit?.title || null}
        isRestoring={isRestoringAction}
        errorMessage={(archiveError || restoreError) ? getErrorMessage() : null}
      />

      <DeleteHabitModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        habitTitle={targetDeleteHabit?.title || null}
        errorMessage={deleteError ? getErrorMessage() : null}
      />

      <Modal
        isOpen={!!logError}
        onClose={() => setLogError(null)}
        title="Logging Error"
        footer={logErrorFooter}
      >
        <div className="habit-error-modal__content">
          <div className="habit-error-modal__icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <p className="habit-error-modal__message">{logError}</p>
        </div>
      </Modal>
    </div>
  );
};

export default HabitsPage;