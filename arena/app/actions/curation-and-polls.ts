"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, logAdminAction } from "@/lib/admin-auth";
import { getPrimaryEvent, updateLiveStateAtomic } from "@/lib/live-state";
import { QuestionStatus } from "@prisma/client";

export async function moderateQuestionStatusAction(
  questionId: string,
  toStatus: QuestionStatus,
  note?: string
) {
  const admin = await requireAdminPermission("canModerateQuestions");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) throw new Error("Pergunta não encontrada");

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: {
      status: toStatus,
      moderatedById: admin.id,
      ...(toStatus === "ANSWERED" ? { answeredAt: new Date() } : {}),
      ...(toStatus === "REJECTED" || toStatus === "DUPLICATE"
        ? { isPrimary: false, isReserve: false }
        : {}),
      history: {
        create: {
          fromStatus: question.status,
          toStatus,
          changedByUserId: admin.id,
          note: note || `Estado alterado para ${toStatus}`,
        },
      },
    },
  });

  // Se foi rejeitada ou marcada como duplicada e estava como principal/reserva ou no telão, limpa vínculos
  if (toStatus === "REJECTED" || toStatus === "DUPLICATE") {
    await prisma.topic.updateMany({
      where: { id: question.topicId, primaryQuestionId: question.id },
      data: { primaryQuestionId: null },
    });
    await prisma.topic.updateMany({
      where: { id: question.topicId, reserveQuestionId: question.id },
      data: { reserveQuestionId: null },
    });
    if (event.liveState?.selectedQuestionId === question.id) {
      await updateLiveStateAtomic(event.id, "question.approved", {
        selectedQuestionId: null,
      });
    }
  }

  await updateLiveStateAtomic(event.id, "question.approved", {});

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: `QUESTION_STATUS_${toStatus}`,
    entityType: "Question",
    entityId: updated.id,
    metadata: { from: question.status, to: toStatus },
  });

  revalidatePath("/admin/perguntas");
  revalidatePath("/admin");
}

/**
 * Seleciona a Pergunta Principal ou a Pergunta Reserva de uma pauta (§5.4)
 */
export async function selectTopicQuestionSlotAction(
  questionId: string,
  slot: "PRIMARY" | "RESERVE" | "CLEAR"
) {
  const admin = await requireAdminPermission("canModerateQuestions");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) throw new Error("Pergunta não encontrada");

  if (
    slot !== "CLEAR" &&
    (question.status === "REJECTED" || question.status === "DUPLICATE")
  ) {
    throw new Error(
      "Perguntas rejeitadas ou duplicadas não podem ser selecionadas para o debate."
    );
  }

  if (slot === "CLEAR") {
    await prisma.question.update({
      where: { id: question.id },
      data: {
        isPrimary: false,
        isReserve: false,
        status:
          question.status === "SELECTED" ? "APPROVED" : question.status,
      },
    });
    await prisma.topic.updateMany({
      where: { id: question.topicId, primaryQuestionId: question.id },
      data: { primaryQuestionId: null },
    });
    await prisma.topic.updateMany({
      where: { id: question.topicId, reserveQuestionId: question.id },
      data: { reserveQuestionId: null },
    });
  } else if (slot === "PRIMARY") {
    // Limpa principal anterior da mesma pauta
    await prisma.question.updateMany({
      where: { topicId: question.topicId, isPrimary: true },
      data: { isPrimary: false },
    });

    const nextStatus: QuestionStatus =
      question.status === "DISPLAYED" || question.status === "ANSWERED"
        ? question.status
        : "SELECTED";

    await prisma.question.update({
      where: { id: question.id },
      data: {
        isPrimary: true,
        isReserve: false,
        status: nextStatus,
        moderatedById: admin.id,
        history: {
          create: {
            fromStatus: question.status,
            toStatus: nextStatus,
            changedByUserId: admin.id,
            note: "Definida como Pergunta Principal da pauta",
          },
        },
      },
    });

    await prisma.topic.update({
      where: { id: question.topicId },
      data: {
        primaryQuestionId: question.id,
        ...(question.isReserve ? { reserveQuestionId: null } : {}),
      },
    });
  } else if (slot === "RESERVE") {
    // Limpa reserva anterior da mesma pauta
    await prisma.question.updateMany({
      where: { topicId: question.topicId, isReserve: true },
      data: { isReserve: false },
    });

    const nextStatus: QuestionStatus =
      question.status === "DISPLAYED" || question.status === "ANSWERED"
        ? question.status
        : "SELECTED";

    await prisma.question.update({
      where: { id: question.id },
      data: {
        isReserve: true,
        isPrimary: false,
        status: nextStatus,
        moderatedById: admin.id,
        history: {
          create: {
            fromStatus: question.status,
            toStatus: nextStatus,
            changedByUserId: admin.id,
            note: "Definida como Pergunta Reserva da pauta",
          },
        },
      },
    });

    await prisma.topic.update({
      where: { id: question.topicId },
      data: {
        reserveQuestionId: question.id,
        ...(question.isPrimary ? { primaryQuestionId: null } : {}),
      },
    });
  }

  await updateLiveStateAtomic(event.id, "question.selected", {});

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: `QUESTION_SLOT_${slot}`,
    entityType: "Question",
    entityId: question.id,
    metadata: { topicId: question.topicId, slot },
  });

  revalidatePath("/admin/perguntas");
  revalidatePath("/admin");
}

/**
 * Exibe uma pergunta aprovada/selecionada no telão ARENA (§5.3, §5.4 e §5.6)
 */
