file_path = "src/components/CarteVisuelle.tsx"
with open(file_path, "r") as f:
    content = f.read()

target = """              </div>

            <div style={{
              width: '100%',"""

# First find where the component starts to compute a cleaned up name
# Since it's a component render, we can inject logic at the beginning of the `if (summary.type === 'ETK360_CATALOG') {` block.

header_target = """  if (summary.type === 'ETK360_CATALOG') {
    return ("""

header_new = """  if (summary.type === 'ETK360_CATALOG') {
    let displayName = summary.restaurantName;
    if (!displayName) {
       displayName = summary.nomFichier.replace('.json', '').replace(/^ia_*/, '').replace(/_/g, ' ');
       if (displayName.strip() == '' || displayName.startswith('INSTRUCTIONS STRUCT')) {
           displayName = "Restaurant IA";
       }
    }
    return ("""

if header_target in content:
    content = content.replace(header_target, header_new)

    display_target = """{summary.restaurantName || summary.nomFichier.replace('.json', '')}"""
    display_new = """{displayName}"""
    
    # We also need to fix the fallback letter in the logo circle
    logo_target = """{(summary.restaurantName || "R").charAt(0)}"""
    logo_new = """{(displayName || "R").charAt(0)}"""
    
    content = content.replace(display_target, display_new)
    content = content.replace(logo_target, logo_new)

    with open(file_path, "w") as f:
        f.write(content)
    print("Replaced CarteVisuelle safely")
else:
    print("Header block not found")
