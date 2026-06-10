import os
import re

files = [
    'department.rs',
    'contract.rs',
    'attendance.rs',
    'audit.rs',
    'position.rs',
    'leave.rs',
    'recruitment.rs',
    'payroll.rs',
    'performance.rs',
    'training.rs'
]

for filename in files:
    filepath = os.path.join('/Users/air/TOPEMS/services/topems-hrm/backend/src/api', filename)
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Step 1: Remove the imports we don't need
    content = re.sub(
        r'use sqlx::postgres::PgPool;\nuse std::sync::Arc;\n',
        '',
        content
    )
    
    # Step 2: Add ApiState import
    content = re.sub(
        r'use topems_shared::\{ApiResponse, api_error\};',
        r'use topems_shared::{ApiResponse, api_error};\nuse super::ApiState;',
        content
    )
    
    # Step 3: Remove AppState struct
    content = re.sub(
        r'pub struct AppState \{\n    pub db: PgPool,\n\}\n\n',
        '',
        content
    )
    
    # Step 4: Update create_routes function
    # This is a more robust approach
    lines = content.split('\n')
    new_lines = []
    in_create_routes = False
    app_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        if 'pub async fn create_routes' in line:
            in_create_routes = True
            new_lines.append('pub fn create_routes() -> Router<ApiState> {')
            new_lines.append('    Router::new()')
            i += 1
            continue
        
        if in_create_routes:
            if '.with_state(state);' in line:
                in_create_routes = False
                # Skip the rest of the create_routes function
                while i < len(lines) and '}' not in lines[i]:
                    i += 1
                i += 1  # Skip the closing }
                new_lines.extend(app_lines)
                new_lines.append('}')
                continue
            
            if '.route' in line or '.merge' in line:
                app_lines.append('    ' + line.strip())
            i += 1
            continue
        
        # Step 5: Update State<Arc<AppState>> to State<ApiState>
        line = re.sub(
            r'State\(state\): State<Arc<AppState>>',
            r'State(state): State<ApiState>',
            line
        )
        
        new_lines.append(line)
        i += 1
    
    content = '\n'.join(new_lines)
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f'Updated {filename}')

print('All files updated successfully!')
