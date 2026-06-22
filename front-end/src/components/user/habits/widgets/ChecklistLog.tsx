import React from 'react';
import { Habit, HabitLogPayload } from '@/types/habit';

interface Props {
  habit: Habit;
  onLog: (payload: HabitLogPayload) => void;
  onUpdate: (logId: number, payload: Partial<HabitLogPayload>) => void;
  isProcessing: boolean;
}

const ChecklistLog: React.FC<Props> = ({ habit, onLog, onUpdate, isProcessing }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const toggleItem = (itemId: number, currentChecked: boolean) => {
    if (isProcessing) return;
    
    const items = habit.checklist_items || [];
    const newChecklistLogs = items.map(item => ({
      checklist_item_id: item.id!,
      is_checked: item.id === itemId ? !currentChecked : (
        habit.today_log?.checklist_logs?.find(cl => cl.checklist_item_id === item.id)?.is_checked || false
      ),
    }));

    if (habit.today_log) {
      onUpdate(habit.today_log.id, { checklist_logs: newChecklistLogs });
    } else {
      onLog({ logged_date: today, checklist_logs: newChecklistLogs, status: 'completed' });
    }
  };

  return (
    <div className="checklist-log">
      {habit.checklist_items?.map(item => {
        const isChecked = habit.today_log?.checklist_logs?.find(
          cl => cl.checklist_item_id === item.id
        )?.is_checked || false;

        return (
          <div 
            key={item.id} 
            className={`checklist-log__item ${isChecked ? 'checked' : ''}`}
            onClick={() => toggleItem(item.id!, isChecked)}
          >
            <div className={`checklist-log__checkbox ${isChecked ? 'checked' : ''}`}>
              <i className="fas fa-check"></i>
            </div>
            <span className="checklist-log__title">{item.title}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ChecklistLog;