"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export function ResumeUploader() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/talentos/api/resumes/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Não foi possível enviar o arquivo.");
      } else {
        setSuccess(
          `Arquivo "${data.resume.fileName}" (v${data.resume.version}) salvo com segurança!`
        );
        router.refresh();
      }
    } catch {
      setError("Erro de conexão ao enviar o arquivo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#D5C5AA]/35 bg-[#030A06]/90 p-8 text-center hover:border-[#F7DECA] transition cursor-pointer">
        {uploading ? (
          <Loader2 className="w-8 h-8 text-[#F7DECA] animate-spin" />
        ) : (
          <Upload className="w-8 h-8 text-[#F7DECA]" />
        )}
        <span className="mt-3 text-sm font-semibold text-[#F7DECA]">
          {uploading
            ? "Validando e armazenando seu currículo..."
            : "Clique para selecionar ou substituir seu currículo (PDF ou DOCX)"}
        </span>
        <span className="mt-1 text-xs text-[#D5C5AA]/70">
          Tamanho máximo configurável: 8 MB · Validação de formato e assinatura segura
        </span>
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {error && (
        <div className="p-3.5 border border-red-500/40 bg-red-950/30 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 border border-emerald-500/40 bg-emerald-950/30 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
