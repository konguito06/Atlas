import {
  type AssistantAccess,
  createAssistantEngine,
  createOpenAiModel,
} from "@atlas/core";
import { invoke } from "@tauri-apps/api/core";

// The native side (src-tauri/src/assistant.rs) holds the key and makes the
// requests. It fails with a sentence meant for the person, passed on here.
async function native<Result>(
  command: string,
  args?: Record<string, unknown>,
): Promise<Result> {
  try {
    return await invoke<Result>(command, args);
  } catch (cause) {
    throw new Error(
      typeof cause === "string" ? cause : "The assistant could not be reached.",
    );
  }
}

/** The assistant on this Mac: OpenAI, with the key in the keychain. */
export const openAiAccess: AssistantAccess = {
  hasKey: () => native<boolean>("assistant_has_key"),
  saveKey: (key) => native("assistant_save_key", { key }),
  removeKey: () => native("assistant_remove_key"),
  createEngine: (data, workspaceId) =>
    createAssistantEngine({
      model: createOpenAiModel((body) =>
        native("assistant_complete", { body }),
      ),
      data,
      workspaceId,
    }),
};
