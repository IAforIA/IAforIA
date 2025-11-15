# Quick Start Guide - Project Structure Generator

## What is this?

The Project Structure Generator (`create_project.py`) helps you quickly scaffold new projects with all the necessary files and folders already set up. No more manually creating directories and boilerplate files!

## How to Use

### 1. Create a New Project

Simply run:

```bash
python create_project.py my-project-name
```

This creates a web application by default.

### 2. Choose Your Project Type

You can specify what type of project you want:

**For a web application with HTML pages:**
```bash
python create_project.py my-webapp --type webapp
```

**For a REST API backend:**
```bash
python create_project.py my-api --type api
```

**For a full-stack application:**
```bash
python create_project.py my-fullstack --type fullstack
```

### 3. Set Up and Run

After creating your project:

```bash
# Navigate to your project
cd my-project-name

# Create a virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run your application
python main.py
```

### 4. Access Your Application

Open your browser and go to:
- **Application**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## What Gets Created?

### Web Application (`--type webapp`)

```
my-webapp/
├── main.py              # Your FastAPI app with templates
├── requirements.txt     # All needed Python packages
├── README.md           # Project documentation
├── .gitignore          # Git ignore file
├── manifest.json       # PWA configuration
├── static/
│   ├── css/
│   │   └── styles.css  # Your stylesheets
│   ├── js/             # JavaScript files
│   └── images/         # Images
├── templates/
│   └── index.html      # HTML templates
├── data/               # For databases/data files
└── logs/               # Application logs
```

### API Backend (`--type api`)

```
my-api/
├── main.py              # Your FastAPI app
├── requirements.txt     # All needed Python packages
├── README.md
├── .gitignore
├── app/
│   ├── api/            # Your API routes
│   ├── models/         # Data models
│   ├── services/       # Business logic
│   └── utils/          # Helper functions
├── tests/              # Your tests
├── data/
└── logs/
```

### Full-Stack (`--type fullstack`)

```
my-fullstack/
├── backend/            # Backend API
│   ├── main.py
│   └── ...
├── frontend/           # Frontend application
│   ├── index.html
│   └── ...
└── tests/
    ├── backend/
    └── frontend/
```

## Common Questions

**Q: Where will my project be created?**
A: In a new folder in your current directory. You can specify a different location with `--dir /path/to/folder`.

**Q: Can I customize the generated files?**
A: Yes! After creation, all files are yours to modify. The script just gives you a starting point.

**Q: What if the folder already exists?**
A: The script will ask if you want to continue. It's safe to say yes, but be careful not to overwrite important work.

**Q: Do I need to install anything first?**
A: You just need Python 3.7+ installed. The generated `requirements.txt` will list what to install for your project.

**Q: Can I create multiple projects?**
A: Yes! Run the command as many times as you need with different project names.

## Examples

### Creating a simple blog:
```bash
python create_project.py my-blog --type webapp
```

### Creating a REST API for a mobile app:
```bash
python create_project.py mobile-api --type api
```

### Creating a full web application:
```bash
python create_project.py ecommerce --type fullstack
```

### Creating a project in a specific folder:
```bash
python create_project.py my-project --dir ~/projects
```

## Need Help?

Run the help command:
```bash
python create_project.py --help
```

## What's Next?

After creating your project:

1. ✅ Navigate to the project folder
2. ✅ Set up a virtual environment
3. ✅ Install dependencies
4. ✅ Start coding!
5. ✅ Run and test your application
6. ✅ Deploy when ready

Happy coding! 🚀
