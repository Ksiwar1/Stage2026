import re

file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

target = '    \n    architectureJson = architectureJson.replace(/```json/gi, "").replace(/```/g, "").trim();'
new_content = '    let architectureJson = await generateAIResponse(promptSysteme1, promptUtilisateur1, 0.7, aiType, base64Image, 1000);\n    architectureJson = architectureJson.replace(/```json/gi, "").replace(/```/g, "").trim();'

content = content.replace(target, new_content)

with open(file_path, "w") as f:
    f.write(content)
print("GenerateAIResponse restored")
