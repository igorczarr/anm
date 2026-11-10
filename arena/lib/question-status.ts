export type QuestionStatusKey =
  | "RECEIVED"
  | "ANALYZING"
  | "APPROVED"
  | "REJECTED"
  | "DUPLICATE"
  | "SELECTED"
  | "DISPLAYED"
  | "ANSWERED";

export const QUESTION_STATUS_LABELS: Record<QuestionStatusKey, string> = {
  RECEIVED: "Recebida",
  ANALYZING: "Em análise",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  DUPLICATE: "Duplicada",
  SELECTED: "Selecionada",
  DISPLAYED: "Exibida no telão",
  ANSWERED: "Respondida",
};

export const QUESTION_STATUS_STYLES: Record<QuestionStatusKey, string> = {
  RECEIVED: "bg-sky-100 text-sky-800 border-sky-300",
  ANALYZING: "bg-amber-100 text-amber-800 border-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
  DUPLICATE: "bg-slate-200 text-slate-700 border-slate-300",
  SELECTED: "bg-violet-100 text-violet-800 border-violet-300",
  DISPLAYED: "bg-green-700 text-white border-green-800",
  ANSWERED: "bg-slate-800 text-white border-slate-900",
};

export const PUBLIC_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Recebida",
  ANALYZING: "Em análise",
  SELECTED: "Selecionada para o debate",
  ANSWERED: "Respondida",
  NOT_SELECTED: "Não selecionada",
};
