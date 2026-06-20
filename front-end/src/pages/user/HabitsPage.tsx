import React, { useState } from 'react';
import { useHabits } from '@/hooks/user/useHabits';
import { useCategories } from '@/hooks/user/useCategories';
import { useTags } from '@/hooks/user/useTags';
import { useSubscription } from '@/hooks/user/useSubscription';
import { Habit, HabitPayload } from '@/types/habit';
import HabitQuotaBanner from '@/components/user/habits/HabitQuotaBanner';
import HabitGrid from '@/components/user/habits/HabitGrid';
import HabitFormModal from '@/components/user/habits/HabitFormModal';
import ArchiveHabitModal from '@/components/user/habits/ArchiveHabitModal';
import '@/styles/habits.css';

const HabitsPage: React.FC = () => {
  const {
    activeHabits, isActiveLoading,
    archivedHabits, isArchivedLoading,
    createHabit, isCreating, createError,
    updateHabit, isUpdating, updateError,
    archiveHabit, isArchiving, archiveError,
    restoreHabit, isRestoring, restoreError,
    deleteHabit, isDeleting,
  } = useHabits();

  const { categories } = useCategories();
  const { tags: existingTags } = useTags();
  const { quotas } = useSubscription();

  const [isArchivedView, setIsArchivedView] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [targetHabit, setTargetHabit] = useState<Habit | null>(null);
  const [isRestoringAction, setIsRestoringAction] = useState(false);

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
    } catch (err) {}
  };

  const handleDelete = async (id: number) => {
    try { await deleteHabit(id); } catch (err) {}
  };

  const getErrorMessage = () => {
    const err: any = createError || updateError || archiveError || restoreError;
    if (err?.response?.data?.error === 'quota_exceeded') {
      return `You have reached your limit of ${err.response.data.limit} active habits. Please archive a habit or upgrade your plan.`;
    }
    if (err?.response?.data?.error === 'feature_locked') {
      return `This feature requires the ${err.response.data.required_plan} plan. Please upgrade to continue.`;
    }
    return err?.response?.data?.message || err?.message || 'An unexpected error occurred.';
  };

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
        isArchivedView={isArchivedView}
        onEdit={handleOpenEdit}
        onArchiveToggle={handleArchiveToggle}
        onDelete={handleDelete}
        onAddClick={handleOpenCreate}
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
    </div>
  );
};

export default HabitsPage;