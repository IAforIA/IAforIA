# Project Structure Generator - Usage Examples

This document provides real-world examples of using the project structure generator.

## Example 1: Creating a Simple Web Dashboard

Let's create a web dashboard project:

```bash
python create_project.py sales-dashboard --type webapp
```

**Output:**
```
Creating project: sales-dashboard
Type: webapp
Location: /current/directory/sales-dashboard
  Created: static/css/
  Created: static/js/
  Created: static/images/
  Created: templates/
  Created: data/
  Created: logs/
  Created: requirements.txt
  Created: main.py
  Created: templates/index.html
  Created: static/css/styles.css
  Created: manifest.json
  Created: README.md
  Created: .gitignore

✓ Project 'sales-dashboard' created successfully!

Next steps:
  cd sales-dashboard
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
```

**What you get:**
- A complete FastAPI web application
- HTML templates ready to customize
- CSS framework with dark theme
- Static file serving configured
- PWA manifest for mobile support

## Example 2: Creating a REST API for Mobile App

Create a backend API:

```bash
python create_project.py mobile-backend --type api
```

**Result structure:**
```
mobile-backend/
├── main.py                    # FastAPI app entry point
├── requirements.txt           # Dependencies (FastAPI, SQLite, JWT, etc.)
├── app/
│   ├── api/                   # PUT YOUR API ROUTES HERE
│   ├── models/                # PUT YOUR DATA MODELS HERE
│   ├── services/              # PUT YOUR BUSINESS LOGIC HERE
│   └── utils/                 # PUT YOUR HELPER FUNCTIONS HERE
├── tests/                     # PUT YOUR TESTS HERE
└── data/                      # DATABASE FILES GO HERE
```

**Best for:**
- Mobile app backends
- Microservices
- Third-party integrations
- Standalone APIs

## Example 3: Creating a Full-Stack E-commerce Site

Create a complete web application:

```bash
python create_project.py my-shop --type fullstack
```

**Result structure:**
```
my-shop/
├── backend/                   # Python/FastAPI backend
│   ├── main.py
│   ├── requirements.txt
│   └── app/
│       ├── api/               # Product, cart, order APIs
│       ├── models/            # Product, user models
│       └── services/          # Payment, inventory logic
├── frontend/                  # HTML/JS frontend
│   ├── index.html
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   └── pages/             # Shop, cart, checkout pages
│   └── static/
│       ├── css/
│       └── js/
└── tests/
    ├── backend/               # API tests
    └── frontend/              # UI tests
```

**Best for:**
- Complex web applications
- Multi-page applications
- Team projects
- Scalable architectures

## Example 4: Creating Multiple Projects

You can create multiple projects easily:

```bash
# Create a customer portal
python create_project.py customer-portal --type webapp

# Create an admin API
python create_project.py admin-api --type api

# Create a mobile app backend
python create_project.py mobile-api --type api
```

## Example 5: Creating Projects in Specific Locations

Organize your projects in different directories:

```bash
# Create in a specific directory
python create_project.py my-app --type webapp --dir ~/projects

# Create in a parent directory
python create_project.py new-api --type api --dir /var/www

# Create in a workspace
python create_project.py workspace-app --type fullstack --dir ~/workspace
```

## Complete Workflow Example

Here's a complete workflow from creation to running:

### Step 1: Create the project
```bash
python create_project.py blog-app --type webapp
```

### Step 2: Navigate and set up
```bash
cd blog-app
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 3: Customize your app
Edit `templates/index.html`:
```html
<h1>My Awesome Blog</h1>
<p>Welcome to my blog!</p>
```

Edit `static/css/styles.css`:
```css
h1 {
    color: #11d6e7;
    font-size: 3em;
}
```

### Step 4: Run your app
```bash
python main.py
```

### Step 5: View in browser
Open http://localhost:8000

### Step 6: Start building!
- Add more routes in `main.py`
- Create more templates in `templates/`
- Add JavaScript in `static/js/`
- Add styles in `static/css/`

## Real-World Use Cases

### Use Case 1: Delivery Service Platform
```bash
python create_project.py delivery-platform --type fullstack
```
**Perfect for:** Building a platform like Guriri Express with customer portal, driver app, and central dashboard.

### Use Case 2: IoT Device API
```bash
python create_project.py iot-gateway --type api
```
**Perfect for:** Creating an API to receive and process data from IoT devices.

### Use Case 3: Internal Company Dashboard
```bash
python create_project.py company-dashboard --type webapp
```
**Perfect for:** Employee dashboards, reporting tools, admin panels.

### Use Case 4: SaaS Application
```bash
python create_project.py saas-app --type fullstack
```
**Perfect for:** Multi-tenant applications with user accounts and subscriptions.

## Tips and Tricks

### Tip 1: Use Descriptive Names
```bash
# Good names
python create_project.py customer-management-system --type fullstack
python create_project.py inventory-api --type api

# Less descriptive
python create_project.py app1 --type webapp
python create_project.py test --type api
```

### Tip 2: Start Small, Scale Later
Begin with a `webapp` or `api`, then migrate to `fullstack` when needed.

### Tip 3: Version Control from Start
```bash
python create_project.py my-app --type webapp
cd my-app
git init
git add .
git commit -m "Initial project structure"
```

### Tip 4: Use Virtual Environments Always
```bash
python -m venv venv
source venv/bin/activate
```
This keeps your project dependencies isolated.

### Tip 5: Customize After Creation
The generated files are starting points. Feel free to:
- Add more directories
- Modify the structure
- Add new dependencies
- Change configurations

## Comparison of Project Types

| Feature | webapp | api | fullstack |
|---------|--------|-----|-----------|
| HTML Templates | ✅ | ❌ | ✅ |
| Static Files | ✅ | ❌ | ✅ |
| Structured Backend | Basic | ✅ | ✅ |
| Separated Frontend | ❌ | ❌ | ✅ |
| Test Structure | ❌ | ✅ | ✅ |
| Best For | Simple sites | APIs | Complex apps |
| Complexity | Low | Medium | High |

## Common Patterns

### Pattern 1: Rapid Prototyping
```bash
python create_project.py prototype --type webapp
cd prototype
# Quick edits to templates and styles
python main.py
# Show to stakeholders immediately
```

### Pattern 2: API-First Development
```bash
python create_project.py backend --type api
# Build and test API first
# Add frontend later
```

### Pattern 3: Microservices Architecture
```bash
python create_project.py user-service --type api
python create_project.py payment-service --type api
python create_project.py notification-service --type api
# Each service is independent
```

## Next Steps

After creating your project:

1. **Read the generated README.md** - It contains specific instructions
2. **Check requirements.txt** - Understand what dependencies you have
3. **Explore main.py** - See how the app is structured
4. **Start coding!** - The structure is ready, now build your features

## Support

If you need help:
- Check `README.md` in your generated project
- Read `QUICKSTART.md` in this repository
- Run `python create_project.py --help`

Happy building! 🚀
