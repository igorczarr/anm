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
 * Seleciona a Pergunta Principal (1 por pauta) ou a Pergunta Reserva de uma pauta (§2 e §3)
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
            note: `Definida como Pergunta Selecionada da pauta por ${admin.fullName}`,
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
            note: `Definida como Pergunta Reserva da pauta por ${admin.fullName}`,
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
    metadata: {
      topicId: question.topicId,
      slot,
      isMediationReserve: question.isMediationReserve,
    },
  });

  revalidatePath("/admin/perguntas");
  revalidatePath("/admin");
}

/**
 * Cadastra ou atualiza e aciona uma Pergunta de Reserva da Mediação para uma pauta (§7 — Tratamento quando nenhuma pergunta da plateia for aprovada)
 */
export async function upsertAndActivateMediationReserveQuestionAction(
  formData: FormData
) {
  const admin = await requireAdminPermission("canModerateQuestions");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const topicId = String(formData.get("topicId") || "").trim();
  const text = String(formData.get("text") || "").trim();
  const activateNow = formData.get("activateNow") === "true";

  if (!topicId || text.length < 5) {
    throw new Error("Informe o texto da Pergunta de Reserva da Mediação.");
  }

  const existingReserve = await prisma.question.findFirst({
    where: {
      eventId: event.id,
      topicId,
      isMediationReserve: true,
    },
  });

  const reserveQuestion = existingReserve
    ? await prisma.question.update({
        where: { id: existingReserve.id },
        data: {
          text,
          status: activateNow ? "SELECTED" : "APPROVED",
          isReserve: !activateNow,
          isPrimary: activateNow,
          moderatedById: admin.id,
          history: {
            create: {
              fromStatus: existingReserve.status,
              toStatus: activateNow ? "SELECTED" : "APPROVED",
              changedByUserId: admin.id,
              note: activateNow
                ? "Pergunta de Reserva da Mediação acionada para resposta"
                : "Pergunta de Reserva da Mediação atualizada",
            },
          },
        },
      })
    : await prisma.question.create({
        data: {
          eventId: event.id,
          topicId,
          sessionId: null,
          clientRequestId: `mediation-reserve-${topicId}-${Date.now()}`,
          text,
          status: activateNow ? "SELECTED" : "APPROVED",
          isReserve: !activateNow,
          isPrimary: activateNow,
          isMediationReserve: true,
          moderatedById: admin.id,
        },
      });

  if (activateNow) {
    await prisma.question.updateMany({
      where: {
        topicId,
        id: { not: reserveQuestion.id },
        isPrimary: true,
      },
      data: { isPrimary: false },
    });

    await prisma.topic.update({
      where: { id: topicId },
      data: {
        primaryQuestionId: reserveQuestion.id,
        reserveQuestionId: reserveQuestion.id,
      },
    });
  } else {
    await prisma.topic.update({
      where: { id: topicId },
      data: { reserveQuestionId: reserveQuestion.id },
    });
  }

  await updateLiveStateAtomic(event.id, "question.selected", {});

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: activateNow
      ? "MEDIATION_RESERVE_QUESTION_ACTIVATED"
      : "MEDIATION_RESERVE_QUESTION_UPDATED",
    entityType: "Question",
    entityId: reserveQuestion.id,
    metadata: { topicId, isMediationReserve: true },
  });

  revalidatePath("/admin/perguntas");
  revalidatePath("/admin");
}

/**
 * Exibe uma pergunta aprovada/selecionada no telão ARENA
 */
