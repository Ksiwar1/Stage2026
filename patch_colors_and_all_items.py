import re

file_path_page = "src/app/generer-carte/page.tsx"
with open(file_path_page, "r") as f:
    content_page = f.read()

# 1. Fix color propagation in KioskSimulator tag
old_kiosk = "themePalette={{ primary: '#4f46e5', secondary: '#4338ca', text: '#111827', onPrimary: 'white' }}"
new_kiosk = "themePalette={{ primary: wizardData.primaryColor, secondary: wizardData.secondaryColor, text: '#111827', onPrimary: 'white' }}"
content_page = content_page.replace(old_kiosk, new_kiosk)

with open(file_path_page, "w") as f:
    f.write(content_page)

file_path_action = "src/app/actions/genererCarteAction.ts"
with open(file_path_action, "r") as f:
    content_action = f.read()

# 2. Make the rule universal
old_if = "if (isFoodItem) {"
new_if = "if (true) {"
content_action = content_action.replace(old_if, new_if)

# Delete the else branch if present
# We need to find `} else {` and the inner block that creates Sizes
print("Script running...")
else_idx = content_action.find('} else {\n                        const requiresSizes')
if else_idx != -1:
    end_of_else = content_action.find('                    }', else_idx + 10)
    if end_of_else != -1:
        # Actually there is another closing brace for `if (requiresSizes)`
        # Let's just use regex or exact replacement
        # It's safer to just replace the whole block dynamically.
        pass

