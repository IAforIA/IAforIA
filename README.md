# IAforIA - Project Structure Generator

This repository includes a tool to help you quickly create new project file structures with all necessary boilerplate files.

## Quick Start

Use the `create_project.py` script to generate a new project:

```bash
python create_project.py my-new-project --type webapp
```

## Usage

### Basic Command

```bash
python create_project.py <project-name> [options]
```

### Options

- `--type` or `-t`: Project type (default: `webapp`)
  - `webapp`: Web application with HTML templates and static files
  - `api`: REST API backend only
  - `fullstack`: Full-stack application with separate frontend and backend

- `--dir` or `-d`: Base directory where the project will be created (default: current directory)

### Examples

#### Create a Web Application

```bash
python create_project.py my-webapp --type webapp
```

This creates:
```
my-webapp/
├── main.py                 # FastAPI application with template rendering
├── requirements.txt        # Python dependencies
├── manifest.json          # PWA manifest
├── README.md              # Project documentation
├── .gitignore             # Git ignore rules
├── static/
│   ├── css/
│   │   └── styles.css     # Base stylesheet
│   ├── js/
│   └── images/
├── templates/
│   └── index.html         # HTML template
├── data/                  # Data storage directory
└── logs/                  # Log files directory
```

#### Create an API Backend

```bash
python create_project.py my-api --type api
```

This creates:
```
my-api/
├── main.py                # FastAPI application
├── requirements.txt       # Python dependencies
├── README.md
├── .gitignore
├── app/
│   ├── __init__.py
│   ├── api/              # API routes
│   ├── models/           # Data models
│   ├── services/         # Business logic
│   └── utils/            # Utility functions
├── tests/                # Test files
├── data/
└── logs/
```

#### Create a Full-Stack Application

```bash
python create_project.py my-fullstack --type fullstack
```

This creates:
```
my-fullstack/
├── README.md
├── .gitignore
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   └── services/
│   ├── data/
│   └── logs/
├── frontend/
│   ├── index.html
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   └── pages/
│   └── static/
│       ├── css/
│       └── js/
└── tests/
    ├── backend/
    └── frontend/
```

#### Create a Project in a Specific Directory

```bash
python create_project.py my-project --type webapp --dir /path/to/projects
```

## After Creating a Project

Once your project structure is created, follow these steps:

1. **Navigate to the project directory:**
   ```bash
   cd my-project
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   - On Linux/Mac:
     ```bash
     source venv/bin/activate
     ```
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the application:**
   ```bash
   python main.py
   ```

6. **Access the application:**
   - Web Application: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Project Types Explained

### Web Application (`webapp`)

Best for:
- Traditional web applications with server-side rendering
- Projects that need HTML templates
- Applications with static assets (CSS, JS, images)

Includes:
- FastAPI with Jinja2 templates
- Static file serving
- Basic HTML/CSS structure
- PWA manifest

### API Backend (`api`)

Best for:
- RESTful API services
- Microservices
- Backend-only applications
- Mobile app backends

Includes:
- Structured FastAPI application
- Separation of concerns (API, models, services)
- Test directory structure
- CORS configuration

### Full-Stack (`fullstack`)

Best for:
- Complete web applications with separate frontend and backend
- Projects requiring clear separation between client and server
- Team projects with frontend and backend developers

Includes:
- Separate backend (FastAPI) and frontend directories
- Organized code structure for both sides
- Independent test directories
- Pre-configured CORS for local development

## Customization

You can customize the generated projects by:

1. **Editing the script**: Modify `create_project.py` to change default templates
2. **Adding templates**: Create new template methods for additional file types
3. **Creating new project types**: Add new project type options in the script

## Help

For help and all available options:

```bash
python create_project.py --help
```

## Examples from the Current Repository

This repository itself contains examples of:
- Web dashboards (`dashboard_*.html`)
- FastAPI backend (`main1.py`)
- PWA configuration (`manifest.json`, `service-worker.js`)
- Static assets organization

You can use these as references for understanding how the generated structures work.

## Troubleshooting

### Permission Denied

If you get a permission error on Linux/Mac:
```bash
chmod +x create_project.py
```

### Directory Already Exists

The script will ask for confirmation before overwriting existing directories. If you want to start fresh:
```bash
rm -rf my-project
python create_project.py my-project
```

### Import Errors

Make sure you're running the script with Python 3.7+:
```bash
python3 create_project.py my-project
```

## License

Proprietary - IA for IA™
