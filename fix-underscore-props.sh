#!/bin/bash
# Fix underscore-prefixed properties in component files
# Pattern: props._className -> props.className, etc.

PROPERTIES=(
  _absoluteFormat _active _autoFocus _children _className _closeOnBackdropClick
  _cropAspect _defaultGroupExpanded _enableFileUpload _enableRetry _enableTerrain
  _error _fallback _filterConfig _filters _format _installedPlugins _isAnimated
  _item _level _loading _node _onCardArchive _onCardDelete _onCardEdit _onClose
  _onDownload _onError _onFilterChange _onPrint _onReport _renderRowActions
  _responsive _search _showDetails _showIcon _showSettingsDialog _showStepNumbers
  _size _spacing _target _terrain _theme _tileDir _treeConfig _uploadConfig
  _uploadText _versionConfig _zoom _TreeNode _sourceIndex
)

WEB_SRC="/Users/xingzhai/TOPEMS/apps/web/src"

for prop in "${PROPERTIES[@]}"; do
  if [[ "$prop" == _* ]]; then
    base="${prop#_}"
    files=$(grep -rl "$prop" "$WEB_SRC" --include="*.tsx" --include="*.ts" 2>/dev/null)
    for file in $files; do
      sed -i '' "s/${prop}/${base}/g" "$file"
      echo "Fixed ${prop} -> ${base} in $file"
    done
  fi
done

echo "Done fixing underscore properties."
