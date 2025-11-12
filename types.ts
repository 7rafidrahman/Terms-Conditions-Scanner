
export interface ImageFile {
  id: string;
  name: string;
  dataUrl: string;
}

export interface KeyClause {
  clause: string;
  explanation_en: string;
  explanation_bn: string;
}

export interface SummaryReport {
  id: string;
  title: string;
  timestamp: string;
  full_text: string;
  summary_en: string;
  summary_bn: string;
  key_clauses: KeyClause[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}
