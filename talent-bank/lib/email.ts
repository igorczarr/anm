import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApplicationStatusEmail({
  to,
  candidateName,
  jobTitle,
  companyName,
  newStatus,
}: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  newStatus: string;
}) {
  if (!process.env.RESEND_API_KEY) return null;

  return resend.emails.send({
    from: "Banco de Talentos - A Nova Moeda <onboarding@resend.dev>",
    to: [to],
    subject: `Atualização da sua candidatura: ${jobTitle}`,
    html: `
      <div style="font-family: Montserrat, Arial, sans-serif; background-color: #030A06; color: #D5C5AA; padding: 32px; border: 1px solid #57552E;">
        <h2 style="color: #F7DECA; margin-bottom: 16px;">A NOVA MOEDA · BANCO DE TALENTOS</h2>
        <p>Olá, <strong>${candidateName}</strong>,</p>
        <p>Sua candidatura para a oportunidade <strong>${jobTitle}</strong> (${companyName}) teve uma atualização de status:</p>
        <p style="padding: 12px 16px; background: #0A150D; border-left: 3px solid #D5C5AA; color: #F7DECA; font-weight: bold;">
          Novo Status: ${newStatus}
        </p>
        <p>Acesse o seu painel no Banco de Talentos para acompanhar todos os detalhes.</p>
      </div>
    `,
  });
}
