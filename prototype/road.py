import os
import sys

def generate_road_map():
    # Get the project root path (current working directory)
    project_root = os.path.abspath(os.getcwd())
    
    # List to store all paths
    all_paths = []
    
    # List of directories to exclude
    exclude_dirs = ['venv', '.git', 'vendor', 'node_modules', '__pycache__', '.idea', '.vscode', 'FontAwesome', 'bootstrap-pack']
    
    # Recursively traverse the directory structure
    for root, dirs, files in os.walk(project_root, topdown=True):
        # Sort for consistent output
        dirs.sort()
        files.sort()
        
        # Filter out excluded directories (modify dirs in-place to prevent os.walk from traversing them)
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        # Check if current directory should be excluded based on full path
        if any(ex_dir in root.split(os.sep) for ex_dir in exclude_dirs):
            continue
            
        # Add current directory path
        all_paths.append(root)
        
        # Add paths of all files in current directory
        for file in files:
            file_path = os.path.join(root, file)
            all_paths.append(file_path)
    
    # Output file path
    output_file = os.path.join(project_root, "road_map.txt")
    
    # Write paths to output file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            for path in all_paths:
                # Calculate relative path for cleaner output
                relative_path = os.path.relpath(path, project_root)
                f.write(relative_path + '\n')
        print(f"✓ Road map successfully generated: {output_file}")
        print(f"✓ Total paths recorded: {len(all_paths)}")
        print(f"✓ Project root: {project_root}")
    except Exception as e:
        print(f"✗ Error creating output file: {e}")
        sys.exit(1)

def display_excluded_dirs():
    """Display the list of excluded directories"""
    exclude_dirs = ['venv', '.git', 'vendor', 'node_modules', '__pycache__', '.idea', '.vscode', 'FontAwesome', 'bootstrap-pack']
    print("✓ Excluded directories:")
    for dir_name in exclude_dirs:
        print(f"  - {dir_name}")

if __name__ == "__main__":
    print("🚀 Generating project road map...")
    display_excluded_dirs()
    generate_road_map()