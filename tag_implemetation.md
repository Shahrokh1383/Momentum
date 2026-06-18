 The Enterprise Solution: Inline "Creatable" Tags
Tags are metadata attached to entities (in your case, Habits). Therefore, they should be managed contextually at the exact moment the user is creating or editing a Habit. 
My Strategy for Tags (Deferred to the Habits Phase):

    In this current phase (Sub-Phase 2.2): We will build zero frontend UI for Tags. We will focus purely on Categories.
    In the next phase (Habits Implementation): I will build a highly polished, reusable <CreatableTagInput /> component. 
        When the user types in the Habit creation modal, it will call your backend GET /tags/autocomplete endpoint to show a beautiful dropdown of suggestions.
        If the user types a new tag and hits "Enter" or clicks "Create", it will silently call your backend POST /tags endpoint to create it on the fly and attach it to the habit.
    Why keep the backend Tag CRUD then? 
        The backend TagController is perfectly structured and not dead code. It is a robust API. We will use its autocomplete and store methods heavily in the Habit forms. The update and destroy methods will be useful later for background cleanup jobs (e.g., deleting orphaned tags) or for an Admin Panel.