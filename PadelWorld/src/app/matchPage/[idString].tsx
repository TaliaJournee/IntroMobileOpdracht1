import React, { useEffect, useMemo, useState } from "react";
import { ChatMessage, Match, MatchPlayer, MatchSetScore } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_SKILL_LEVEL,
  USER_COLLECTION,
  clampSkillLevel,
  formatSkillLevel,
  parseSkillLevel,
} from "@/lib/userProfiles";
import {
  buildWinnerLevelUpdates,
  normalizePlayers,
  validateCompetitiveSets,
} from "@/lib/competitive";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Timestamp,
  doc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { db } from "../../../firebaseConfig";
import { buildMatchFromDoc, MATCH_COLLECTION } from "@/lib/matches";
import { joinMatchAfterPayment } from "@/lib/matchActions";
import {
  MAX_CHAT_MESSAGE_LENGTH,
  sendMatchChatMessage,
  subscribeToMatchChat,
} from "../../lib/matchChat";

dayjs.extend(customParseFormat);

type ScoreInputRow = {
  team1: string;
  team2: string;
};

function getCompetitiveRangeText(match: Match) {
  if (
    typeof match.levelMin === "number" &&
    typeof match.levelMax === "number"
  ) {
    return `${formatSkillLevel(match.levelMin)} - ${formatSkillLevel(
      match.levelMax,
    )}`;
  }

  if (typeof match.level === "number") {
    return formatSkillLevel(match.level);
  }

  return "Any";
}

function createEmptyScoreInputs(): ScoreInputRow[] {
  return [
    { team1: "", team2: "" },
    { team1: "", team2: "" },
    { team1: "", team2: "" },
  ];
}

function getChatSenderLabel(
  message: ChatMessage,
  currentUserUid: string | undefined,
  players: MatchPlayer[],
) {
  if (currentUserUid && message.senderUid === currentUserUid) {
    return "You";
  }

  const playerIndex = players.findIndex(
    (player) => player.uid === message.senderUid,
  );

  if (playerIndex >= 0) {
    return `Player ${playerIndex + 1}`;
  }

  return "Player";
}

function formatChatTimestamp(createdAtMillis: number | null) {
  if (createdAtMillis === null) {
    return "Sending...";
  }

  return dayjs(createdAtMillis).format("DD/MM HH:mm");
}

