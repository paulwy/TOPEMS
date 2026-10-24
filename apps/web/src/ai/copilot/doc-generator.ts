interface DocTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  placeholders: string[];
}

interface GenerateDocOptions {
  description?: string;
  params?: Array<{ name: string; type: string; description?: string }>;
  returns?: string;
  throws?: Array<{ type: string; description: string }>;
  deprecated?: boolean;
  seeAlso?: string[];
  examples?: string[];
}

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated' | 'security';
  description: string;
  author?: string;
}

interface ReadmeSection {
  title: string;
  content: string;
}
