import fs from 'fs';
import path from 'path';

const pagesDir = path.join(path.dirname(import.meta.url).replace('file://', ''), '../src/pages');

function fixSxSplit(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  const sxSplitRegex = /sx=\{\s*([^}]+?)\s*\}\s*,\s*(borderBottom|borderColor|bgcolor|fontWeight|pl|pr|pt|pb|mt|mr|mb|ml|width|height|display|alignItems|justifyContent|gap|flex|flexShrink|flexGrow|overflow|position|top|left|right|bottom|zIndex|opacity|transition|cursor|textAlign|textTransform|fontSize|color|lineHeight|letterSpacing|whiteSpace|wordBreak|background|backgroundColor|border|borderRadius|boxShadow|padding|margin|minWidth|maxWidth|minHeight|maxHeight|transform|visibility|pointerEvents|userSelect|textOverflow|verticalAlign|float|clear|tableLayout|borderCollapse|listStyle|quotes|content|counterReset|counterIncrement|direction|unicodeBidi|writingMode|textOrientation|textCombineUpright|rubyPosition|rubyAlign|rubyOverhang|rubySpan|fontVariantLigatures|fontVariantNumeric|fontVariantAlternates|fontVariantCaps|fontStyle|fontStretch|fontKerning|fontVariantEastAsian|fontFeatureSettings|fontLanguageOverride|fontOpticalSizing|fontVariationSettings|fontSizeAdjust|fontDisplay|fontFamily|src|ascentOverride|descentOverride|lineGapOverride|sizeAdjust|unicodeRange|fontVariant|fontWeight|fontSize|lineHeight|color|backgroundColor|backgroundImage|backgroundPosition|backgroundSize|backgroundRepeat|backgroundAttachment|backgroundClip|backgroundOrigin|backgroundBlendMode|boxDecorationBreak|boxShadow|boxSizing|breakAfter|breakBefore|breakInside|captionSide|caretColor|clear|clip|clipPath|colorScheme|columns|columnCount|columnFill|columnGap|columnRule|columnRuleColor|columnRuleStyle|columnRuleWidth|columnSpan|columnWidth|content|counterIncrement|counterReset|cursor|direction|display|emptyCells|filter|flex|flexBasis|flexDirection|flexFlow|flexGrow|flexShrink|flexWrap|float|font|fontFamily|fontFeatureSettings|fontKerning|fontLanguageOverride|fontOpticalSizing|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontVariantAlternates|fontVariantCaps|fontVariantEastAsian|fontVariantLigatures|fontVariantNumeric|fontVariationSettings|fontWeight|gap|grid|gridArea|gridAutoColumns|gridAutoFlow|gridAutoRows|gridColumn|gridColumnEnd|gridColumnGap|gridColumnStart|gridGap|gridRow|gridRowEnd|gridRowGap|gridRowStart|gridTemplate|gridTemplateAreas|gridTemplateColumns|gridTemplateRows|hangingPunctuation|height|hyphens|imageRendering|imeMode|includeFragment|initialLetter|inlineSize|inset|isolation|justifyContent|justifyItems|justifySelf|left|letterSpacing|lightingColor|lineBreak|lineHeight|listStyle|margin|marginBlock|marginBlockEnd|marginBlockStart|marginBottom|marginInline|marginInlineEnd|marginInlineStart|marginLeft|marginRight|marginTop|mask|maskBorder|maskBorderMode|maskBorderOutset|maskBorderRepeat|maskBorderSlice|maskBorderSource|maskBorderWidth|maskClip|maskComposite|maskImage|maskMode|maskOrigin|maskPosition|maskRepeat|maskSize|maskType|maxBlockSize|maxHeight|maxInlineSize|maxWidth|minBlockSize|minHeight|minInlineSize|minWidth|mixBlendMode|objectFit|objectPosition|offset|offsetAnchor|offsetDistance|offsetPath|offsetRotate|opacity|order|orphans|outline|outlineColor|outlineOffset|outlineStyle|outlineWidth|overflow|overflowAnchor|overflowWrap|overflowX|overflowY|padding|paddingBlock|paddingBlockEnd|paddingBlockStart|paddingBottom|paddingInline|paddingInlineEnd|paddingInlineStart|paddingLeft|paddingRight|paddingTop|pageBreakAfter|pageBreakBefore|pageBreakInside|paintOrder|perspective|perspectiveOrigin|placeContent|placeItems|placeSelf|pointerEvents|position|quotes|resize|right|rubyAlign|rubyOverhang|rubyPosition|rubySpan|scrollBehavior|scrollMargin|scrollMarginBlock|scrollMarginBlockEnd|scrollMarginBlockStart|scrollMarginBottom|scrollMarginInline|scrollMarginInlineEnd|scrollMarginInlineStart|scrollMarginLeft|scrollMarginRight|scrollMarginTop|scrollPadding|scrollPaddingBlock|scrollPaddingBlockEnd|scrollPaddingBlockStart|scrollPaddingBottom|scrollPaddingInline|scrollPaddingInlineEnd|scrollPaddingInlineStart|scrollPaddingLeft|scrollPaddingRight|scrollPaddingTop|scrollSnapAlign|scrollSnapStop|scrollSnapType|shapeImageThreshold|shapeMargin|shapeOutside|tableLayout|tabSize|textAlign|textAlignLast|textCombineUpright|textDecoration|textDecorationColor|textDecorationLine|textDecorationStyle|textDecorationThickness|textEmphasis|textEmphasisColor|textEmphasisPosition|textEmphasisStyle|textIndent|textJustify|textOrientation|textOverflow|textShadow|textTransform|textUnderlineOffset|textUnderlinePosition|top|touchAction|transform|transformBox|transformOrigin|transformStyle|transition|transitionDelay|transitionDuration|transitionProperty|transitionTimingFunction|translate|unicodeBidi|userSelect|verticalAlign|visibility|whiteSpace|widows|width|willChange|wordBreak|wordSpacing|wordWrap|writingMode|zIndex)\s*=\s*([^,>]+?)(?=\s*(,|>|\}))/g;

  content = content.replace(sxSplitRegex, (match, sxContent, propName, propValue) => {
    changed = true;
    return `sx={{ ${sxContent}, ${propName}: ${propValue} }}`;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed sx split in ${path.basename(filePath)}`);
  }
}

function processFiles() {
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx'));
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fixSxSplit(filePath);
  });
  
  console.log('\nProcessing complete!');
}

processFiles();