const MatchPage = () => {
  const { idString } = useLocalSearchParams<{ idString: string }>();
  const { user } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [savingScore, setSavingScore] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [scoreInputs, setScoreInputs] = useState<ScoreInputRow[]>(
    createEmptyScoreInputs(),
  );

  useEffect(() => {
    if (!idString) {
      setError("No match ID was provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const matchRef = doc(db, MATCH_COLLECTION, idString);

    const unsubscribe = onSnapshot(
      matchRef,
      (matchSnap) => {
        if (!matchSnap.exists()) {
          setMatch(null);
          setError("Match not found.");
          setLoading(false);
          return;
        }

        const data = matchSnap.data() as Record<string, unknown>;
        setMatch(buildMatchFromDoc(matchSnap.id, data));
        setLoading(false);
      },
      (err) => {
        console.error("Error loading match:", err);
        setError("Something went wrong while loading the match.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [idString]);

  const totalSlots = match?.totalSlots ?? 4;
  const knownPlayers = match?.players ?? [];
  const takenSlots = knownPlayers.length;
  const openSlots = Math.max(totalSlots - takenSlots, 0);
  const isUserInMatch =
    !!user && knownPlayers.some((player) => player.uid === user.uid);

  useEffect(() => {
    if (!idString || !isUserInMatch) {
      setChatMessages([]);
      setChatError("");
      return;
    }

    const unsubscribe = subscribeToMatchChat(
      idString,
      (messages) => {
        setChatMessages(messages);
        setChatError("");
      },
      () => {
        setChatError("Something went wrong while loading the match chat.");
      },
    );

    return unsubscribe;
  }, [idString, isUserInMatch]);

  const parsedMatchDate = match?.date
    ? dayjs(match.date, "DD/MM/YYYY HH:mm", true)
    : null;
  const isPastMatch = parsedMatchDate
    ? !parsedMatchDate.isAfter(dayjs())
    : false;
  const scoreAlreadySubmitted = !!match?.score;
  const competitiveRangeText = match ? getCompetitiveRangeText(match) : "Any";

  const playerSlots = useMemo(() => {
    return Array.from({ length: totalSlots }, (_, index) => {
      const player = knownPlayers[index];

      if (player) {
        return {
          type: "known" as const,
          player,
        };
      }

      return {
        type: "empty" as const,
        player: null,
      };
    });
  }, [knownPlayers, totalSlots]);

  const canJoinMatch =
    !!user &&
    !isUserInMatch &&
    openSlots > 0 &&
    !isPastMatch &&
    !scoreAlreadySubmitted;

  const canSubmitScore =
    !!user &&
    !!match?.competitive &&
    isUserInMatch &&
    knownPlayers.length === 4 &&
    isPastMatch &&
    !scoreAlreadySubmitted;

  const canSendMessage =
    !!user &&
    isUserInMatch &&
    chatInput.trim().length > 0 &&
    chatInput.trim().length <= MAX_CHAT_MESSAGE_LENGTH;

  const handleJoinMatch = async () => {
    if (!user || !idString) {
      setError("You must be signed in to join a match.");
      return;
    }

    try {
      setJoining(true);
      setError("");

      if (match?.competitive) {
        router.push({
          pathname: "/payment",
          params: {
            action: "join",
            matchId: idString,
          },
        });
        return;
      }

      await joinMatchAfterPayment({
        matchId: idString,
        userUid: user.uid,
      });
    } catch (err) {
      console.error("Error joining match:", err);

      if (err instanceof Error) {
        switch (err.message) {
          case "MATCH_NOT_FOUND":
            setError("Match not found.");
            break;
          case "ALREADY_JOINED":
            setError("You are already part of this match.");
            break;
          case "MATCH_FULL":
            setError("This match is already full.");
            break;
          case "MATCH_CLOSED":
            setError("This match already has a submitted result.");
            break;
          case "MATCH_PAST":
            setError("You cannot join a match that has already started.");
            break;
          case "LEVEL_OUT_OF_RANGE":
            setError("Your level is outside the allowed competitive range.");
            break;
          default:
            setError("Something went wrong while joining the match.");
        }
      } else {
        setError("Something went wrong while joining the match.");
      }
    } finally {
      setJoining(false);
    }
  };

  const updateSetInput = (
    index: number,
    key: "team1" | "team2",
    value: string,
  ) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    setScoreInputs((current) =>
      current.map((setRow, currentIndex) => {
        if (currentIndex !== index) {
          return setRow;
        }

        return {
          ...setRow,
          [key]: value,
        };
      }),
    );
  };

  const handleSubmitScore = async () => {
    if (!user || !idString) {
      setError("You must be signed in to submit a score.");
      return;
    }

    const incompleteRow = scoreInputs.find(
      (setRow) =>
        (setRow.team1.trim() !== "" && setRow.team2.trim() === "") ||
        (setRow.team2.trim() !== "" && setRow.team1.trim() === ""),
    );

    if (incompleteRow) {
      setError("Fill both sides of a set or leave the whole set empty.");
      return;
    }

    const enteredSets: MatchSetScore[] = scoreInputs
      .filter(
        (setRow) => setRow.team1.trim() !== "" || setRow.team2.trim() !== "",
      )
      .map((setRow) => ({
        team1: Number(setRow.team1),
        team2: Number(setRow.team2),
      }));

    const validation = validateCompetitiveSets(enteredSets);

    if (!validation.valid) {
      setError(validation.message ?? "Invalid score.");
      return;
    }

    if (validation.winnerTeam === undefined) {
      setError("Invalid score.");
      return;
    }

    const winnerTeam: 1 | 2 = validation.winnerTeam;

    try {
      setSavingScore(true);
      setError("");

      const matchRef = doc(db, MATCH_COLLECTION, idString);

      await runTransaction(db, async (transaction) => {
        const matchSnap = await transaction.get(matchRef);

        if (!matchSnap.exists()) {
          throw new Error("MATCH_NOT_FOUND");
        }

        const data = matchSnap.data() as Record<string, unknown>;
        const players = normalizePlayers(data.players);
        const hasScore = !!data.score;
        const isCompetitive = !!data.competitive;
        const isUserParticipant = players.some(
          (player: MatchPlayer) => player.uid === user.uid,
        );
        const rawDate = data.date as { toDate?: () => Date } | undefined;
        const matchDate = rawDate?.toDate ? dayjs(rawDate.toDate()) : null;

        if (!isCompetitive) {
          throw new Error("NOT_COMPETITIVE");
        }

        if (!isUserParticipant) {
          throw new Error("NOT_PLAYER");
        }

        if (players.length < 4) {
          throw new Error("NOT_FULL");
        }

        if (hasScore) {
          throw new Error("SCORE_ALREADY_EXISTS");
        }

        if (!matchDate || matchDate.isAfter(dayjs())) {
          throw new Error("TOO_EARLY");
        }

        const levelUpdates = buildWinnerLevelUpdates(players, winnerTeam);

        const playerDocs: Array<{
          userRef: ReturnType<typeof doc>;
          levelUpdate: (typeof levelUpdates)[number];
          currentSkillLevel: number;
        }> = [];

        for (const levelUpdate of levelUpdates) {
          const userRef = doc(db, USER_COLLECTION, levelUpdate.uid);
          const userSnap = await transaction.get(userRef);

          const currentSkillLevel = userSnap.exists()
            ? parseSkillLevel(userSnap.data().skillLevel)
            : levelUpdate.previousSkillLevel;

          playerDocs.push({
            userRef,
            levelUpdate,
            currentSkillLevel,
          });
        }

        for (const playerDoc of playerDocs) {
          transaction.set(
            playerDoc.userRef,
            {
              skillLevel: clampSkillLevel(
                playerDoc.currentSkillLevel + playerDoc.levelUpdate.delta,
              ),
            },
            { merge: true },
          );
        }

        transaction.update(matchRef, {
          score: {
            sets: enteredSets,
            winnerTeam,
            submittedByUid: user.uid,
            levelsApplied: true,
            completedAt: Timestamp.now(),
          },
        });
      });

      setScoreInputs(createEmptyScoreInputs());
    } catch (err) {
      console.error("Error submitting score:", err);

      if (err instanceof Error) {
        switch (err.message) {
          case "MATCH_NOT_FOUND":
            setError("Match not found.");
            break;
          case "NOT_COMPETITIVE":
            setError("This is not a competitive match.");
            break;
          case "NOT_PLAYER":
            setError("Only players in the match can submit a score.");
            break;
          case "NOT_FULL":
            setError(
              "A competitive score can only be submitted for a full match.",
            );
            break;
          case "SCORE_ALREADY_EXISTS":
            setError("A result has already been submitted for this match.");
            break;
          case "TOO_EARLY":
            setError("You can only submit the score after the match time.");
            break;
          default:
            setError("Something went wrong while submitting the score.");
        }
      } else {
        setError("Something went wrong while submitting the score.");
      }
    } finally {
      setSavingScore(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !idString) {
      setChatError("You must be signed in to send a message.");
      return;
    }

    if (!isUserInMatch) {
      setChatError("Only players in this match can use the chat.");
      return;
    }

    try {
      setSendingMessage(true);
      setChatError("");

      await sendMatchChatMessage({
        matchId: idString,
        senderUid: user.uid,
        text: chatInput,
      });

      setChatInput("");
    } catch (err) {
      console.error("Error sending message:", err);

      if (err instanceof Error) {
        switch (err.message) {
          case "EMPTY_MESSAGE":
            setChatError("Type a message before sending.");
            break;
          case "MESSAGE_TOO_LONG":
            setChatError(
              `Messages can be at most ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
            );
            break;
          default:
            setChatError("Something went wrong while sending the message.");
        }
      } else {
        setChatError("Something went wrong while sending the message.");
      }
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.helperText}>Loading match...</Text>
      </View>
    );
  }

  if (error && !match) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No match data available.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{openSlots} spots left</Text>
        </View>

        <Text style={styles.title}>{match.name || "Unnamed match"}</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{match.date || "Unknown"}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Gender</Text>
          <Text style={styles.value}>{match.genders || "Unknown"}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Competitive</Text>
          <Text style={styles.value}>{match.competitive ? "Yes" : "No"}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Level range</Text>
          <Text style={styles.value}>
            {match.competitive
              ? competitiveRangeText
              : "Does not matter for friendly matches"}
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Players</Text>
          <Text style={styles.value}>
            {takenSlots}/{totalSlots}
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Club</Text>
          <Text style={styles.value}>
            {match.club?.name || "Unknown club"}
            {match.club?.place ? ` • ${match.club.place}` : ""}
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Club address</Text>
          <Text style={styles.value}>{match.club?.address || "Unknown"}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Province</Text>
          <Text style={styles.value}>{match.club?.province || "Unknown"}</Text>
        </View>

        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>Players</Text>
          <Text style={styles.teamHint}>
            Team 1 = Player 1 + Player 2 • Team 2 = Player 3 + Player 4
          </Text>

          {playerSlots.map((slot, index) => {
            const isCurrentUser = !!user && slot.player?.uid === user.uid;

            return (
              <View key={`player-slot-${index + 1}`} style={styles.playerRow}>
                <View>
                  <Text style={styles.playerName}>Player {index + 1}</Text>
                  <Text style={styles.playerSubtext}>
                    {slot.type === "known"
                      ? `Level ${slot.player.skillLevel.toFixed(1)}${
                          isCurrentUser ? " • You" : ""
                        }`
                      : "Open spot"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.playerStatusBadge,
                    slot.type === "known" && styles.playerStatusFilled,
                    slot.type === "empty" && styles.playerStatusOpen,
                  ]}
                >
                  <Text
                    style={[
                      styles.playerStatusText,
                      slot.type === "empty" && styles.playerStatusTextOpen,
                    ]}
                  >
                    {slot.type === "empty" ? "Open" : "Joined"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {isUserInMatch && (
          <View style={styles.chatSection}>
            <View style={styles.chatHeaderRow}>
              <Text style={styles.sectionTitle}>Match chat</Text>
              <Text style={styles.chatCounterText}>
                {chatMessages.length} message{chatMessages.length === 1 ? "" : "s"}
              </Text>
            </View>

            <Text style={styles.helperCopy}>
              Only players in this match can see and send messages here.
            </Text>

            <View style={styles.chatMessagesBox}>
              {chatMessages.length === 0 ? (
                <Text style={styles.emptyChatText}>
                  No messages yet. Start the conversation.
                </Text>
              ) : (
                chatMessages.map((message) => {
                  const isOwnMessage = !!user && message.senderUid === user.uid;

                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.chatMessageBubble,
                        isOwnMessage
                          ? styles.chatMessageBubbleOwn
                          : styles.chatMessageBubbleOther,
                      ]}
                    >
                      <View style={styles.chatMetaRow}>
                        <Text style={styles.chatSenderText}>
                          {getChatSenderLabel(message, user?.uid, knownPlayers)}
                        </Text>
                        <Text style={styles.chatTimeText}>
                          {formatChatTimestamp(message.createdAtMillis)}
                        </Text>
                      </View>
                      <Text style={styles.chatMessageText}>{message.text}</Text>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.chatComposer}>
              <TextInput
                value={chatInput}
                onChangeText={(value) => {
                  if (value.length <= MAX_CHAT_MESSAGE_LENGTH) {
                    setChatInput(value);
                  }
                }}
                placeholder="Write a message to the other players"
                multiline
                textAlignVertical="top"
                style={styles.chatInput}
              />

              <View style={styles.chatComposerFooter}>
                <Text style={styles.chatLimitText}>
                  {chatInput.trim().length}/{MAX_CHAT_MESSAGE_LENGTH}
                </Text>

                <Pressable
                  onPress={handleSendMessage}
                  disabled={!canSendMessage || sendingMessage}
                  style={({ pressed }) => [
                    styles.chatSendButton,
                    pressed && styles.primaryButtonPressed,
                    (!canSendMessage || sendingMessage) &&
                      styles.chatSendButtonDisabled,
                  ]}
                >
                  <Text style={styles.chatSendButtonText}>
                    {sendingMessage ? "Sending..." : "Send"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {!!chatError && <Text style={styles.inlineErrorText}>{chatError}</Text>}
          </View>
        )}

        {match.score && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Result</Text>
            {match.score.sets.map((setResult, index) => (
              <View key={`set-result-${index + 1}`} style={styles.resultRow}>
                <Text style={styles.resultLabel}>Set {index + 1}</Text>
                <Text style={styles.resultValue}>
                  {setResult.team1} - {setResult.team2}
                </Text>
              </View>
            ))}
            <Text style={styles.winnerText}>
              Winner: Team {match.score.winnerTeam}
            </Text>
          </View>
        )}

        {!!error && <Text style={styles.inlineErrorText}>{error}</Text>}

        {canJoinMatch && (
          <Pressable
            onPress={handleJoinMatch}
            disabled={joining}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              joining && styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {joining ? "Joining..." : "Join match"}
            </Text>
          </Pressable>
        )}

        {!!user &&
          isUserInMatch &&
          !scoreAlreadySubmitted &&
          !match.competitive && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                You are already part of this match.
              </Text>
            </View>
          )}

        {!!match.competitive && !scoreAlreadySubmitted && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Submit competitive result</Text>

            {!isUserInMatch && (
              <Text style={styles.noticeText}>
                Join the match to submit the score.
              </Text>
            )}
            {isUserInMatch && knownPlayers.length < 4 && (
              <Text style={styles.noticeText}>
                A competitive result can only be submitted when all 4 players
                joined.
              </Text>
            )}
            {isUserInMatch && knownPlayers.length === 4 && !isPastMatch && (
              <Text style={styles.noticeText}>
                The score can be entered after the match time has passed.
              </Text>
            )}

            {canSubmitScore && (
              <>
                <Text style={styles.helperCopy}>
                  Enter 2 or 3 full sets. A set is valid when one team reaches
                  at least 6 games and wins by 2, like 6-4, 7-5, or 11-9.
                </Text>

                {scoreInputs.map((setRow, index) => (
                  <View
                    key={`set-input-${index + 1}`}
                    style={styles.setInputBlock}
                  >
                    <Text style={styles.setLabel}>Set {index + 1}</Text>
                    <View style={styles.setInputRow}>
                      <TextInput
                        value={setRow.team1}
                        onChangeText={(value) =>
                          updateSetInput(index, "team1", value)
                        }
                        keyboardType="number-pad"
                        placeholder="0"
                        style={styles.scoreInput}
                      />
                      <Text style={styles.scoreDivider}>-</Text>
                      <TextInput
                        value={setRow.team2}
                        onChangeText={(value) =>
                          updateSetInput(index, "team2", value)
                        }
                        keyboardType="number-pad"
                        placeholder="0"
                        style={styles.scoreInput}
                      />
                    </View>
                  </View>
                ))}

                <Pressable
                  onPress={handleSubmitScore}
                  disabled={savingScore}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    savingScore && styles.primaryButtonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {savingScore ? "Saving result..." : "Submit result"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {scoreAlreadySubmitted && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              The result for this match has already been submitted.
            </Text>
          </View>
        )}

        {openSlots === 0 && !scoreAlreadySubmitted && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>This match is full.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F7F8FC",
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F7F8FC",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeText: {
    color: "#166534",
    fontWeight: "700",
    fontSize: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 20,
  },
  infoBlock: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: "#7C8493",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#1F2A44",
    fontWeight: "500",
  },
  playersSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  chatSection: {
    marginBottom: 20,
  },
  resultSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 12,
  },
  teamHint: {
    marginBottom: 12,
    color: "#6B7280",
    fontSize: 13,
  },
  playerRow: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2A44",
  },
  playerSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },
  playerStatusBadge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  playerStatusFilled: {
    backgroundColor: "#E5E7EB",
  },
  playerStatusOpen: {
    backgroundColor: "#DCFCE7",
  },
  playerStatusText: {
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 12,
  },
  playerStatusTextOpen: {
    color: "#166534",
  },
  chatHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  chatCounterText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  chatMessagesBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  emptyChatText: {
    color: "#6B7280",
    fontSize: 14,
  },
  chatMessageBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chatMessageBubbleOwn: {
    backgroundColor: "#DBEAFE",
  },
  chatMessageBubbleOther: {
    backgroundColor: "#E5E7EB",
  },
  chatMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  chatSenderText: {
    color: "#1F2A44",
    fontWeight: "700",
    fontSize: 13,
  },
  chatTimeText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
  },
  chatMessageText: {
    color: "#111827",
    fontSize: 14,
    lineHeight: 20,
  },
  chatComposer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
  },
  chatInput: {
    minHeight: 90,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  chatComposerFooter: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  chatLimitText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },
  chatSendButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chatSendButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  chatSendButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  resultLabel: {
    fontWeight: "700",
    color: "#1F2A44",
  },
  resultValue: {
    color: "#1F2A44",
    fontSize: 15,
  },
  winnerText: {
    color: "#166534",
    fontWeight: "700",
    marginTop: 6,
  },
  helperCopy: {
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  setInputBlock: {
    marginBottom: 12,
  },
  setLabel: {
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 8,
  },
  setInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scoreInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "center",
    fontSize: 16,
    color: "#111827",
  },
  scoreDivider: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4B5563",
  },
  primaryButton: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  noticeBox: {
    marginTop: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeText: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  helperText: {
    marginTop: 10,
    color: "#6B7280",
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "600",
    textAlign: "center",
  },
  inlineErrorText: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 12,
  },
});

export default MatchPage;
