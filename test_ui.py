import re

file_path = "src/app/generer-carte/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Replace final data assignment block in handleSubmit to dump architectureJson if categories are empty
hook = "const data = JSON.parse(enrichResStr);"
new_hook = """const data = JSON.parse(enrichResStr);
      // DEBUG
      if (data.json && data.json.includes('"categories": {}')) {
           setResultat({ success: false, error: "AI generated an empty structure. Raw AI output was: " + archRes.architectureJson });
           return;
      }"""
content = content.replace(hook, new_hook)

with open(file_path, "w") as f:
    f.write(content)

print("Debug injected into handler.")
