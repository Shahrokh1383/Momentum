import React, { useState, useRef, useEffect } from 'react';
import { useTagAutocomplete } from '@/hooks/user/useTags';
import { Tag } from '@/types/tag';
import '@/styles/ui/creatable-tag-input.css';

interface Props {
  value: (number | string)[];
  onChange: (value: (number | string)[]) => void;
  existingTags: Tag[];
  placeholder?: string;
}

const CreatableTagInput: React.FC<Props> = ({ 
  value, onChange, existingTags, placeholder = 'Add tags...' 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { suggestions, isLoading } = useTagAutocomplete(inputValue);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTag = (tag: number | string) => {
    if (!value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemoveTag = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        // Check if exact match exists in suggestions
        const exactMatch = suggestions.find(s => s.name.toLowerCase() === inputValue.toLowerCase());
        handleAddTag(exactMatch ? exactMatch.id : inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      handleRemoveTag(value.length - 1);
    }
  };

  const getTagDisplay = (item: number | string): Tag | null => {
    if (typeof item === 'number') {
      return existingTags.find(t => t.id === item) || null;
    }
    return null;
  };

  const filteredSuggestions = suggestions.filter(s => !value.includes(s.id));
  const showCreateOption = inputValue.trim() && 
    !suggestions.some(s => s.name.toLowerCase() === inputValue.toLowerCase()) &&
    !value.some(v => typeof v === 'string' && v.toLowerCase() === inputValue.toLowerCase());

  return (
    <div className="creatable-tag-input" ref={containerRef}>
      <div className="creatable-tag-input__field" onClick={() => inputRef.current?.focus()}>
        {value.map((item, index) => {
          const tagObj = getTagDisplay(item);
          return (
            <span 
              key={`${item}-${index}`} 
              className="creatable-tag-input__pill"
              style={tagObj ? { borderLeftColor: tagObj.color } : {}}
            >
              {tagObj ? tagObj.name : item}
              <button 
                type="button" 
                className="creatable-tag-input__remove" 
                onClick={(e) => { e.stopPropagation(); handleRemoveTag(index); }}
              >
                <i className="fas fa-times"></i>
              </button>
            </span>
          );
        })}
        
        <input
          ref={inputRef}
          type="text"
          className="creatable-tag-input__input"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>

      {isOpen && (inputValue.length > 0 || isLoading) && (
        <div className="creatable-tag-input__dropdown">
          {isLoading ? (
            <div className="creatable-tag-input__loading">
              <span className="spinner-border spinner-border-sm" /> Searching...
            </div>
          ) : (
            <>
              {filteredSuggestions.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  className="creatable-tag-input__option"
                  onClick={() => handleAddTag(tag.id)}
                >
                  <i className="fas fa-tag me-2" style={{ color: tag.color }}></i>
                  {tag.name}
                </button>
              ))}
              
              {showCreateOption && (
                <button
                  type="button"
                  className="creatable-tag-input__option creatable-tag-input__option--create"
                  onClick={() => handleAddTag(inputValue.trim())}
                >
                  <i className="fas fa-plus me-2"></i>
                  Create "<strong>{inputValue.trim()}</strong>"
                </button>
              )}

              {filteredSuggestions.length === 0 && !showCreateOption && (
                <div className="creatable-tag-input__empty">No tags found</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatableTagInput;