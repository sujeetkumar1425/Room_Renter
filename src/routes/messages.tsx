import { createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MessageSquare, Send, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type MessageRow = {
  id: number;
  sender_id: string;
  receiver_id: string;
  property_id: number | null;
  message: string;
  created_at: string;
};

type Conversation = {
  key: string;
  property_id: number | null;
  other_user_id: string;
  last_message: string;
  updated_at: string;
};

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>) => ({
    propertyId: typeof search.propertyId === "string" ? search.propertyId : undefined,

    landlordId: typeof search.landlordId === "string" ? search.landlordId : undefined,
  }),

  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }
  },

  head: () => ({
    meta: [
      {
        title: "Messages — Room Renter",
      },
      {
        name: "description",
        content: "Chat directly with property owners on Room Renter.",
      },
    ],
  }),

  component: MessagesPage,
});

function makeConversationKey(propertyId: number | null, otherUserId: string) {
  return `${propertyId ?? "none"}:${otherUserId}`;
}

function MessagesPage() {
  const search = Route.useSearch();

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  /*
   * Property page sends:
   *
   * /messages?propertyId=7&landlordId=UUID
   *
   * This lets us open a new chat even before the first
   * message has been sent.
   */
  const directPropertyId = useMemo(() => {
    if (!search.propertyId) {
      return null;
    }

    const value = Number(search.propertyId);

    return Number.isFinite(value) ? value : null;
  }, [search.propertyId]);

  const directLandlordId = search.landlordId ?? null;

  const directConversationKey = useMemo(() => {
    if (directPropertyId === null || !directLandlordId) {
      return null;
    }

    return makeConversationKey(directPropertyId, directLandlordId);
  }, [directPropertyId, directLandlordId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.key === selectedKey) ?? null,
    [conversations, selectedKey],
  );

  /*
   * If the user came directly from a property page,
   * we can have a selected chat even when there are
   * no messages yet.
   */
  const selectedPropertyId =
    selectedConversation?.property_id ??
    (selectedKey === directConversationKey ? directPropertyId : null);

  const selectedOtherUserId =
    selectedConversation?.other_user_id ??
    (selectedKey === directConversationKey ? directLandlordId : null);

  const loadConversations = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setConversations([]);
      setSelectedKey(null);
      setLoadingConversations(false);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, property_id, message, created_at")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Load messages:", error);
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    const rows = (data ?? []) as MessageRow[];

    const grouped = new Map<string, Conversation>();

    for (const row of rows) {
      const otherUserId = row.sender_id === user.id ? row.receiver_id : row.sender_id;

      const key = makeConversationKey(row.property_id, otherUserId);

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          property_id: row.property_id,
          other_user_id: otherUserId,
          last_message: row.message,
          updated_at: row.created_at,
        });
      }
    }

    const result = Array.from(grouped.values()).sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );

    setConversations(result);

    /*
     * If opened from a property page, always open
     * that property/landlord chat.
     */
    if (directConversationKey) {
      setSelectedKey(directConversationKey);
    } else {
      setSelectedKey((current) => {
        if (current && result.some((conversation) => conversation.key === current)) {
          return current;
        }

        return result[0]?.key ?? null;
      });
    }

    setLoadingConversations(false);
  }, [directConversationKey]);

  const loadMessages = useCallback(
    async (propertyId: number | null, otherUserId: string | null) => {
      if (!userId || !otherUserId) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);

      let query = supabase
        .from("messages")
        .select("id, sender_id, receiver_id, property_id, message, created_at")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      if (propertyId !== null) {
        query = query.eq("property_id", propertyId);
      } else {
        query = query.is("property_id", null);
      }

      const { data, error } = await query.order("created_at", {
        ascending: true,
      });

      if (error) {
        console.error("Load conversation:", error);
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      const conversationMessages = ((data ?? []) as MessageRow[]).filter(
        (message) =>
          (message.sender_id === userId && message.receiver_id === otherUserId) ||
          (message.sender_id === otherUserId && message.receiver_id === userId),
      );

      setMessages(conversationMessages);
      setLoadingMessages(false);
    },
    [userId],
  );

  /*
   * Load conversations when the page opens or the
   * property/landlord in the URL changes.
   */
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  /*
   * Load the selected conversation.
   */
  useEffect(() => {
    if (!selectedOtherUserId || selectedPropertyId === null) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedPropertyId, selectedOtherUserId);
  }, [loadMessages, selectedOtherUserId, selectedPropertyId]);

  /*
   * Realtime messages.
   */
  useEffect(() => {
    if (!userId || selectedPropertyId === null) {
      return;
    }

    const channel = supabase
      .channel(`messages-property-${selectedPropertyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `property_id=eq.${selectedPropertyId}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;

          const belongsToConversation =
            (newMessage.sender_id === userId && newMessage.receiver_id === selectedOtherUserId) ||
            (newMessage.sender_id === selectedOtherUserId && newMessage.receiver_id === userId);

          if (!belongsToConversation) {
            return;
          }

          setMessages((current) => {
            if (current.some((message) => message.id === newMessage.id)) {
              return current;
            }

            return [...current, newMessage];
          });

          void loadConversations();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadConversations, selectedOtherUserId, selectedPropertyId, userId]);

  const sendMessage = async () => {
    const body = text.trim();

    if (!body || !userId || !selectedOtherUserId || selectedPropertyId === null || sending) {
      return;
    }

    if (userId === selectedOtherUserId) {
      alert("You cannot message yourself.");
      return;
    }

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        receiver_id: selectedOtherUserId,
        property_id: selectedPropertyId,
        message: body,
      })
      .select("id, sender_id, receiver_id, property_id, message, created_at")
      .single();

    if (error) {
      console.error("Send message:", error);
      alert(error.message);
      setSending(false);
      return;
    }

    if (data) {
      const newMessage = data as MessageRow;

      setMessages((current) => {
        if (current.some((message) => message.id === newMessage.id)) {
          return current;
        }

        return [...current, newMessage];
      });
    }

    setText("");
    setSending(false);

    await loadConversations();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedKey(conversation.key);
  };

  return (
    <Page>
      <div className="mx-auto flex h-[calc(100vh-140px)] max-w-7xl overflow-hidden rounded-2xl border bg-background shadow-sm">
        {/* Conversation list */}
        <aside
          className={`w-full border-r border-border md:w-[340px] ${
            selectedKey ? "hidden md:block" : "block"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <h1 className="text-lg font-semibold">Messages</h1>

                  <p className="text-sm text-muted-foreground">Your conversations</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConversations ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <MessageSquare className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <h2 className="font-medium">No conversations yet.</h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Contact a property owner to start a conversation.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conversation) => {
                    const isSelected = conversation.key === selectedKey;

                    return (
                      <button
                        key={conversation.key}
                        type="button"
                        onClick={() => selectConversation(conversation)}
                        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50 ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
                          <UserRound className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-medium">Property Owner</p>

                          <p className="text-xs text-muted-foreground">
                            Property #{conversation.property_id ?? "—"}
                          </p>

                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {conversation.last_message}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Chat */}
        <section
          className={`flex min-w-0 flex-1 flex-col ${!selectedKey ? "hidden md:flex" : "flex"}`}
        >
          {selectedKey && selectedOtherUserId && selectedPropertyId !== null ? (
            <>
              {/* Chat header */}
              <header className="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedKey(null)}
                  title="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <UserRound className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <h2 className="font-semibold">Property Owner</h2>

                  <p className="text-xs text-muted-foreground">Property #{selectedPropertyId}</p>
                </div>
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="h-6 w-6 text-muted-foreground" />
                    </div>

                    <h3 className="font-medium">Start the conversation</h3>

                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Ask the property owner about rent, availability, facilities, or a visit.
                    </p>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-3xl flex-col gap-3">
                    {messages.map((message) => {
                      const isMine = message.sender_id === userId;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                              isMine
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md bg-muted"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.message}</p>

                            <p
                              className={`mt-1 text-[10px] ${
                                isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t bg-background p-3 sm:p-4">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendMessage();
                  }}
                  className="mx-auto flex max-w-3xl gap-2"
                >
                  <Input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    maxLength={5000}
                    disabled={sending}
                    className="h-11 rounded-xl"
                  />

                  <Button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className="h-11 rounded-xl px-4"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}

                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-7 w-7 text-muted-foreground" />
              </div>

              <h2 className="text-lg font-semibold">Select a conversation</h2>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Choose a conversation from the left to view your messages.
              </p>
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
