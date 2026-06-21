<?php

namespace App\Services\User\Habit;

use App\Models\HabitChecklistLog;
use App\Models\HabitLog;
use App\Models\User;

class HabitLogService
{
    /**
     * Log a completed habit. Handles all 4 types.
     */
    public function logCompletion(User $user, int $habitId, array $data): HabitLog
    {
        $habit = $user->habits()->findOrFail($habitId);

        $logData = array_merge($this->extractLogData($habit->type, $data), [
            'habit_id' => $habit->id,
            'user_id' => $user->id,
            'logged_date' => $data['logged_date'],
            'status' => 'completed',
        ]);

        $log = HabitLog::create($logData);

        if ($habit->type === 'checklist' && isset($data['checklist_logs'])) {
            $this->syncChecklistLogs($log, $data['checklist_logs']);
        }

        return $log->load(['habit', 'checklistLogs.checklistItem']);
    }

    /**
     * Update an existing habit log.
     */
    public function updateLog(HabitLog $habitLog, array $data): HabitLog
    {
        $logData = $this->extractLogData($habitLog->habit->type, $data);

        if (isset($data['status'])) {
            $logData['status'] = $data['status'];
        }

        $habitLog->update($logData);

        if ($habitLog->habit->type === 'checklist' && isset($data['checklist_logs'])) {
            $this->syncChecklistLogs($habitLog, $data['checklist_logs']);
        }

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