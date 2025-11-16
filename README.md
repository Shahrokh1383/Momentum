

# Momentum - Habit Tracker Analytics

## Overview

Momentum is a sophisticated personal habit analytics application designed to help users efficiently manage, track, and analyze their daily habits. Built with React and Bootstrap 5, this application provides comprehensive insights into habit formation and maintenance patterns through intuitive visualizations and detailed analytics.

## Key Features

- **Habit Management**: Create, edit, and delete habits with a streamlined interface
- **Daily Logging**: Mark habits as completed or incomplete on a daily basis
- **Visual Analytics**: Weekly and monthly success charts to visualize progress
- **Insights Dashboard**:
  - Streak tracking (consecutive days of habit completion)
  - Adherence percentage calculation
  - Activity time analysis
- **Data Persistence**: Secure local storage using `localStorage`
- **Responsive UI**: Beautiful, responsive interface built with Bootstrap 5
- **Professional Animations**: Smooth transitions and micro-interactions for enhanced UX

## Technology Stack

- **Frontend Framework**: React with Vite
- **Routing**: React Router
- **UI Framework**: Bootstrap 5
- **Styling**: CSS3 with advanced techniques (Gradient, Glassmorphism, Animations)

## Getting Started

1. Clone the repository:
   ```bash
   git clone <https://github.com/Shahrokh1383/momentum-app>
   cd Momentum
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Project Architecture

```
Momentum/
├── public/
├── src/
│   ├── components/
│   │   ├── HabitForm.jsx          # Habit creation/editing form
│   │   ├── HabitList.jsx          # Habits listing component
│   │   ├── HabitItem.jsx          # Individual habit item
│   │   ├── LogEntry.jsx           # Daily habit logging
│   │   ├── WeeklyChart.jsx        # Weekly progress visualization
│   │   ├── MonthlyChart.jsx       # Monthly progress visualization
│   │   ├── InsightsPanel.jsx      # Analytics dashboard (streak, percentage, activity)
│   │   ├── Header.jsx             # Application header
│   │   └── Footer.jsx             # Application footer
│   ├── hooks/
│   │   └── useHabits.js           # Custom hook for habit state management
│   ├── utils/
│   │   ├── storage.js             # localStorage management utilities
│   │   └── analytics.js           # Analytics calculation functions
│   ├── styles/
│   │   └── App.css                # Custom application styles
│   ├── App.jsx                    # Main application component
│   ├── index.js                   # Application entry point
│   └── index.css                  # Global styles
│── index.html
├── package.json
└── README.md
```

## Core Components

| Component | Purpose |
|-----------|---------|
| `HabitForm` | Handles creation and editing of habits |
| `HabitList` | Displays the list of user habits |
| `HabitItem` | Renders individual habit with management controls |
| `LogEntry` | Facilitates daily habit status logging |
| `WeeklyChart` | Visualizes weekly habit completion rates |
| `MonthlyChart` | Displays monthly habit completion trends |
| `InsightsPanel` | Shows streak, adherence percentage, and activity patterns |
| `Header` | Application navigation bar |
| `Footer` | Application footer component |

## Utility Modules

| File | Functionality |
|------|---------------|
| `useHabits.js` | Custom React hook for centralized habit state management |
| `storage.js` | localStorage abstraction layer for data persistence |
| `analytics.js` | Algorithms for calculating streaks, adherence rates, and activity patterns |

## Analytics Features

- **Streak Tracking**: Identifies the longest sequence of consecutive days a habit was completed
- **Adherence Rate**: Calculates the percentage of days a habit was completed relative to active days
- **Activity Patterns**: Analyzes the time periods when users are most active with habit logging

## UI/UX Implementation

- Responsive design principles implemented with Bootstrap 5
- Component-based architecture with cards, alerts, progress bars, and modals
- Semantic color coding for habit completion status
- Clean, professional design with attention to accessibility

## Dependencies

- `react`
- `react-dom`
- `react-router-dom`
- `bootstrap`
- `chart.js` or `recharts` for data visualization

## Development Workflow

1. Set up the development environment with Vite
2. Implement components following the established architecture
3. Integrate with localStorage for data persistence
4. Develop analytics functionality
5. Implement responsive design with Bootstrap 5
6. Add animations and micro-interactions
7. Conduct comprehensive testing

## Testing Strategy

- localStorage data persistence verification
- Habit CRUD operations testing
- Streak calculation accuracy validation
- Chart rendering and data visualization testing
- Responsive design testing across devices

## Final Checklist

- [ ] All components implemented according to specifications
- [ ] localStorage integration complete
- [ ] Analytics dashboards functional
- [ ] Responsive design implemented
- [ ] Error handling and edge cases addressed
- [ ] End-to-end user testing completed

---

This project represents a comprehensive approach to habit tracking with a focus on user experience and data-driven insights. The modular architecture ensures maintainability and scalability for future enhancements.