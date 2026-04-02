import { ChatMessage } from "@/types";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { MATCH_COLLECTION } from "@/lib/matches";

export const MATCH_CHAT_SUBCOLLECTION = "chatMessages";
export const MAX_CHAT_MESSAGE_LENGTH = 255;

function buildChatMessageFromDoc(
  id: string,
  data: Record<string, unknown>,
): ChatMessage {
  const createdAt = data.createdAt as { toMillis?: () => number } | undefined;

  return {
    id: id,
    senderUid: typeof data.senderUid === "string" ? data.senderUid : "",
    text: typeof data.text === "string" ? data.text : "",
    createdAtMillis: createdAt?.toMillis ? createdAt.toMillis() : null,
  };
}

export function subscribeToMatchChat(
  matchId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
) {
  const chatQuery = query(
    collection(db, MATCH_COLLECTION, matchId, MATCH_CHAT_SUBCOLLECTION),
    orderBy("createdAt", "asc"),
    limit(100),
  );

  return onSnapshot(
    chatQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((docSnap) =>
        buildChatMessageFromDoc(
          docSnap.id,
          docSnap.data({ serverTimestamps: "estimate" }) as Record<
            string,
            unknown
          >,
        ),
      );

      onMessages(messages);
    },
    (error) => {
      console.error("Error subscribing to match chat:", error);
      onError?.(error);
    },
  );
}

export async function sendMatchChatMessage({
  matchId,
  senderUid,
  text,
}: {
  matchId: string;
  senderUid: string;
  text: string;
}) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("EMPTY_MESSAGE");
  }

  if (trimmedText.length > MAX_CHAT_MESSAGE_LENGTH) {
    throw new Error("MESSAGE_TOO_LONG");
  }

  await addDoc(
    collection(db, MATCH_COLLECTION, matchId, MATCH_CHAT_SUBCOLLECTION),
    {
      senderUid,
      text: trimmedText,
      createdAt: serverTimestamp(),
    },
  );
}
