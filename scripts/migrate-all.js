const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'apps/web/src');

function shouldExclude(filePath) {
  const excluded = ['node_modules', '.d.ts', 'theme/', 'constants/colors.ts'];
  return excluded.some(dir => filePath.includes(dir));
}

function getAllFiles(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results.push(...getAllFiles(filePath));
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !shouldExclude(filePath)) {
      results.push(filePath);
    }
  });
  
  return results;
}

const files = getAllFiles(srcDir);

let totalChanges = 0;
let filesChanged = 0;

const colorMap = [
  { old: /'#e5e7eb'/g, new: "'grey.200'" },
  { old: /"#e5e7eb"/g, new: '"grey.200"' },
  { old: /'#f9fafb'/g, new: "'grey.50'" },
  { old: /"#f9fafb"/g, new: '"grey.50"' },
  { old: /'#f3f4f6'/g, new: "'grey.100'" },
  { old: /"#f3f4f6"/g, new: '"grey.100"' },
  { old: /'#d1d5db'/g, new: "'grey.300'" },
  { old: /"#d1d5db"/g, new: '"grey.300"' },
  { old: /'#4b5563'/g, new: "'text.secondary'" },
  { old: /"#4b5563"/g, new: '"text.secondary"' },
  { old: /'#6b7280'/g, new: "'text.secondary'" },
  { old: /"#6b7280"/g, new: '"text.secondary"' },
  { old: /'#9ca3af'/g, new: "'text.disabled'" },
  { old: /"#9ca3af"/g, new: '"text.disabled"' },
  { old: /'#111827'/g, new: "'text.primary'" },
  { old: /"#111827"/g, new: '"text.primary"' },
  { old: /'#3b82f6'/g, new: "'primary.main'" },
  { old: /"#3b82f6"/g, new: '"primary.main"' },
  { old: /'#10B981'/g, new: "'success.main'" },
  { old: /"#10B981"/g, new: '"success.main"' },
  { old: /'#facc15'/g, new: "'warning.main'" },
  { old: /"#facc15"/g, new: '"warning.main"' },
  { old: /'#EF4444'/g, new: "'error.main'" },
  { old: /"#EF4444"/g, new: '"error.main"' },
  { old: /'#2563eb'/g, new: "'primary.dark'" },
  { old: /"#2563eb"/g, new: '"primary.dark"' },
  { old: /'#ffffff'/g, new: "'white'" },
  { old: /"#ffffff"/g, new: '"white"' },
  { old: /'#000000'/g, new: "'black'" },
  { old: /"#000000"/g, new: '"black"' },
  { old: /'#1f2937'/g, new: "'grey.800'" },
  { old: /"#1f2937"/g, new: '"grey.800"' },
  { old: /'#374151'/g, new: "'grey.700'" },
  { old: /"#374151"/g, new: '"grey.700"' },
  { old: /'#737373'/g, new: "'grey.500'" },
  { old: /"#737373"/g, new: '"grey.500"' },
  { old: /'#e2e8f0'/g, new: "'border.default'" },
  { old: /"#e2e8f0"/g, new: '"border.default"' },
  { old: /'#f1f5f9'/g, new: "'grey.100'" },
  { old: /"#f1f5f9"/g, new: '"grey.100"' },
  { old: /'#10b981'/g, new: "'success.main'" },
  { old: /"#10b981"/g, new: '"success.main"' },
  { old: /'#ef4444'/g, new: "'error.main'" },
  { old: /"#ef4444"/g, new: '"error.main"' },
  { old: /'#f59e0b'/g, new: "'warning.main'" },
  { old: /"#f59e0b"/g, new: '"warning.main"' },
  { old: /'#8b5cf6'/g, new: "'secondary.main'" },
  { old: /"#8b5cf6"/g, new: '"secondary.main"' },
  { old: /'#a78bfa'/g, new: "'secondary.light'" },
  { old: /"#a78bfa"/g, new: '"secondary.light"' },
];

files.forEach((fullPath) => {
  let content = fs.readFileSync(fullPath, 'utf-8');
  let changes = 0;

  colorMap.forEach(({ old: oldPattern, new: newStr }) => {
    const matches = content.match(oldPattern);
    if (matches) {
      changes += matches.length;
      content = content.replace(oldPattern, newStr);
    }
  });

  if (changes > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    const relPath = fullPath.replace(srcDir + '/', '');
    console.log(`[COLOR] Updated ${relPath}: ${changes} changes`);
    totalChanges += changes;
    filesChanged++;
  }
});

console.log(`\nColor migration done! Updated ${filesChanged} files with ${totalChanges} total changes.\n`);

totalChanges = 0;
filesChanged = 0;

files.forEach((fullPath) => {
  let content = fs.readFileSync(fullPath, 'utf-8');
  let changes = 0;

  const anyMatches = content.match(/: any/g);
  if (anyMatches) {
    const originalContent = content;
    
    content = content.replace(/catch\s*\(\s*(\w+)\s*:\s*any\s*\)/g, 'catch ($1)');
    content = content.replace(/onError\s*:\s*\(\s*(\w+)\s*:\s*any\s*\)/g, 'onError: ($1)');
    content = content.replace(/onSuccess\s*:\s*\(\s*(\w+)\s*:\s*any\s*\)/g, 'onSuccess: ($1)');
    content = content.replace(/onComplete\s*:\s*\(\s*(\w+)\s*:\s*any\s*\)/g, 'onComplete: ($1)');
    content = content.replace(/onChange\s*:\s*\(\s*(\w+)\s*:\s*any\s*\)/g, 'onChange: ($1)');
    content = content.replace(/onClick\s*:\s*\(\s*(\w+)\s*:\s*any\s*\)/g, 'onClick: ($1)');
    content = content.replace(/onSelect\s*:\s*\(\s*(\w+)\s*:\s*any\s*\)/g, 'onSelect: ($1)');
    content = content.replace(/handle\w+\s*\(\s*(\w+)\s*:\s*any\s*\)/g, (match, p1) => {
      return match.replace(/:\s*any/, ': unknown');
    });

    const replacedAnyCount = (content.match(/: any/g) || []).length;
    changes = (originalContent.match(/: any/g) || []).length - replacedAnyCount;

    if (changes > 0) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      const relPath = fullPath.replace(srcDir + '/', '');
      console.log(`[ANY] Updated ${relPath}: ${changes} changes`);
      totalChanges += changes;
      filesChanged++;
    }
  }
});

