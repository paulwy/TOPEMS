#!/bin/bash

# Fix routes from :id to {id} format in all Rust files

cd /Users/xingzhai/TOPEMS

# List of files to fix
FILES=(
  "services/topems-erp/backend/src/api/db_structure.rs"
  "services/topems-erp/backend/src/api/budget.rs"
  "services/topems-erp/backend/src/api/voucher.rs"
  "services/topems-erp/backend/src/api/contract.rs"
  "services/topems-erp/backend/src/api/dict.rs"
  "services/topems-erp/backend/src/api/payment_schedule.rs"
  "services/topems-erp/backend/src/api/addressbook.rs"
  "services/topems-erp/backend/src/api/finance.rs"
  "services/topems-bi/backend/src/main.rs"
)

echo "Fixing route parameters in Rust files..."

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Replace : followed by word characters with {word}
    # Need to be careful, only replace route strings, not variables in code
    sed -i '' -E 's/\/:([a-zA-Z0-9_]+)/\/{\1}/g' "$file"
    echo "Updated $file"
  else
    echo "Warning: $file not found"
  fi
done

echo "Done!"
