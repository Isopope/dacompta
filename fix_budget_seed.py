import re

# Read the seed file
with open('prisma/seed.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the BUDGET_POSTES section and replace compteLie values
# We'll replace each entry to use the exact account number as compteLie
# instead of the prefix

# Pattern to match each budget post entry
pattern = r'\{\s*code: "(\d+)",\s*libelle: "([^"]*)",\s*sens: "([PC])",\s*prevision: (\d+),\s*compteLie: "([^"])"\}'

def replace_compteLie(match):
    code = match.group(1)  # the account code
    libelle = match.group(2)
    sens = match.group(3)
    prevision = match.group(4)
    # Use the exact account code as compteLie instead of prefix
    return f'{{ code: "{code}", libelle: "{libelle}", sens: "{sens}", prevision: {prevision}, compteLie: "{code}" }}'

# Apply the replacement
new_content = re.sub(pattern, replace_compteLie, content)

# Write the fixed file
with open('prisma/seed.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Budget seed data updated to use exact account numbers")
