import json

# Read the source JSON file
with open('pepe_entries_extracted.json', 'r') as f:
    data = json.loads(f.read())

# Extract unique IDs
ids = set()
for entry in data:
    if 'id' in entry:
        ids.add(entry['id'])

# Sort the IDs alphabetically
sorted_ids = sorted(list(ids))

# Write to our target file
with open('static/data/pepe_coins.json', 'w') as f:
    json.dump(sorted_ids, f, indent=4)

print(f"Processed {len(sorted_ids)} unique Pepe IDs")