export async function displayQuestionOnArenaAction(questionId: string) {
  const admin = await requireAdminPermission("canModerateQuestions");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) throw new Error("Pergunta não encontrada");

  // Regra inegociável §3 e §10.2: Impedir exibição de perguntas não aprovadas
  if (
    question.status === "REJECTED" ||
    question.status === "DUPLICATE" ||
    question.status === "RECEIVED"
  ) {
    throw new Error(
      "Somente perguntas aprovadas ou selecionadas pela curadoria podem ir ao telão."
    );
  }

  await prisma.question.update({
    where: { id: question.id },
    data: {
      status: "DISPLAYED",
      displayedAt: new Date(),
      moderatedById: admin.id,
      history: {
        create: {
          fromStatus: question.status,
          toStatus: "DISPLAYED",
          changedByUserId: admin.id,
          note: "Projetada no telão ARENA",
        },
      },
    },
  });

  await updateLiveStateAtomic(event.id, "question.selected", {
    selectedQuestionId: question.id,
    arenaMode: "SELECTED_QUESTION",
    emergencyActive: false,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "QUESTION_DISPLAYED_ON_ARENA",
    entityType: "Question",
    entityId: question.id,
  });

  revalidatePath("/admin/perguntas");
  revalidatePath("/admin/operacao");
  revalidatePath("/admin");
}

export async function removeQuestionFromArenaAction() {
  const admin = await requireAdminPermission("canModerateQuestions");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  await updateLiveStateAtomic(event.id, "screen.message_updated", {
    selectedQuestionId: null,
    arenaMode: "TOPIC_OVERVIEW",
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "QUESTION_REMOVED_FROM_ARENA",
    entityType: "LiveState",
  });

  revalidatePath("/admin/perguntas");
  revalidatePath("/admin/operacao");
  revalidatePath("/admin");
}

/**
 * Ações de Gerenciamento de Votações (§6.1, §6.2 e §6.3)
 */
export async function openPollByIdAction(pollId: string) {
  const admin = await requireAdminPermission("canManagePolls");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  // Regra §6.2: Impedir que duas votações sejam abertas simultaneamente
  await prisma.poll.updateMany({
    where: {
      eventId: event.id,
      status: "OPEN",
      id: { not: pollId },
    },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
    },
  });

  const poll = await prisma.poll.update({
    where: { id: pollId },
    data: {
      status: "OPEN",
      openedAt: new Date(),
    },
  });

  await updateLiveStateAtomic(event.id, "poll.opened", {
    activePollId: poll.id,
    activeTopicId: poll.topicId,
    arenaMode: "POLL_OPEN",
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "POLL_OPENED",
    entityType: "Poll",
    entityId: poll.id,
    metadata: { number: poll.number },
  });

  revalidatePath("/admin/votacoes");
  revalidatePath("/admin/operacao");
  revalidatePath("/admin");
}

export async function closePollByIdAction(
  pollId: string,
  publishOnArena = true
) {
  const admin = await requireAdminPermission("canManagePolls");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const nextStatus = publishOnArena ? "RESULTS_PUBLISHED" : "CLOSED";

  const poll = await prisma.poll.update({
    where: { id: pollId },
    data: {
      status: nextStatus,
      closedAt: new Date(),
      ...(publishOnArena ? { resultsPublishedAt: new Date() } : {}),
    },
  });

  await updateLiveStateAtomic(
    event.id,
    publishOnArena ? "poll.results_published" : "poll.closed",
    {
      activePollId: poll.id,
      ...(publishOnArena ? { arenaMode: "POLL_RESULTS" } : {}),
    }
  );

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: publishOnArena ? "POLL_RESULTS_PUBLISHED" : "POLL_CLOSED",
    entityType: "Poll",
    entityId: poll.id,
    metadata: { number: poll.number, totalVotes: poll.totalVotes },
  });

  revalidatePath("/admin/votacoes");
  revalidatePath("/admin/operacao");
  revalidatePath("/admin");
}

export async function updatePollQuestionAndOptionsAction(formData: FormData) {
  const admin = await requireAdminPermission("canManagePolls");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const pollId = String(formData.get("pollId") || "");
  const question = String(formData.get("question") || "").trim();
  const durationSec = Math.max(
    15,
    Number(formData.get("durationSec") || 60)
  );

  if (!pollId || !question) return;

  await prisma.poll.update({
    where: { id: pollId },
    data: { question, durationSec },
  });

  const options = await prisma.pollOption.findMany({
    where: { pollId },
    orderBy: { optionOrder: "asc" },
  });

  for (const opt of options) {
    const newLabel = String(formData.get(`option_${opt.id}`) || "").trim();
    if (newLabel && newLabel !== opt.label) {
      await prisma.pollOption.update({
        where: { id: opt.id },
        data: { label: newLabel },
      });
    }
  }

  await updateLiveStateAtomic(event.id, "config.updated", {});

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "POLL_CONFIG_UPDATED",
    entityType: "Poll",
    entityId: pollId,
  });

  revalidatePath("/admin/votacoes");
}

export async function resetPollVotesAction(pollId: string) {
  const admin = await requireAdminPermission("canManagePolls");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { pollId } }),
    prisma.pollOption.updateMany({
      where: { pollId },
      data: { votesCount: 0 },
    }),
    prisma.poll.update({
      where: { id: pollId },
      data: {
        totalVotes: 0,
        status: "DRAFT",
        openedAt: null,
        closedAt: null,
        resultsPublishedAt: null,
      },
    }),
  ]);

  await updateLiveStateAtomic(event.id, "config.updated", {});

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "POLL_VOTES_RESET",
    entityType: "Poll",
    entityId: pollId,
  });

  revalidatePath("/admin/votacoes");
  revalidatePath("/admin");
}
