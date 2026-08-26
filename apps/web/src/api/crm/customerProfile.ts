interface CustomerProfileItem {
  id: string;
  name: string;
  code?: string;
  industry?: string;
  company_size?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  status: string;
  customer_type?: string;
  source?: string;
  rating?: string;
  revenue?: number;
  employee_count?: number;
  created_at?: string;
  updated_at?: string;
  score?: CustomerScoreSummary;
  opportunities?: OpportunitySummary[];
  interactions?: InteractionSummary[];
  contacts?: ContactSummary[];
  profile_tags?: string[];
}

interface CustomerScoreSummary {
  score: number;
  level?: string;
  last_evaluated?: string;
}

interface OpportunitySummary {
  id: string;
  title: string;
  value?: number;
  stage: string;
  created_at?: string;
}

interface InteractionSummary {
  id: string;
  type: string;
  summary?: string;
  created_at?: string;
}

interface ContactSummary {
  id: string;
  name: string;
  position?: string;
  phone?: string;
  email?: string;
}

interface CustomerProfileListQuery {
  page?: number;
  page_size?: number;
  status?: string;
  industry?: string;
  customer_type?: string;
  keyword?: string;
}
