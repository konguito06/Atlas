import { z } from "zod";
import type { ChatMessage, ChatModel } from "./assistant-engine";

// OpenAI's chat format, as one ChatModel. It only shapes the request and
// reads the response; `send` does the actual call, wherever the key is kept
// (on desktop, in native code, so the key never reaches the web view).

/** The model the assistant asks for. Change it here to use another. */
export const OPENAI_MODEL = "gpt-4o-mini";

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullish(),
          tool_calls: z
            .array(
              z.object({
                id: z.string(),
                function: z.object({ name: z.string(), arguments: z.string() }),
              }),
            )
            .nullish(),
        }),
      }),
    )
    .min(1),
});

function toOpenAiMessage(message: ChatMessage) {
  if (message.role === "tool") {
    return {
      role: "tool",
      tool_call_id: message.toolCallId,
      content: message.content,
    };
  }
  if (message.role === "assistant" && message.toolCalls?.length) {
    return {
      role: "assistant",
      content: message.text || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: call.arguments },
      })),
    };
  }
  return { role: message.role, content: message.text };
}

/**
 * @param send Posts a chat-completions body to OpenAI and resolves to the
 *   parsed JSON response, or rejects with a message fit to show a person.
 */
export function createOpenAiModel(
  send: (body: unknown) => Promise<unknown>,
  model: string = OPENAI_MODEL,
): ChatModel {
  return {
    async complete({ system, messages, tools }) {
      const response = responseSchema.safeParse(
        await send({
          model,
          messages: [
            { role: "system", content: system },
            ...messages.map(toOpenAiMessage),
          ],
          tools: tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          })),
        }),
      );
      if (!response.success) {
        throw new Error("The assistant's reply could not be understood.");
      }
      const [choice] = response.data.choices;
      return {
        text: choice?.message.content ?? "",
        toolCalls: (choice?.message.tool_calls ?? []).map((call) => ({
          id: call.id,
          name: call.function.name,
          arguments: call.function.arguments,
        })),
      };
    },
  };
}
