#!/bin/bash

# This script replaces hardcoded Basic Auth credentials in admin-dashboard-v2.html
# with code that uses stored authentication tokens instead

# Define the old and new authentication pattern
OLD_AUTH_PATTERN="        const response = await fetch('\/api\/admin\/([^']+)', {\n          headers: {\n            'Authorization': 'Basic ' \+ btoa\('admin:admin2025secure'\)\n          }\n        });"
NEW_AUTH_PATTERN="        // Get data using the stored auth token\n        const authToken = localStorage.getItem('auth_token');\n        const response = await fetch('/api/admin/\1', {\n          headers: {\n            'Authorization': authToken ? \`Bearer \${authToken}\` : ''\n          }\n        });"

# Apply the replacement
sed -i -E "s/$OLD_AUTH_PATTERN/$NEW_AUTH_PATTERN/g" public/admin-dashboard-v2.html

echo "Replacement completed"