console.log(`\nAny type migration done! Updated ${filesChanged} files with ${totalChanges} total changes.\n`);

totalChanges = 0;
filesChanged = 0;

files.forEach((fullPath) => {
  let content = fs.readFileSync(fullPath, 'utf-8');
  let changes = 0;

  content = content.replace(/className="flex"/g, 'sx={{ display: "flex" }}');
  content = content.replace(/className='flex'/g, "sx={{ display: 'flex' }}");
  content = content.replace(/className="flex-col"/g, 'sx={{ display: "flex", flexDirection: "column" }}');
  content = content.replace(/className='flex-col'/g, "sx={{ display: 'flex', flexDirection: 'column' }}");
  content = content.replace(/className="flex-row"/g, 'sx={{ display: "flex", flexDirection: "row" }}');
  content = content.replace(/className='flex-row'/g, "sx={{ display: 'flex', flexDirection: 'row' }}");
  content = content.replace(/className="justify-center"/g, 'sx={{ justifyContent: "center" }}');
  content = content.replace(/className='justify-center'/g, "sx={{ justifyContent: 'center' }}");
  content = content.replace(/className="items-center"/g, 'sx={{ alignItems: "center" }}');
  content = content.replace(/className='items-center'/g, "sx={{ alignItems: 'center' }}");
  content = content.replace(/className="gap-2"/g, 'sx={{ gap: 2 }}');
  content = content.replace(/className='gap-2'/g, "sx={{ gap: 2 }}");
  content = content.replace(/className="gap-3"/g, 'sx={{ gap: 3 }}');
  content = content.replace(/className='gap-3'/g, "sx={{ gap: 3 }}");
  content = content.replace(/className="gap-4"/g, 'sx={{ gap: 4 }}');
  content = content.replace(/className='gap-4'/g, "sx={{ gap: 4 }}");
  content = content.replace(/className="w-full"/g, 'sx={{ width: "100%" }}');
  content = content.replace(/className='w-full'/g, "sx={{ width: '100%' }}");
  content = content.replace(/className="h-full"/g, 'sx={{ height: "100%" }}');
  content = content.replace(/className='h-full'/g, "sx={{ height: '100%' }}");
  content = content.replace(/className="p-2"/g, 'sx={{ p: 2 }}');
  content = content.replace(/className='p-2'/g, "sx={{ p: 2 }}");
  content = content.replace(/className="p-3"/g, 'sx={{ p: 3 }}');
  content = content.replace(/className='p-3'/g, "sx={{ p: 3 }}");
  content = content.replace(/className="p-4"/g, 'sx={{ p: 4 }}');
  content = content.replace(/className='p-4'/g, "sx={{ p: 4 }}");
  content = content.replace(/className="m-2"/g, 'sx={{ m: 2 }}');
  content = content.replace(/className='m-2'/g, "sx={{ m: 2 }}");
  content = content.replace(/className="m-3"/g, 'sx={{ m: 3 }}');
  content = content.replace(/className='m-3'/g, "sx={{ m: 3 }}");
  content = content.replace(/className="rounded"/g, 'sx={{ borderRadius: 1 }}');
  content = content.replace(/className='rounded'/g, "sx={{ borderRadius: 1 }}");
  content = content.replace(/className="rounded-lg"/g, 'sx={{ borderRadius: 2 }}');
  content = content.replace(/className='rounded-lg'/g, "sx={{ borderRadius: 2 }}");
  content = content.replace(/className="rounded-xl"/g, 'sx={{ borderRadius: 3 }}');
  content = content.replace(/className='rounded-xl'/g, "sx={{ borderRadius: 3 }}");
  content = content.replace(/className="border"/g, 'sx={{ border: 1 }}');
  content = content.replace(/className='border'/g, "sx={{ border: 1 }}");
  content = content.replace(/className="border-gray-200"/g, 'sx={{ borderColor: "grey.200" }}');
  content = content.replace(/className='border-gray-200'/g, "sx={{ borderColor: 'grey.200' }}");
  content = content.replace(/className="bg-gray-50"/g, 'sx={{ backgroundColor: "grey.50" }}');
  content = content.replace(/className='bg-gray-50'/g, "sx={{ backgroundColor: 'grey.50' }}");
  content = content.replace(/className="bg-gray-100"/g, 'sx={{ backgroundColor: "grey.100" }}');
  content = content.replace(/className='bg-gray-100'/g, "sx={{ backgroundColor: 'grey.100' }}");
  content = content.replace(/className="bg-white"/g, 'sx={{ backgroundColor: "white" }}');
  content = content.replace(/className='bg-white'/g, "sx={{ backgroundColor: 'white' }}");
  content = content.replace(/className="text-gray-500"/g, 'sx={{ color: "grey.500" }}');
  content = content.replace(/className='text-gray-500'/g, "sx={{ color: 'grey.500' }}");
  content = content.replace(/className="text-gray-600"/g, 'sx={{ color: "grey.600" }}');
  content = content.replace(/className='text-gray-600'/g, "sx={{ color: 'grey.600' }}");
  content = content.replace(/className="text-gray-700"/g, 'sx={{ color: "grey.700" }}');
  content = content.replace(/className='text-gray-700'/g, "sx={{ color: 'grey.700' }}");
  content = content.replace(/className="text-gray-800"/g, 'sx={{ color: "grey.800" }}');
  content = content.replace(/className='text-gray-800'/g, "sx={{ color: 'grey.800' }}");
  content = content.replace(/className="text-center"/g, 'sx={{ textAlign: "center" }}');
  content = content.replace(/className='text-center'/g, "sx={{ textAlign: 'center' }}");
  content = content.replace(/className="text-sm"/g, 'sx={{ fontSize: "small" }}');
  content = content.replace(/className='text-sm'/g, "sx={{ fontSize: 'small' }}");
  content = content.replace(/className="text-base"/g, 'sx={{ fontSize: "body1" }}');
  content = content.replace(/className='text-base'/g, "sx={{ fontSize: 'body1' }}");
  content = content.replace(/className="font-medium"/g, 'sx={{ fontWeight: 500 }}');
  content = content.replace(/className='font-medium'/g, "sx={{ fontWeight: 500 }}");
  content = content.replace(/className="font-semibold"/g, 'sx={{ fontWeight: 600 }}');
  content = content.replace(/className='font-semibold'/g, "sx={{ fontWeight: 600 }}");
  content = content.replace(/className="cursor-pointer"/g, 'sx={{ cursor: "pointer" }}');
  content = content.replace(/className='cursor-pointer'/g, "sx={{ cursor: 'pointer' }}");
  content = content.replace(/className="overflow-hidden"/g, 'sx={{ overflow: "hidden" }}');
  content = content.replace(/className='overflow-hidden'/g, "sx={{ overflow: 'hidden' }}");
  content = content.replace(/className="overflow-auto"/g, 'sx={{ overflow: "auto" }}');
  content = content.replace(/className='overflow-auto'/g, "sx={{ overflow: 'auto' }}");
  content = content.replace(/className="truncate"/g, 'sx={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}');
  content = content.replace(/className='truncate'/g, "sx={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}");
  content = content.replace(/className="flex-1"/g, 'sx={{ flex: 1 }}');
  content = content.replace(/className='flex-1'/g, "sx={{ flex: 1 }}");
  content = content.replace(/className="flex-wrap"/g, 'sx={{ flexWrap: "wrap" }}');
  content = content.replace(/className='flex-wrap'/g, "sx={{ flexWrap: 'wrap' }}");
  content = content.replace(/className="justify-between"/g, 'sx={{ justifyContent: "space-between" }}');
  content = content.replace(/className='justify-between'/g, "sx={{ justifyContent: 'space-between' }}");
  content = content.replace(/className="justify-start"/g, 'sx={{ justifyContent: "flex-start" }}');
  content = content.replace(/className='justify-start'/g, "sx={{ justifyContent: 'flex-start' }}");
  content = content.replace(/className="justify-end"/g, 'sx={{ justifyContent: "flex-end" }}');
  content = content.replace(/className='justify-end'/g, "sx={{ justifyContent: 'flex-end' }}");
  content = content.replace(/className="items-start"/g, 'sx={{ alignItems: "flex-start" }}');
  content = content.replace(/className='items-start'/g, "sx={{ alignItems: 'flex-start' }}");
  content = content.replace(/className="items-end"/g, 'sx={{ alignItems: "flex-end" }}');
  content = content.replace(/className='items-end'/g, "sx={{ alignItems: 'flex-end' }}");
  content = content.replace(/className="items-stretch"/g, 'sx={{ alignItems: "stretch" }}');
  content = content.replace(/className='items-stretch'/g, "sx={{ alignItems: 'stretch' }}");
  content = content.replace(/className="gap-1"/g, 'sx={{ gap: 1 }}');
  content = content.replace(/className='gap-1'/g, "sx={{ gap: 1 }}");
  content = content.replace(/className="gap-5"/g, 'sx={{ gap: 5 }}');
  content = content.replace(/className='gap-5'/g, "sx={{ gap: 5 }}");
  content = content.replace(/className="gap-6"/g, 'sx={{ gap: 6 }}');
  content = content.replace(/className='gap-6'/g, "sx={{ gap: 6 }}");
  content = content.replace(/className="mt-2"/g, 'sx={{ mt: 2 }}');
  content = content.replace(/className='mt-2'/g, "sx={{ mt: 2 }}");
  content = content.replace(/className="mt-3"/g, 'sx={{ mt: 3 }}');
  content = content.replace(/className='mt-3'/g, "sx={{ mt: 3 }}");
  content = content.replace(/className="mt-4"/g, 'sx={{ mt: 4 }}');
  content = content.replace(/className='mt-4'/g, "sx={{ mt: 4 }}");
  content = content.replace(/className="mb-2"/g, 'sx={{ mb: 2 }}');
  content = content.replace(/className='mb-2'/g, "sx={{ mb: 2 }}");
  content = content.replace(/className="mb-3"/g, 'sx={{ mb: 3 }}');
  content = content.replace(/className='mb-3'/g, "sx={{ mb: 3 }}");
  content = content.replace(/className="mb-4"/g, 'sx={{ mb: 4 }}');
  content = content.replace(/className='mb-4'/g, "sx={{ mb: 4 }}");
  content = content.replace(/className="ml-2"/g, 'sx={{ ml: 2 }}');
  content = content.replace(/className='ml-2'/g, "sx={{ ml: 2 }}");
  content = content.replace(/className="mr-2"/g, 'sx={{ mr: 2 }}');
  content = content.replace(/className='mr-2'/g, "sx={{ mr: 2 }}");
  content = content.replace(/className="pt-2"/g, 'sx={{ pt: 2 }}');
  content = content.replace(/className='pt-2'/g, "sx={{ pt: 2 }}");
  content = content.replace(/className="pb-2"/g, 'sx={{ pb: 2 }}');
  content = content.replace(/className='pb-2'/g, "sx={{ pb: 2 }}");
  content = content.replace(/className="pl-2"/g, 'sx={{ pl: 2 }}');
  content = content.replace(/className='pl-2'/g, "sx={{ pl: 2 }}");
  content = content.replace(/className="pr-2"/g, 'sx={{ pr: 2 }}');
  content = content.replace(/className='pr-2'/g, "sx={{ pr: 2 }}");
  content = content.replace(/className="shadow"/g, 'sx={{ boxShadow: 1 }}');
  content = content.replace(/className='shadow'/g, "sx={{ boxShadow: 1 }}");
  content = content.replace(/className="shadow-md"/g, 'sx={{ boxShadow: 2 }}');
  content = content.replace(/className='shadow-md'/g, "sx={{ boxShadow: 2 }}");
  content = content.replace(/className="shadow-lg"/g, 'sx={{ boxShadow: 3 }}');
  content = content.replace(/className='shadow-lg'/g, "sx={{ boxShadow: 3 }}");
  content = content.replace(/className="hidden"/g, 'sx={{ display: "none" }}');
  content = content.replace(/className='hidden'/g, "sx={{ display: 'none' }}");
  content = content.replace(/className="block"/g, 'sx={{ display: "block" }}');
  content = content.replace(/className='block'/g, "sx={{ display: 'block' }}");
  content = content.replace(/className="inline-block"/g, 'sx={{ display: "inline-block" }}');
  content = content.replace(/className='inline-block'/g, "sx={{ display: 'inline-block' }}");
  content = content.replace(/className="inline-flex"/g, 'sx={{ display: "inline-flex" }}');
  content = content.replace(/className='inline-flex'/g, "sx={{ display: 'inline-flex' }}");
  content = content.replace(/className="grid"/g, 'sx={{ display: "grid" }}');
  content = content.replace(/className='grid'/g, "sx={{ display: 'grid' }}");
  content = content.replace(/className="grid-cols-2"/g, 'sx={{ gridTemplateColumns: "repeat(2, 1fr)" }}');
  content = content.replace(/className='grid-cols-2'/g, "sx={{ gridTemplateColumns: 'repeat(2, 1fr)' }}");
  content = content.replace(/className="grid-cols-3"/g, 'sx={{ gridTemplateColumns: "repeat(3, 1fr)" }}');
  content = content.replace(/className='grid-cols-3'/g, "sx={{ gridTemplateColumns: 'repeat(3, 1fr)' }}");
  content = content.replace(/className="grid-cols-4"/g, 'sx={{ gridTemplateColumns: "repeat(4, 1fr)" }}');
  content = content.replace(/className='grid-cols-4'/g, "sx={{ gridTemplateColumns: 'repeat(4, 1fr)' }}");
  content = content.replace(/className="auto-cols-fr"/g, 'sx={{ gridAutoColumns: "1fr" }}');
  content = content.replace(/className='auto-cols-fr'/g, "sx={{ gridAutoColumns: '1fr' }}");
  content = content.replace(/className="min-h-full"/g, 'sx={{ minHeight: "100%" }}');
  content = content.replace(/className='min-h-full'/g, "sx={{ minHeight: '100%' }}");
  content = content.replace(/className="min-w-full"/g, 'sx={{ minWidth: "100%" }}');
  content = content.replace(/className='min-w-full'/g, "sx={{ minWidth: '100%' }}");
  content = content.replace(/className="max-w-full"/g, 'sx={{ maxWidth: "100%" }}');
  content = content.replace(/className='max-w-full'/g, "sx={{ maxWidth: '100%' }}");
  content = content.replace(/className="max-h-full"/g, 'sx={{ maxHeight: "100%" }}');
  content = content.replace(/className='max-h-full'/g, "sx={{ maxHeight: '100%' }}");
  content = content.replace(/className="h-auto"/g, 'sx={{ height: "auto" }}');
  content = content.replace(/className='h-auto'/g, "sx={{ height: 'auto' }}");
  content = content.replace(/className="w-auto"/g, 'sx={{ width: "auto" }}');
  content = content.replace(/className='w-auto'/g, "sx={{ width: 'auto' }}");
  content = content.replace(/className="align-middle"/g, 'sx={{ verticalAlign: "middle" }}');
  content = content.replace(/className='align-middle'/g, "sx={{ verticalAlign: 'middle' }}");
  content = content.replace(/className="text-gray-400"/g, 'sx={{ color: "grey.400" }}');
  content = content.replace(/className='text-gray-400'/g, "sx={{ color: 'grey.400' }}");
  content = content.replace(/className="text-gray-900"/g, 'sx={{ color: "grey.900" }}');
  content = content.replace(/className='text-gray-900'/g, "sx={{ color: 'grey.900' }}");
  content = content.replace(/className="bg-gray-200"/g, 'sx={{ backgroundColor: "grey.200" }}');
  content = content.replace(/className='bg-gray-200'/g, "sx={{ backgroundColor: 'grey.200' }}");
  content = content.replace(/className="bg-gray-300"/g, 'sx={{ backgroundColor: "grey.300" }}');
  content = content.replace(/className='bg-gray-300'/g, "sx={{ backgroundColor: 'grey.300' }}");
  content = content.replace(/className="text-blue-500"/g, 'sx={{ color: "primary.main" }}');
  content = content.replace(/className='text-blue-500'/g, "sx={{ color: 'primary.main' }}");
  content = content.replace(/className="text-green-500"/g, 'sx={{ color: "success.main" }}');
  content = content.replace(/className='text-green-500'/g, "sx={{ color: 'success.main' }}");
  content = content.replace(/className="text-red-500"/g, 'sx={{ color: "error.main" }}');
  content = content.replace(/className='text-red-500'/g, "sx={{ color: 'error.main' }}");
  content = content.replace(/className="text-yellow-500"/g, 'sx={{ color: "warning.main" }}');
  content = content.replace(/className='text-yellow-500'/g, "sx={{ color: 'warning.main' }}");
  content = content.replace(/className="bg-blue-500"/g, 'sx={{ backgroundColor: "primary.main" }}');
  content = content.replace(/className='bg-blue-500'/g, "sx={{ backgroundColor: 'primary.main' }}");
  content = content.replace(/className="bg-green-500"/g, 'sx={{ backgroundColor: "success.main" }}');
  content = content.replace(/className='bg-green-500'/g, "sx={{ backgroundColor: 'success.main' }}");
  content = content.replace(/className="bg-red-500"/g, 'sx={{ backgroundColor: "error.main" }}');
  content = content.replace(/className='bg-red-500'/g, "sx={{ backgroundColor: 'error.main' }}");
  content = content.replace(/className="bg-yellow-500"/g, 'sx={{ backgroundColor: "warning.main" }}');
  content = content.replace(/className='bg-yellow-500'/g, "sx={{ backgroundColor: 'warning.main' }}");
  content = content.replace(/className="border-blue-500"/g, 'sx={{ borderColor: "primary.main" }}');
  content = content.replace(/className='border-blue-500'/g, "sx={{ borderColor: 'primary.main' }}");
  content = content.replace(/className="border-green-500"/g, 'sx={{ borderColor: "success.main" }}');
  content = content.replace(/className='border-green-500'/g, "sx={{ borderColor: 'success.main' }}");
  content = content.replace(/className="border-red-500"/g, 'sx={{ borderColor: "error.main" }}');
  content = content.replace(/className='border-red-500'/g, "sx={{ borderColor: 'error.main' }}");
  content = content.replace(/className="border-yellow-500"/g, 'sx={{ borderColor: "warning.main" }}');
  content = content.replace(/className='border-yellow-500'/g, "sx={{ borderColor: 'warning.main' }}");
  content = content.replace(/className="hover:bg-gray-100"/g, 'sx={{ "&:hover": { backgroundColor: "grey.100" } }}');
  content = content.replace(/className='hover:bg-gray-100'/g, "sx={{ '&:hover': { backgroundColor: 'grey.100' } }}");
  content = content.replace(/className="hover:bg-gray-200"/g, 'sx={{ "&:hover": { backgroundColor: "grey.200" } }}');
  content = content.replace(/className='hover:bg-gray-200'/g, "sx={{ '&:hover': { backgroundColor: 'grey.200' } }}");
  content = content.replace(/className="hover:text-blue-600"/g, 'sx={{ "&:hover": { color: "primary.dark" } }}');
  content = content.replace(/className='hover:text-blue-600'/g, "sx={{ '&:hover': { color: 'primary.dark' } }}");
  content = content.replace(/className="active:bg-gray-200"/g, 'sx={{ "&:active": { backgroundColor: "grey.200" } }}');
  content = content.replace(/className='active:bg-gray-200'/g, "sx={{ '&:active': { backgroundColor: 'grey.200' } }}");
  content = content.replace(/className="focus:outline-none"/g, 'sx={{ outline: "none" }}');
  content = content.replace(/className='focus:outline-none'/g, "sx={{ outline: 'none' }}");
  content = content.replace(/className="focus:ring-2"/g, 'sx={{ "&:focus": { outline: "2px solid", outlineColor: "primary.main" } }}');
  content = content.replace(/className='focus:ring-2'/g, "sx={{ '&:focus': { outline: '2px solid', outlineColor: 'primary.main' } }}");
  content = content.replace(/className="transition-colors"/g, 'sx={{ transition: "color 0.2s, backgroundColor 0.2s" }}');
  content = content.replace(/className='transition-colors'/g, "sx={{ transition: 'color 0.2s, backgroundColor 0.2s' }}");
  content = content.replace(/className="transition-all"/g, 'sx={{ transition: "all 0.2s" }}');
  content = content.replace(/className='transition-all'/g, "sx={{ transition: 'all 0.2s' }}");
  content = content.replace(/className="duration-200"/g, 'sx={{ transitionDuration: "200ms" }}');
  content = content.replace(/className='duration-200'/g, "sx={{ transitionDuration: '200ms' }}");
  content = content.replace(/className="duration-300"/g, 'sx={{ transitionDuration: "300ms" }}');
  content = content.replace(/className='duration-300'/g, "sx={{ transitionDuration: '300ms' }}");
  content = content.replace(/className="ease-in-out"/g, 'sx={{ transitionTimingFunction: "ease-in-out" }}');
  content = content.replace(/className='ease-in-out'/g, "sx={{ transitionTimingFunction: 'ease-in-out' }}");
  content = content.replace(/className="align-items-center"/g, 'sx={{ alignItems: "center" }}');
  content = content.replace(/className='align-items-center'/g, "sx={{ alignItems: 'center' }}");
  content = content.replace(/className="justify-content-center"/g, 'sx={{ justifyContent: "center" }}');
  content = content.replace(/className='justify-content-center'/g, "sx={{ justifyContent: 'center' }}");
  content = content.replace(/className="justify-content-between"/g, 'sx={{ justifyContent: "space-between" }}');
  content = content.replace(/className='justify-content-between'/g, "sx={{ justifyContent: 'space-between' }}");
  content = content.replace(/className="flex-direction-column"/g, 'sx={{ flexDirection: "column" }}');
  content = content.replace(/className='flex-direction-column'/g, "sx={{ flexDirection: 'column' }}");
  content = content.replace(/className="flex-direction-row"/g, 'sx={{ flexDirection: "row" }}');
  content = content.replace(/className='flex-direction-row'/g, "sx={{ flexDirection: 'row' }}");
  content = content.replace(/className="flex-wrap-wrap"/g, 'sx={{ flexWrap: "wrap" }}');
  content = content.replace(/className='flex-wrap-wrap'/g, "sx={{ flexWrap: 'wrap' }}");
  content = content.replace(/className="flex-shrink-0"/g, 'sx={{ flexShrink: 0 }}');
  content = content.replace(/className='flex-shrink-0'/g, "sx={{ flexShrink: 0 }}");
  content = content.replace(/className="flex-grow-1"/g, 'sx={{ flexGrow: 1 }}');
  content = content.replace(/className='flex-grow-1'/g, "sx={{ flexGrow: 1 }}");
  content = content.replace(/className="overflow-x-auto"/g, 'sx={{ overflowX: "auto" }}');
  content = content.replace(/className='overflow-x-auto'/g, "sx={{ overflowX: 'auto' }}");
  content = content.replace(/className="overflow-y-auto"/g, 'sx={{ overflowY: "auto" }}');
  content = content.replace(/className='overflow-y-auto'/g, "sx={{ overflowY: 'auto' }}");
  content = content.replace(/className="text-left"/g, 'sx={{ textAlign: "left" }}');
  content = content.replace(/className='text-left'/g, "sx={{ textAlign: 'left' }}");
  content = content.replace(/className="text-right"/g, 'sx={{ textAlign: "right" }}');
  content = content.replace(/className='text-right'/g, "sx={{ textAlign: 'right' }}");
  content = content.replace(/className="font-bold"/g, 'sx={{ fontWeight: 700 }}');
  content = content.replace(/className='font-bold'/g, "sx={{ fontWeight: 700 }}");
  content = content.replace(/className="font-normal"/g, 'sx={{ fontWeight: 400 }}');
  content = content.replace(/className='font-normal'/g, "sx={{ fontWeight: 400 }}");
  content = content.replace(/className="italic"/g, 'sx={{ fontStyle: "italic" }}');
  content = content.replace(/className='italic'/g, "sx={{ fontStyle: 'italic' }}");
  content = content.replace(/className="underline"/g, 'sx={{ textDecoration: "underline" }}');
  content = content.replace(/className='underline'/g, "sx={{ textDecoration: 'underline' }}");
  content = content.replace(/className="line-through"/g, 'sx={{ textDecoration: "line-through" }}');
  content = content.replace(/className='line-through'/g, "sx={{ textDecoration: 'line-through' }}");
  content = content.replace(/className="list-disc"/g, 'sx={{ listStyleType: "disc" }}');
  content = content.replace(/className='list-disc'/g, "sx={{ listStyleType: 'disc' }}");
  content = content.replace(/className="list-none"/g, 'sx={{ listStyleType: "none" }}');
  content = content.replace(/className='list-none'/g, "sx={{ listStyleType: 'none' }}");
  content = content.replace(/className="border-t"/g, 'sx={{ borderTop: 1 }}');
  content = content.replace(/className='border-t'/g, "sx={{ borderTop: 1 }}");
  content = content.replace(/className="border-b"/g, 'sx={{ borderBottom: 1 }}');
  content = content.replace(/className='border-b'/g, "sx={{ borderBottom: 1 }}");
  content = content.replace(/className="border-l"/g, 'sx={{ borderLeft: 1 }}');
  content = content.replace(/className='border-l'/g, "sx={{ borderLeft: 1 }}");
  content = content.replace(/className="border-r"/g, 'sx={{ borderRight: 1 }}');
  content = content.replace(/className='border-r'/g, "sx={{ borderRight: 1 }}");
  content = content.replace(/className="border-t-gray-200"/g, 'sx={{ borderTop: 1, borderTopColor: "grey.200" }}');
  content = content.replace(/className='border-t-gray-200'/g, "sx={{ borderTop: 1, borderTopColor: 'grey.200' }}");
  content = content.replace(/className="border-b-gray-200"/g, 'sx={{ borderBottom: 1, borderBottomColor: "grey.200" }}');
  content = content.replace(/className='border-b-gray-200'/g, "sx={{ borderBottom: 1, borderBottomColor: 'grey.200' }}");
  content = content.replace(/className="rounded-full"/g, 'sx={{ borderRadius: "50%" }}');
  content = content.replace(/className='rounded-full'/g, "sx={{ borderRadius: '50%' }}");
  content = content.replace(/className="rounded-t"/g, 'sx={{ borderRadius: "1px 1px 0 0" }}');
  content = content.replace(/className='rounded-t'/g, "sx={{ borderRadius: '1px 1px 0 0' }}");
  content = content.replace(/className="rounded-b"/g, 'sx={{ borderRadius: "0 0 1px 1px" }}');
  content = content.replace(/className='rounded-b'/g, "sx={{ borderRadius: '0 0 1px 1px' }}");
  content = content.replace(/className="rounded-l"/g, 'sx={{ borderRadius: "1px 0 0 1px" }}');
  content = content.replace(/className='rounded-l'/g, "sx={{ borderRadius: '1px 0 0 1px' }}");
  content = content.replace(/className="rounded-r"/g, 'sx={{ borderRadius: "0 1px 1px 0" }}');
  content = content.replace(/className='rounded-r'/g, "sx={{ borderRadius: '0 1px 1px 0' }}");
  content = content.replace(/className="opacity-0"/g, 'sx={{ opacity: 0 }}');
  content = content.replace(/className='opacity-0'/g, "sx={{ opacity: 0 }}");
  content = content.replace(/className="opacity-50"/g, 'sx={{ opacity: 0.5 }}');
  content = content.replace(/className='opacity-50'/g, "sx={{ opacity: 0.5 }}");
  content = content.replace(/className="opacity-75"/g, 'sx={{ opacity: 0.75 }}');
  content = content.replace(/className='opacity-75'/g, "sx={{ opacity: 0.75 }}");
  content = content.replace(/className="opacity-100"/g, 'sx={{ opacity: 1 }}');
  content = content.replace(/className='opacity-100'/g, "sx={{ opacity: 1 }}");
  content = content.replace(/className="cursor-default"/g, 'sx={{ cursor: "default" }}');
  content = content.replace(/className='cursor-default'/g, "sx={{ cursor: 'default' }}");
  content = content.replace(/className="cursor-not-allowed"/g, 'sx={{ cursor: "not-allowed" }}');
  content = content.replace(/className='cursor-not-allowed'/g, "sx={{ cursor: 'not-allowed' }}");
  content = content.replace(/className="pointer-events-none"/g, 'sx={{ pointerEvents: "none" }}');
  content = content.replace(/className='pointer-events-none'/g, "sx={{ pointerEvents: 'none' }}");
  content = content.replace(/className="pointer-events-auto"/g, 'sx={{ pointerEvents: "auto" }}');
  content = content.replace(/className='pointer-events-auto'/g, "sx={{ pointerEvents: 'auto' }}");
  content = content.replace(/className="select-none"/g, 'sx={{ userSelect: "none" }}');
  content = content.replace(/className='select-none'/g, "sx={{ userSelect: 'none' }}");
  content = content.replace(/className="select-text"/g, 'sx={{ userSelect: "text" }}');
  content = content.replace(/className='select-text'/g, "sx={{ userSelect: 'text' }}");
  content = content.replace(/className="z-0"/g, 'sx={{ zIndex: 0 }}');
  content = content.replace(/className='z-0'/g, "sx={{ zIndex: 0 }}");
  content = content.replace(/className="z-10"/g, 'sx={{ zIndex: 10 }}');
  content = content.replace(/className='z-10'/g, "sx={{ zIndex: 10 }}");
  content = content.replace(/className="z-20"/g, 'sx={{ zIndex: 20 }}');
  content = content.replace(/className='z-20'/g, "sx={{ zIndex: 20 }}");
  content = content.replace(/className="z-30"/g, 'sx={{ zIndex: 30 }}');
  content = content.replace(/className='z-30'/g, "sx={{ zIndex: 30 }}");
  content = content.replace(/className="z-40"/g, 'sx={{ zIndex: 40 }}');
  content = content.replace(/className='z-40'/g, "sx={{ zIndex: 40 }}");
  content = content.replace(/className="z-50"/g, 'sx={{ zIndex: 50 }}');
  content = content.replace(/className='z-50'/g, "sx={{ zIndex: 50 }}");
  content = content.replace(/className="float-left"/g, 'sx={{ float: "left" }}');
  content = content.replace(/className='float-left'/g, "sx={{ float: 'left' }}");
  content = content.replace(/className="float-right"/g, 'sx={{ float: "right" }}');
  content = content.replace(/className='float-right'/g, "sx={{ float: 'right' }}");
  content = content.replace(/className="clear-both"/g, 'sx={{ clear: "both" }}');
  content = content.replace(/className='clear-both'/g, "sx={{ clear: 'both' }}");
  content = content.replace(/className="position-static"/g, 'sx={{ position: "static" }}');
  content = content.replace(/className='position-static'/g, "sx={{ position: 'static' }}");
  content = content.replace(/className="position-relative"/g, 'sx={{ position: "relative" }}');
  content = content.replace(/className='position-relative'/g, "sx={{ position: 'relative' }}");
  content = content.replace(/className="position-absolute"/g, 'sx={{ position: "absolute" }}');
  content = content.replace(/className='position-absolute'/g, "sx={{ position: 'absolute' }}");
  content = content.replace(/className="position-fixed"/g, 'sx={{ position: "fixed" }}');
  content = content.replace(/className='position-fixed'/g, "sx={{ position: 'fixed' }}");
  content = content.replace(/className="position-sticky"/g, 'sx={{ position: "sticky" }}');
  content = content.replace(/className='position-sticky'/g, "sx={{ position: 'sticky' }}");
  content = content.replace(/className="top-0"/g, 'sx={{ top: 0 }}');
  content = content.replace(/className='top-0'/g, "sx={{ top: 0 }}");
  content = content.replace(/className="bottom-0"/g, 'sx={{ bottom: 0 }}');
  content = content.replace(/className='bottom-0'/g, "sx={{ bottom: 0 }}");
  content = content.replace(/className="left-0"/g, 'sx={{ left: 0 }}');
  content = content.replace(/className='left-0'/g, "sx={{ left: 0 }}");
  content = content.replace(/className="right-0"/g, 'sx={{ right: 0 }}');
  content = content.replace(/className='right-0'/g, "sx={{ right: 0 }}");
  content = content.replace(/className="inset-0"/g, 'sx={{ top: 0, right: 0, bottom: 0, left: 0 }}');
  content = content.replace(/className='inset-0'/g, "sx={{ top: 0, right: 0, bottom: 0, left: 0 }}");
  content = content.replace(/className="transform"/g, 'sx={{ transform: "none" }}');
  content = content.replace(/className='transform'/g, "sx={{ transform: 'none' }}");
  content = content.replace(/className="scale-100"/g, 'sx={{ transform: "scale(1)" }}');
  content = content.replace(/className='scale-100'/g, "sx={{ transform: 'scale(1)' }}");
  content = content.replace(/className="scale-95"/g, 'sx={{ transform: "scale(0.95)" }}');
  content = content.replace(/className='scale-95'/g, "sx={{ transform: 'scale(0.95)' }}");
  content = content.replace(/className="scale-105"/g, 'sx={{ transform: "scale(1.05)" }}');
  content = content.replace(/className='scale-105'/g, "sx={{ transform: 'scale(1.05)' }}");
  content = content.replace(/className="rotate-0"/g, 'sx={{ transform: "rotate(0deg)" }}');
  content = content.replace(/className='rotate-0'/g, "sx={{ transform: 'rotate(0deg)' }}");
  content = content.replace(/className="rotate-90"/g, 'sx={{ transform: "rotate(90deg)" }}');
  content = content.replace(/className='rotate-90'/g, "sx={{ transform: 'rotate(90deg)' }}");
  content = content.replace(/className="rotate-180"/g, 'sx={{ transform: "rotate(180deg)" }}');
  content = content.replace(/className='rotate-180'/g, "sx={{ transform: 'rotate(180deg)' }}");
  content = content.replace(/className="rotate-270"/g, 'sx={{ transform: "rotate(270deg)" }}');
  content = content.replace(/className='rotate-270'/g, "sx={{ transform: 'rotate(270deg)' }}");
  content = content.replace(/className="translate-x-0"/g, 'sx={{ transform: "translateX(0)" }}');
  content = content.replace(/className='translate-x-0'/g, "sx={{ transform: 'translateX(0)' }}");
  content = content.replace(/className="translate-y-0"/g, 'sx={{ transform: "translateY(0)" }}');
  content = content.replace(/className='translate-y-0'/g, "sx={{ transform: 'translateY(0)' }}");
  content = content.replace(/className="translate-x-full"/g, 'sx={{ transform: "translateX(100%)" }}');
  content = content.replace(/className='translate-x-full'/g, "sx={{ transform: 'translateX(100%)' }}");
  content = content.replace(/className="translate-y-full"/g, 'sx={{ transform: "translateY(100%)" }}');
  content = content.replace(/className='translate-y-full'/g, "sx={{ transform: 'translateY(100%)' }}");
  content = content.replace(/className="opacity-0"/g, 'sx={{ opacity: 0 }}');
  content = content.replace(/className='opacity-0'/g, "sx={{ opacity: 0 }}");
  content = content.replace(/className="opacity-100"/g, 'sx={{ opacity: 1 }}');
  content = content.replace(/className='opacity-100'/g, "sx={{ opacity: 1 }}");
  content = content.replace(/className="transition-opacity"/g, 'sx={{ transition: "opacity 0.2s" }}');
  content = content.replace(/className='transition-opacity'/g, "sx={{ transition: 'opacity 0.2s' }}");
  content = content.replace(/className="transition-transform"/g, 'sx={{ transition: "transform 0.2s" }}');
  content = content.replace(/className='transition-transform'/g, "sx={{ transition: 'transform 0.2s' }}");
  content = content.replace(/className="blur-sm"/g, 'sx={{ filter: "blur(4px)" }}');
  content = content.replace(/className='blur-sm'/g, "sx={{ filter: 'blur(4px)' }}");
  content = content.replace(/className="blur-md"/g, 'sx={{ filter: "blur(8px)" }}');
  content = content.replace(/className='blur-md'/g, "sx={{ filter: 'blur(8px)' }}");
  content = content.replace(/className="grayscale"/g, 'sx={{ filter: "grayscale(1)" }}');
  content = content.replace(/className='grayscale'/g, "sx={{ filter: 'grayscale(1)' }}");
  content = content.replace(/className="brightness-50"/g, 'sx={{ filter: "brightness(0.5)" }}');
  content = content.replace(/className='brightness-50'/g, "sx={{ filter: 'brightness(0.5)' }}");
  content = content.replace(/className="brightness-100"/g, 'sx={{ filter: "brightness(1)" }}');
  content = content.replace(/className='brightness-100'/g, "sx={{ filter: 'brightness(1)' }}");
  content = content.replace(/className="contrast-100"/g, 'sx={{ filter: "contrast(1)" }}');
  content = content.replace(/className='contrast-100'/g, "sx={{ filter: 'contrast(1)' }}");
  content = content.replace(/className="saturate-100"/g, 'sx={{ filter: "saturate(1)" }}');
  content = content.replace(/className='saturate-100'/g, "sx={{ filter: 'saturate(1)' }}");
  content = content.replace(/className="hue-rotate-0"/g, 'sx={{ filter: "hue-rotate(0deg)" }}');
  content = content.replace(/className='hue-rotate-0'/g, "sx={{ filter: 'hue-rotate(0deg)' }}");
  content = content.replace(/className="invert"/g, 'sx={{ filter: "invert(1)" }}');
  content = content.replace(/className='invert'/g, "sx={{ filter: 'invert(1)' }}");
  content = content.replace(/className="backdrop-blur"/g, 'sx={{ backdropFilter: "blur(8px)" }}');
  content = content.replace(/className='backdrop-blur'/g, "sx={{ backdropFilter: 'blur(8px)' }}");
  content = content.replace(/className="backdrop-blur-sm"/g, 'sx={{ backdropFilter: "blur(4px)" }}');
  content = content.replace(/className='backdrop-blur-sm'/g, "sx={{ backdropFilter: 'blur(4px)' }}");
  content = content.replace(/className="backdrop-blur-md"/g, 'sx={{ backdropFilter: "blur(8px)" }}');
  content = content.replace(/className='backdrop-blur-md'/g, "sx={{ backdropFilter: 'blur(8px)' }}");
  content = content.replace(/className="backdrop-blur-lg"/g, 'sx={{ backdropFilter: "blur(12px)" }}');
  content = content.replace(/className='backdrop-blur-lg'/g, "sx={{ backdropFilter: 'blur(12px)' }}");
  content = content.replace(/className="backdrop-blur-xl"/g, 'sx={{ backdropFilter: "blur(24px)" }}');
  content = content.replace(/className='backdrop-blur-xl'/g, "sx={{ backdropFilter: 'blur(24px)' }}");
  content = content.replace(/className="backdrop-blur-2xl"/g, 'sx={{ backdropFilter: "blur(40px)" }}');
  content = content.replace(/className='backdrop-blur-2xl'/g, "sx={{ backdropFilter: 'blur(40px)' }}");
  content = content.replace(/className="backdrop-blur-3xl"/g, 'sx={{ backdropFilter: "blur(60px)" }}');
  content = content.replace(/className='backdrop-blur-3xl'/g, "sx={{ backdropFilter: 'blur(60px)' }}");
  content = content.replace(/className="bg-gradient-to-r"/g, 'sx={{ background: "linear-gradient(to right, var(--color-primary-500), var(--color-primary-600))" }}');
  content = content.replace(/className='bg-gradient-to-r'/g, "sx={{ background: 'linear-gradient(to right, var(--color-primary-500), var(--color-primary-600))' }}");
  content = content.replace(/className="bg-gradient-to-b"/g, 'sx={{ background: "linear-gradient(to bottom, var(--color-primary-500), var(--color-primary-600))" }}');
  content = content.replace(/className='bg-gradient-to-b'/g, "sx={{ background: 'linear-gradient(to bottom, var(--color-primary-500), var(--color-primary-600))' }}");
  content = content.replace(/className="bg-gradient-to-t"/g, 'sx={{ background: "linear-gradient(to top, var(--color-primary-500), var(--color-primary-600))" }}');
  content = content.replace(/className='bg-gradient-to-t'/g, "sx={{ background: 'linear-gradient(to top, var(--color-primary-500), var(--color-primary-600))' }}");
  content = content.replace(/className="bg-gradient-to-l"/g, 'sx={{ background: "linear-gradient(to left, var(--color-primary-500), var(--color-primary-600))" }}');
  content = content.replace(/className='bg-gradient-to-l'/g, "sx={{ background: 'linear-gradient(to left, var(--color-primary-500), var(--color-primary-600))' }}");

  fs.writeFileSync(fullPath, content, 'utf-8');
  const relPath = fullPath.replace(srcDir + '/', '');
  console.log(`[TAILWIND] Updated ${relPath}`);
  filesChanged++;
});

console.log(`\nTailwind migration done! Updated ${filesChanged} files.\n`);
console.log('All migrations completed!');