#!/usr/bin/env python3
"""
Project Structure Generator for IAforIA
This script helps create new project file structures with all necessary boilerplate.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional


class ProjectStructureGenerator:
    """Generates project file structures based on templates."""
    
    def __init__(self, project_name: str, project_type: str = "webapp", base_dir: Optional[str] = None):
        self.project_name = project_name
        self.project_type = project_type
        self.base_dir = Path(base_dir) if base_dir else Path.cwd() / project_name
        
    def create_structure(self):
        """Create the complete project structure."""
        print(f"Creating project: {self.project_name}")
        print(f"Type: {self.project_type}")
        print(f"Location: {self.base_dir}")
        
        if self.base_dir.exists():
            response = input(f"Directory {self.base_dir} already exists. Continue? (y/n): ")
            if response.lower() != 'y':
                print("Aborted.")
                return False
        
        # Create directory structure based on project type
        if self.project_type == "webapp":
            self._create_webapp_structure()
        elif self.project_type == "api":
            self._create_api_structure()
        elif self.project_type == "fullstack":
            self._create_fullstack_structure()
        else:
            print(f"Unknown project type: {self.project_type}")
            return False
            
        print(f"\n✓ Project '{self.project_name}' created successfully!")
        print(f"\nNext steps:")
        print(f"  cd {self.base_dir}")
        print(f"  python -m venv venv")
        print(f"  source venv/bin/activate  # On Windows: venv\\Scripts\\activate")
        print(f"  pip install -r requirements.txt")
        return True
    
    def _create_webapp_structure(self):
        """Create a web application structure."""
        # Create directories
        dirs = [
            "static/css",
            "static/js",
            "static/images",
            "templates",
            "data",
            "logs",
        ]
        
        for dir_path in dirs:
            (self.base_dir / dir_path).mkdir(parents=True, exist_ok=True)
            print(f"  Created: {dir_path}/")
        
        # Create files
        self._create_file("requirements.txt", self._get_webapp_requirements())
        self._create_file("main.py", self._get_webapp_main())
        self._create_file("templates/index.html", self._get_html_template())
        self._create_file("static/css/styles.css", self._get_css_template())
        self._create_file("manifest.json", self._get_manifest())
        self._create_file("README.md", self._get_readme())
        self._create_file(".gitignore", self._get_gitignore())
    
    def _create_api_structure(self):
        """Create an API-only structure."""
        dirs = [
            "app/api",
            "app/models",
            "app/services",
            "app/utils",
            "tests",
            "data",
            "logs",
        ]
        
        for dir_path in dirs:
            (self.base_dir / dir_path).mkdir(parents=True, exist_ok=True)
            print(f"  Created: {dir_path}/")
        
        # Create files
        self._create_file("requirements.txt", self._get_api_requirements())
        self._create_file("main.py", self._get_api_main())
        self._create_file("app/__init__.py", "")
        self._create_file("app/api/__init__.py", "")
        self._create_file("app/models/__init__.py", "")
        self._create_file("app/services/__init__.py", "")
        self._create_file("app/utils/__init__.py", "")
        self._create_file("README.md", self._get_readme())
        self._create_file(".gitignore", self._get_gitignore())
    
    def _create_fullstack_structure(self):
        """Create a full-stack application structure."""
        dirs = [
            "backend/app/api",
            "backend/app/models",
            "backend/app/services",
            "backend/data",
            "backend/logs",
            "frontend/src/components",
            "frontend/src/pages",
            "frontend/public",
            "frontend/static/css",
            "frontend/static/js",
            "tests/backend",
            "tests/frontend",
        ]
        
        for dir_path in dirs:
            (self.base_dir / dir_path).mkdir(parents=True, exist_ok=True)
            print(f"  Created: {dir_path}/")
        
        # Create backend files
        self._create_file("backend/requirements.txt", self._get_api_requirements())
        self._create_file("backend/main.py", self._get_fullstack_backend())
        self._create_file("backend/app/__init__.py", "")
        
        # Create frontend files
        self._create_file("frontend/index.html", self._get_html_template())
        self._create_file("frontend/static/css/styles.css", self._get_css_template())
        
        # Create root files
        self._create_file("README.md", self._get_readme())
        self._create_file(".gitignore", self._get_gitignore())
    
    def _create_file(self, filepath: str, content: str):
        """Create a file with given content."""
        full_path = self.base_dir / filepath
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Created: {filepath}")
    
    # Template content generators
    
    def _get_webapp_requirements(self) -> str:
        return """fastapi