export async function displayQuestionOnArenaAction(questionId: string) {
  const admin = await requireAdminPermission("canModerateQuestions");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) throw new Error("Pergunta não encontrada");

  if (
    question.status === "REJECTED" ||
    question.status === "DUPLICATE" ||
    question.status === "RECEIVED"
  ) {
    throw new Error(
      "Somente perguntas aprovadas ou selecionadas pela moderação podem ir ao telão."
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
    metadata: { isMediationReserve: question.isMediationReserve },
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
    arenaMode: "SPEAKER_EXPOSITION",
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
 * Ações de Gerenciamento da Votação Única da Mesa-Redonda e Desempate (§4, §5 e §7)
 */
export async function openPollByIdAction(pollId: string) {
  const admin = await requireAdminPermission("canManagePolls");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const poll = await prisma.poll.update({
    where: { id: pollId },
    data: {
      status: "OPEN",
      isTieBreak: false,
      openedAt: new Date(),
    },
  });

  const currentArenaMode = event.liveState?.arenaMode;
  const nextArenaMode =
    currentArenaMode === "SPEAKER_EXPOSITION"
      ? "SPEAKER_EXPOSITION"
      : "POLL_OPEN";

  await updateLiveStateAtomic(event.id, "poll.opened", {
    activePollId: poll.id,
    arenaMode: nextArenaMode,
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

  const pollRecord = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: { orderBy: { optionOrder: "asc" } } },
  });
  if (!pollRecord) throw new Error("Votação não encontrada");

  const sorted = [...pollRecord.options].sort(
    (a, b) => b.votesCount - a.votesCount
  );
  const topVotes = sorted[0]?.votesCount ?? 0;
  const tiedTop = sorted.filter(
    (o) => o.votesCount === topVotes && topVotes > 0
  );
  const autoWinner = tiedTop.length === 1 ? tiedTop[0] : sorted[0] ?? null;

  const nextStatus = publishOnArena ? "RESULTS_PUBLISHED" : "CLOSED";

  const poll = await prisma.poll.update({
    where: { id: pollId },
    data: {
      status: nextStatus,
      closedAt: new Date(),
      closedByUserId: admin.id,
      ...(publishOnArena ? { resultsPublishedAt: new Date() } : {}),
      winningOptionId:
        pollRecord.winningOptionId ?? (autoWinner ? autoWinner.id : null),
      winningQuestionText:
        pollRecord.winningQuestionText ??
        (autoWinner ? autoWinner.label : null),
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
    metadata: {
      number: poll.number,
      totalVotes: poll.totalVotes,
      winningOptionId: poll.winningOptionId,
    },
  });

  revalidatePath("/admin/votacoes");
  revalidatePath("/admin/operacao");
  revalidatePath("/admin");
}

/**
 * Inicia uma Rodada Rápida de Desempate de 2 minutos apenas entre as questões empatadas (§7 — Regra de desempate)
 */
export async function startPollTieBreakRoundAction(pollId: string) {
  const admin = await requireAdminPermission("canManagePolls");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: { orderBy: { optionOrder: "asc" } } },
  });
  if (!poll) throw new Error("Votação não encontrada");

  const maxVotes = Math.max(...poll.options.map((o) => o.votesCount), 0);
  const tiedIds = poll.options
    .filter((o) => o.votesCount === maxVotes)
    .map((o) => o.id);

  await prisma.poll.update({
    where: { id: pollId },
    data: {
      status: "TIE_BREAK",
      isTieBreak: true,
      tieBreakOptionIds: tiedIds,
      durationSec: 120,
      openedAt: new Date(),
    },
  });

  await updateLiveStateAtomic(event.id, "poll.tie_break_started", {
    activePollId: pollId,
    arenaMode: "POLL_OPEN",
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "POLL_TIE_BREAK_STARTED",
    entityType: "Poll",
    entityId: pollId,
    justification: "Rodada rápida de desempate de 2 minutos entre opções empatadas",
    metadata: { tiedOptionIds: tiedIds, maxVotes },
  });

  revalidatePath("/admin/votacoes");
  revalidatePath("/admin/operacao");
  revalidatePath("/admin");
}

/**
 * Define oficialmente a questão vencedora para a Mesa-Redonda (ou registra decisão justificada / fusão em caso de empate)
 * e opcionalmente envia direto para o telão da Mesa-Redonda (§4, §5 e §7)
 */
export async function setPollWinnerAndSendToRoundtableAction(
  formData: FormData
) {
  const admin = await requireAdminPermission("canManagePolls");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const pollId = String(formData.get("pollId") || "").trim();
  const winningOptionId =
    String(formData.get("winningOptionId") || "").trim() || null;
  const customWinningText = String(
    formData.get("winningQuestionText") || ""
  ).trim();
  const justification =
    String(formData.get("tieBreakJustification") || "").trim() || null;
  const sendToRoundtableNow =
    formData.get("sendToRoundtableNow") === "true";

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: true },
  });
  if (!poll) throw new Error("Votação não encontrada");

  const chosenOption = winningOptionId
    ? poll.options.find((o) => o.id === winningOptionId)
    : null;

  const finalQuestionText =
    customWinningText ||
    chosenOption?.label ||
    poll.winningQuestionText ||
    poll.options[0]?.label ||
    "";

  await prisma.poll.update({
    where: { id: pollId },
    data: {
      status: "RESULTS_PUBLISHED",
      closedAt: poll.closedAt ?? new Date(),
      resultsPublishedAt: new Date(),
      closedByUserId: admin.id,
      winningOptionId: chosenOption?.id ?? winningOptionId,
      winningQuestionText: finalQuestionText,
      tieBreakJustification: justification,
    },
  });

  await updateLiveStateAtomic(event.id, "poll.results_published", {
    activePollId: pollId,
    arenaMode: sendToRoundtableNow ? "ROUNDTABLE" : "POLL_RESULTS",
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: sendToRoundtableNow
      ? "ROUNDTABLE_QUESTION_CONFIRMED_AND_DISPLAYED"
      : "ROUNDTABLE_QUESTION_CONFIRMED",
    entityType: "Poll",
    entityId: pollId,
    justification:
      justification || "Apuração oficial da questão vencedora da Mesa-Redonda",
    metadata: {
      winningOptionId: chosenOption?.id ?? winningOptionId,
      winningQuestionText: finalQuestionText,
    },
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
    Number(formData.get("durationSec") || 900)
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
    const newTheme = String(formData.get(`theme_${opt.id}`) || "").trim();
    if (
      (newLabel && newLabel !== opt.label) ||
      (newTheme && newTheme !== opt.themeLabel)
    ) {
      await prisma.pollOption.update({
        where: { id: opt.id },
        data: {
          ...(newLabel ? { label: newLabel } : {}),
          ...(newTheme ? { themeLabel: newTheme } : {}),
        },
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
    prisma.voteHistory.deleteMany({ where: { pollId } }),
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
        isTieBreak: false,
        tieBreakOptionIds: [],
        tieBreakJustification: null,
        winningOptionId: null,
        winningQuestionText: null,
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
