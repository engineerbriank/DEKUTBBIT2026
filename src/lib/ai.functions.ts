import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExamQuestion = {
  number: number;
  type: string;
  marks: number;
  question: string;
  options: string[];
  answer: string;
};

/** Reads an uploaded study file from storage, extracts its text and indexes it. */
export const processDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { filePath: string; fileName: string; mimeType: string }) => {
    if (!input?.filePath) throw new Error("File path is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!data.filePath.startsWith(`${context.userId}/`)) {
      throw new Error("Forbidden: you can only process your own uploads.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: blob, error } = await supabaseAdmin.storage.from("ai-uploads").download(data.filePath);
    if (error || !blob) throw new Error(error?.message ?? "Could not read the uploaded file.");

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const { extractText, chunkText } = await import("./doc-extract.server");
    const text = await extractText(bytes, data.fileName, data.mimeType);
    if (!text || text.length < 30) {
      throw new Error("No readable text was found in this file. Scanned images are not supported.");
    }
    const chunks = chunkText(text);

    const { data: row, error: insertError } = await supabaseAdmin
      .from("ai_documents")
      .insert({
        owner_id: context.userId,
        file_name: data.fileName,
        file_path: data.filePath,
        mime_type: data.mimeType,
        char_count: text.length,
        extracted_text: text,
      })
      .select("id,file_name,char_count,created_at")
      .single();
    if (insertError) throw new Error(insertError.message);

    return { ...row, chunkCount: chunks.length, preview: text.slice(0, 400) };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_documents")
      .select("id,file_name,char_count,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Document id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("ai_documents")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("ai_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (doc?.file_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("ai-uploads").remove([doc.file_path]);
    }
    return { ok: true };
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { documentId?: string | null }) => input ?? {})
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("ai_messages")
      .select("id,role,content,created_at,document_id")
      .order("created_at");
    query = data.documentId ? query.eq("document_id", data.documentId) : query.is("document_id", null);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Answers a student question with real AI, grounded in their uploaded document when chosen. */
export const askAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { question: string; documentId?: string | null }) => {
    if (!input?.question?.trim()) throw new Error("Please type a question.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { callGateway, userItem, assistantItem } = await import("./ai-gateway.server");
    const { retrieveContext } = await import("./doc-extract.server");

    let contextText = "";
    let sourceName = "";
    if (data.documentId) {
      const { data: doc, error } = await supabaseAdmin
        .from("ai_documents")
        .select("id,file_name,extracted_text,owner_id")
        .eq("id", data.documentId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!doc || doc.owner_id !== context.userId) throw new Error("Study material not found.");
      sourceName = doc.file_name;
      contextText = retrieveContext(doc.extracted_text, data.question);
    }

    let historyQuery = context.supabase
      .from("ai_messages")
      .select("role,content")
      .order("created_at", { ascending: false })
      .limit(8);
    historyQuery = data.documentId
      ? historyQuery.eq("document_id", data.documentId)
      : historyQuery.is("document_id", null);
    const { data: history } = await historyQuery;

    const priorItems = (history ?? [])
      .reverse()
      .map((message) =>
        message.role === "assistant" ? assistantItem(message.content) : userItem(message.content),
      );

    const prompt = contextText
      ? `Study material: "${sourceName}"\n\n<material>\n${contextText}\n</material>\n\nStudent question: ${data.question}\n\nAnswer strictly from the material above. If the material does not cover it, say so clearly and then give brief general guidance.`
      : data.question;

    const answer = await callGateway([...priorItems, userItem(prompt)], {
      instructions:
        "You are the BBITClassPoint study assistant for Business Information Technology students. Give clear, exam-focused answers with short headings and bullet points where useful. Never invent facts about a student's uploaded material.",
    });

    if (!answer) throw new Error("The AI returned an empty answer. Please try again.");

    await supabaseAdmin.from("ai_messages").insert([
      {
        owner_id: context.userId,
        document_id: data.documentId ?? null,
        role: "user",
        content: data.question,
      },
      {
        owner_id: context.userId,
        document_id: data.documentId ?? null,
        role: "assistant",
        content: answer,
      },
    ]);

    return { answer, groundedIn: sourceName || null };
  });

const EXAM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    instructions: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          number: { type: "integer" },
          type: { type: "string", enum: ["multiple-choice", "short-answer", "essay"] },
          marks: { type: "integer" },
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "string" },
        },
        required: ["number", "type", "marks", "question", "options", "answer"],
      },
    },
  },
  required: ["title", "instructions", "questions"],
} as const;

/** Generates a real exam paper with AI, from a unit's published resources or an uploaded document. */
export const generateExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      unitId?: string | null;
      documentId?: string | null;
      topic?: string;
      questionCount: number;
      difficulty: string;
    }) => {
      if (!input?.questionCount || input.questionCount < 1 || input.questionCount > 20) {
        throw new Error("Choose between 1 and 20 questions.");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { callGateway, userItem } = await import("./ai-gateway.server");
    const { retrieveContext } = await import("./doc-extract.server");

    let unitLabel = "General BBIT";
    let material = "";

    if (data.unitId) {
      const { data: unit } = await context.supabase
        .from("units")
        .select("code,name,description")
        .eq("id", data.unitId)
        .maybeSingle();
      if (unit) {
        unitLabel = `${unit.code} — ${unit.name}`;
        const { data: resources } = await context.supabase
          .from("resources")
          .select("title,topic,description")
          .eq("unit_id", data.unitId)
          .eq("status", "published");
        material += `Unit outline: ${unit.description}\nPublished course material topics:\n`;
        material += (resources ?? [])
          .map((row) => `- ${row.title}${row.topic ? ` (topic: ${row.topic})` : ""}: ${row.description}`)
          .join("\n");
      }
    }

    if (data.documentId) {
      const { data: doc } = await supabaseAdmin
        .from("ai_documents")
        .select("file_name,extracted_text,owner_id")
        .eq("id", data.documentId)
        .maybeSingle();
      if (doc && doc.owner_id === context.userId) {
        material += `\n\nStudent notes "${doc.file_name}":\n${retrieveContext(doc.extracted_text, data.topic || unitLabel, 10000)}`;
      }
    }

    const raw = await callGateway(
      [
        userItem(
          `Create a ${data.difficulty} university examination paper for ${unitLabel}.\n` +
            (data.topic ? `Focus topic: ${data.topic}\n` : "") +
            `Number of questions: ${data.questionCount}.\n` +
            `Mix multiple-choice and written questions. Multiple-choice questions must have exactly 4 options; other types must have an empty options array. Every question needs a model answer.\n\n` +
            (material ? `Base the paper on this course material:\n${material}` : ""),
        ),
      ],
      {
        instructions:
          "You are an experienced university examiner writing Business Information Technology exam papers. Return valid JSON matching the schema.",
        jsonSchema: { name: "exam_paper", schema: EXAM_SCHEMA as unknown as Record<string, unknown> },
      },
    );

    let parsed: { title: string; instructions: string; questions: ExamQuestion[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("The AI response could not be read. Please try generating again.");
    }
    if (!parsed.questions?.length) throw new Error("No questions were generated. Please try again.");

    const { data: saved, error } = await supabaseAdmin
      .from("exams")
      .insert({
        owner_id: context.userId,
        unit_id: data.unitId ?? null,
        title: parsed.title,
        content: parsed as never,
      })
      .select("id,created_at")
      .single();
    if (error) throw new Error(error.message);

    return { id: saved.id, createdAt: saved.created_at, exam: parsed, unitLabel };
  });

export const listExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exams")
      .select("id,title,created_at,content")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
