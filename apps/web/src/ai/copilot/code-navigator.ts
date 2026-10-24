export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
  score: number;
}
