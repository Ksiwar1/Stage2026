file_path = "src/app/actions/genererCarteAction.ts"
with open(file_path, "r") as f:
    content = f.read()

target = """    // Initialisation exacte du format ETK360
    const finalData = {
        title: restaurantName || data.get("sujet") || "Nouveau Restaurant",
        theme: originalTheme,"""

new_content = """    // Initialisation exacte du format ETK360
    const finalData = {
        title: restaurantName || "Nouveau Restaurant",
        theme: originalTheme,"""

if target in content:
    content = content.replace(target, new_content)
    with open(file_path, "w") as f:
        f.write(content)
    print("Replaced finalData title successfully")
else:
    print("Target block not found for finalData title")

target_filename = """      let safeNameRaw = restaurantName || (data.get("sujet") as string) || "Restaurant IA";
      
      // Cleanup de la chaine (on retire le "Je veux un vrai restaurant de : ") pour le filename
      safeNameRaw = safeNameRaw.replace("Je veux un vrai restaurant de : ", "");
      const safeName = safeNameRaw.slice(0, 30).replace(/[^a-z0-9A-Z]/gi, '_').toLowerCase();"""

new_filename = """      let safeNameRaw = restaurantName || "Restaurant IA";
      
      // Cleanup de la chaine (on retire le "Je veux un vrai restaurant de : ") pour le filename
      safeNameRaw = safeNameRaw.replace("Je veux un vrai restaurant de : ", "");
      const safeName = safeNameRaw.slice(0, 30).replace(/[^a-z0-9A-Z]/gi, '_').toLowerCase();"""

if target_filename in content:
    content = content.replace(target_filename, new_filename)
    with open(file_path, "w") as f:
        f.write(content)
    print("Replaced filename logic successfully")
else:
    print("Target block not found for filename logic")
