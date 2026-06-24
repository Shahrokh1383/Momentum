import React, { useState } from 'react';
import { useCategories } from '@/hooks/categories/useCategories';
import { useTags } from '@/hooks/habits/useTags';
import { useSubscription } from '@/hooks/useSubscription';
import Modal from '@/components/ui/Modal';
import HabitQuotaBanner from '@/components/user/habits/HabitQuotaBanner';
import HabitGrid from '@/components/user/habits/HabitGrid';
import HabitFormModal from '@/components/user/habits/HabitFormModal';
import ArchiveHabitModal from '@/components/user/habits/ArchiveHabitModal';
import DeleteHabitModal from '@/components/user/habits/DeleteHabitModal';
import { useHabits } from '@/hooks/habits/useHabits';
import { useHabitsPageActions } from '@/hooks/habits/useHabitsPageActions';
import '@/styles/habits.css';

const HabitsPage: React.FC = () => {
  const { activeHabits, isActiveLoading, archivedHabits, isArchivedLoading } = useHabits();
  const { categories } = useCategories();
  const { tags: existingTags } = useTags();
  const { quotas } = useSubscription();

  const [isArchivedView, setIsArchivedView] = useState(false);

  const {
    isFormModalOpen, setIsFormModalOpen, editingHabit, handleOpenCreate, handleFormSubmit, isSubmittingForm, formError,
    isArchiveModalOpen, setIsArchiveModalOpen, targetHabit, isRestoringAction, handleConfirmArchive, isArchivingOrRestoring, archiveError,
    isDeleteModalOpen, setIsDeleteModalOpen, targetDeleteHabit, handleConfirmDelete, isDeleting, deleteError,
    logError, setLogError, isProcessing, isLogProcessing, habitActions, logActions
  } = useHabitsPageActions();

  const currentHabits = isArchivedView ? archivedHabits : activeHabits;
  const isLoading = isArchivedView ? isArchivedLoading : isActiveLoading;

  const logErrorFooter = (
    <button className="modal-btn modal-btn--primary" onClick={() => setLogError(null)}>OK</button>
  );

  return (
    <div className="habits-page">
      <div className="habits-page__header">
        <div>
          <h1 className="habits-page__title">Habits</h1>
          <p className="text-muted-custom mb-0">Build routines, track progress, and achieve your goals.</p>
        </div>
        
        <div className="habits-page__view-toggle">
          <button className={`habits-page__toggle-btn ${!isArchivedView ? 'active' : ''}`} onClick={() => setIsArchivedView(false)}>
            <i className="fas fa-bolt me-2"></i> Active
          </button>
          <button className={`habits-page__toggle-btn ${isArchivedView ? 'active' : ''}`} onClick={() => setIsArchivedView(true)}>
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
        habitActions={habitActions}
        logActions={logActions}
        onAddClick={handleOpenCreate}
      />

      <HabitFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={isSubmittingForm}
        initialData={editingHabit}
        categories={categories}
        existingTags={existingTags}
        canUseReminders={quotas?.features?.smart_reminders ?? false}
        errorMessage={formError}
      />

      <ArchiveHabitModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onConfirm={handleConfirmArchive}
        isLoading={isArchivingOrRestoring}
        habitTitle={targetHabit?.title || null}
        isRestoring={isRestoringAction}
        errorMessage={archiveError}
      />

      <DeleteHabitModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        habitTitle={targetDeleteHabit?.title || null}
        errorMessage={deleteError}
      />

      <Modal isOpen={!!logError} onClose={() => setLogError(null)} title="Logging Error" footer={logErrorFooter}>
        <div className="habit-error-modal__content">
          <div className="habit-error-modal__icon"><i className="fas fa-exclamation-triangle"></i></div>
          <p className="habit-error-modal__message">{logError}</p>
        </div>
      </Modal>
    </div>
  );
};

export default HabitsPage;