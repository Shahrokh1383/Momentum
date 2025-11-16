const HABITS_KEY = "momentum-habits";

export const getStoredHabits = () => {
    const data = localStorage.getItem(HABITS_KEY);
    return data ? JSON.parse(data) : [];
}

export const saveHabits = (habits) => {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
};