uvicorn[standard]
jinja2
python-multipart
aiofiles
httpx
"""
    
    def _get_api_requirements(self) -> str:
        return """fastapi
uvicorn[standard]
pydantic
httpx
aiofiles
python-multipart
aiosqlite
PyJWT
websockets
"""
    
    def _get_webapp_main(self) -> str:
        return f'''"""
{self.project_name} - Web Application
"""

import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="{self.project_name}")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {{"request": request}})

@app.get("/health")
async def health():
    return {{"status": "healthy"}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
    
    def _get_api_main(self) -> str:
        return f'''"""
{self.project_name} - API Backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="{self.project_name} API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {{"message": "Welcome to {self.project_name} API"}}

@app.get("/health")
async def health():
    return {{"status": "healthy"}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
    
    def _get_fullstack_backend(self) -> str:
        return f'''"""
{self.project_name} - Backend API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="{self.project_name} Backend")

# CORS - adjust for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api")
async def root():
    return {{"message": "Welcome to {self.project_name} API"}}

@app.get("/api/health")
async def health():
    return {{"status": "healthy"}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
    
    def _get_html_template(self) -> str:
        return f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{self.project_name}</title>
    <link rel="stylesheet" href="/static/css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>{self.project_name}</h1>
        </header>
        <main>
            <p>Welcome to your new project!</p>
        </main>
        <footer>
            <p>Powered by IA for IA™</p>
        </footer>
    </div>
    <script src="/static/js/app.js"></script>
</body>
</html>
'''
    
    def _get_css_template(self) -> str:
        return '''* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --bg: #0b1116;
    --panel: #0f1720;
    --ink: #eaf6ff;
    --brand: #11d6e7;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: var(--bg);
    color: var(--ink);
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    padding: 20px 0;
    border-bottom: 1px solid var(--panel);
}

h1 {
    color: var(--brand);
}

main {
    padding: 40px 0;
}

footer {
    padding: 20px 0;
    border-top: 1px solid var(--panel);
    text-align: center;
    opacity: 0.7;
}
'''
    
    def _get_manifest(self) -> str:
        return json.dumps({
            "name": self.project_name,
            "short_name": self.project_name,
            "description": f"{self.project_name} - IA for IA Platform",
            "start_url": "./",
            "display": "standalone",
            "background_color": "#05090d",
            "theme_color": "#00e5ff",
            "icons": [
                {
                    "src": "icon.png",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ]
        }, indent=2)
    
    def _get_readme(self) -> str:
        return f'''# {self.project_name}

{self.project_name} - Built with IA for IA™ Platform

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python main.py
```

## Project Structure

```
{self.project_name}/
├── main.py              # Main application entry point
├── requirements.txt     # Python dependencies
├── README.md           # This file
└── ...
```

## Development

- Access the application at: http://localhost:8000
- API documentation: http://localhost:8000/docs

## License

Proprietary - IA for IA™
'''
    
    def _get_gitignore(self) -> str:
        return '''# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
*.egg-info/
dist/
build/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Application
data/
logs/
*.db
*.sqlite
uploads/
.env

# Node (if using frontend)
node_modules/
package-lock.json
'''


def main():
    parser = argparse.ArgumentParser(
        description="Create a new project structure for IAforIA platform",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s my-webapp --type webapp
  %(prog)s my-api --type api
  %(prog)s my-fullstack --type fullstack
  %(prog)s my-project --type webapp --dir /path/to/projects

Project Types:
  webapp     - Web application with HTML templates and static files
  api        - REST API backend only
  fullstack  - Full-stack with separate frontend and backend
        """
    )
    
    parser.add_argument(
        "name",
        help="Name of the new project"
    )
    
    parser.add_argument(
        "--type", "-t",
        choices=["webapp", "api", "fullstack"],
        default="webapp",
        help="Type of project to create (default: webapp)"
    )
    
    parser.add_argument(
        "--dir", "-d",
        help="Base directory where project will be created (default: current directory)"
    )
    
    args = parser.parse_args()
    
    generator = ProjectStructureGenerator(
        project_name=args.name,
        project_type=args.type,
        base_dir=args.dir
    )
    
    success = generator.create_structure()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
