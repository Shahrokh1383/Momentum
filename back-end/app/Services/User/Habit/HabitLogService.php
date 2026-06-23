<?php

namespace App\Services\User\Habit;

use App\Models\Habit\HabitChecklistLog;
use App\Models\Habit\HabitLog; 
use App\Models\User;

class HabitLogService
{
    /**
     * Log a completed habit. Handles all 4 types.
     */
    public function logCompletion(User $user, int $habitId, array $data): HabitLog
    {
        $habit = $user->habits()->findOrFail($habitId);

        // Derived-status types start as 'pending'; simple types are 'completed' immediately.
        $initialStatus = $this->isDerivedStatusType($habit->type) ? 'pending' : 'completed';

        $logData = array_merge($this->extractLogData($habit->type, $data), [
            'habit_id' => $habit->id,
            'user_id' => $user->id,
            'logged_date' => $data['logged_date'],
            'status' => $initialStatus,
        ]);

        $log = HabitLog::create($logData);

        $this->applyDerivedStatus($habit, $log, $data);

        return $log->load(['habit', 'checklistLogs.checklistItem']);
    }

    /**
     * Update an existing habit log.
     */
    public function updateLog(HabitLog $habitLog, array $data): HabitLog
    {
        $logData = $this->extractLogData($habitLog->habit->type, $data);

        // Only non-derived types allow explicit status from the request.
        if (!$this->isDerivedStatusType($habitLog->habit->type) && isset($data['status'])) {
            $logData['status'] = $data['status'];
        }

        $habitLog->update($logData);

        $this->applyDerivedStatus($habitLog->habit, $habitLog, $data);

        return $habitLog->load(['habit', 'checklistLogs.checklistItem']);
    }

    /**
     * Delete a habit log (cascades to checklist logs via FK).
     */
    public function deleteLog(User $user, int $id): void
    {
        $log = $user->habitLogs()->findOrFail($id);
        $log->delete();
    }

    /**
     * Extract type-specific fields from input data.
     */
    private function extractLogData(string $type, array $data): array
    {
        $logData = [
            'notes' => $data['notes'] ?? null,
        ];

        if ($type === 'numeric') {
            $logData['value'] = $data['value'] ?? null;
        }

        if ($type === 'timer') {
            $logData['duration_seconds'] = $data['duration_seconds'] ?? null;
        }

        return $logData;
    }

    /**
     * Check if a habit type requires derived status (not explicitly set by client).
     */
    private function isDerivedStatusType(string $type): bool
    {
        return in_array($type, ['checklist', 'numeric'], true);
    }

    /**
     * Dispatch to the correct derived-status handler based on habit type.
     * Only updates the log (triggering observer) when status actually changes.
     */
    private function applyDerivedStatus($habit, HabitLog $log, array $data): void
    {
        if ($habit->type === 'checklist' && isset($data['checklist_logs'])) {
            $this->syncChecklistLogs($log, $data['checklist_logs']);
            $this->applyStatusIfChanged($log, $this->resolveChecklistStatus($log));
        }

        if ($habit->type === 'numeric') {
            $this->applyStatusIfChanged($log, $this->resolveNumericStatus($log));
        }
    }

    /**
     * Update log status only when it differs, avoiding unnecessary observer triggers.
     */
    private function applyStatusIfChanged(HabitLog $log, string $newStatus): void
    {
        if ($log->status !== $newStatus) {
            $log->update(['status' => $newStatus]);
        }
    }

    /**
     * Determine checklist status: 'completed' only when ALL items are checked.
     */
    private function resolveChecklistStatus(HabitLog $log): string
    {
        $totalItems = $log->habit->checklistItems()->count();
        if ($totalItems === 0) return 'pending';

        $checkedCount = $log->checklistLogs()->where('is_checked', true)->count();
        return $checkedCount >= $totalItems ? 'completed' : 'pending';
    }

    /**
     * Determine numeric status: 'completed' only when value meets or exceeds target.
     */
    private function resolveNumericStatus(HabitLog $log): string
    {
        $target = (float) ($log->habit->target_value ?? 0);
        if ($target <= 0) return 'pending';

        $value = (float) ($log->value ?? 0);
        return $value >= $target ? 'completed' : 'pending';
    }

    /**
     * Sync checklist log entries using upsert on the unique constraint.
     */
    private function syncChecklistLogs(HabitLog $log, array $checklistLogs): void
    {
        foreach ($checklistLogs as $item) {
            HabitChecklistLog::updateOrCreate(
                [
                    'habit_log_id' => $log->id,
                    'checklist_item_id' => $item['checklist_item_id'],
                ],
                [
                    'is_checked' => $item['is_checked'],
                ]
            );
        }
    }
}