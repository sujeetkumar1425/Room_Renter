import { createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MessageSquare, Send, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type Conversation = {
  id: number;
  property_id: number | null;
  renter_id: string;
  landlord_id: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: number;
  conversation_id: number;
  sender_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
};

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>) => ({
    propertyId: typeof search.propertyId === "string" ? search.propertyId : undefined,
    landlordId: typeof search.landlordId === "string" ? search.landlordId : undefined,
  }),

  beforeLoad: async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, property_id, renter_id, landlord_id, created_at, updated_at")
      .or(`renter_id.eq.${user.id},landlord_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Conversations:", error);
    }

    const rows = (data ?? []) as Conversation[];
  },

  head: () => ({
    meta: [
      { title: "Messages — Room Renter" },
      {
        name: "description",
        content: "Chat directly with property owners on Room Renter.",
      },
    ],
  }),

  component: MessagesPage,
});

function MessagesPage() {
  const search = Route.useSearch();

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const loadConversations = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoadingConversations(false);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from("conversations")
      .select("id, property_id, renter_id, landlord_id, created_at, updated_at")
      .or(`renter_id.eq.${user.id},landlord_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Conversations:", error);
    }

    let rows = (data ?? []) as Conversation[];

    /*
     * Start a direct conversation when the user comes from
     * a property details page.
     */
    if (search.propertyId && search.landlordId && user.id !== search.landlordId) {
      const propertyId = Number(search.propertyId);

      if (Number.isFinite(propertyId)) {
        const existing = rows.find(
          (conversation) =>
            conversation.property_id === propertyId &&
            conversation.renter_id === user.id &&
            conversation.landlord_id === search.landlordId,
        );

        if (existing) {
          setSelectedId(existing.id);
        } else {
          const { data: created, error: createError } = await supabase
            .from("conversations")
            .insert({
              property_id: propertyId,
              renter_id: user.id,
              landlord_id: search.landlordId,
            })
            .select("id, property_id, renter_id, landlord_id, created_at, updated_at")
            .single();

          if (createError) {
            console.error("Create conversation:", createError);
          } else if (created) {
            const newConversation = created as Conversation;

            rows = [newConversation, ...rows];
            setSelectedId(newConversation.id);
          }
        }
      }
    }

    rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    setConversations(rows);

    if (rows.length > 0 && selectedId === null && !search.propertyId) {
      setSelectedId(rows[0].id);
    }

    setLoadingConversations(false);
  }, [search.propertyId, search.landlordId, selectedId]);

  const loadMessages = useCallback(
    async (conversationId: number) => {
      if (!userId) {
        return;
      }

      setLoadingMessages(true);

      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at, read_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Messages:", error);
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      setMessages((data ?? []) as MessageRow[]);

      const { error: readError } = await supabase
        .from("messages")
        .update({
          read_at: new Date().toISOString(),
        })
        .eq("conversation_id", conversationId)
        .neq("sender_id", userId)
        .is("read_at", null);

      if (readError) {
        console.error("Mark messages as read:", readError);
      }

      setMessages((current) =>
        current.map((message) =>
          message.sender_id !== userId && !message.read_at
            ? {
                ...message,
                read_at: new Date().toISOString(),
              }
            : message,
        ),
      );

      setLoadingMessages(false);
    },
    [userId],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedId);
  }, [loadMessages, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const channel = supabase
      .channel(`conversation-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        async (payload) => {
          const newMessage = payload.new as MessageRow;

          setMessages((current) => {
            if (current.some((message) => message.id === newMessage.id)) {
              return current;
            }

            return [...current, newMessage];
          });

          if (userId && newMessage.sender_id !== userId) {
            await supabase
              .from("messages")
              .update({
                read_at: new Date().toISOString(),
              })
              .eq("id", newMessage.id)
              .is("read_at", null);
          }

          await loadConversations();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadConversations, selectedId, userId]);

  const sendMessage = async () => {
    const body = text.trim();

    if (!body || !selectedConversation || !userId || sending) {
      return;
    }

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: userId,
        body,
      })
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .single();

    if (error) {
      console.error("Send message:", error);
      alert(error.message);
      setSending(false);
      return;
    }

    if (data) {
      setMessages((current) => {
        if (current.some((message) => message.id === data.id)) {
          return current;
        }

        return [...current, data as MessageRow];
      });
    }

    /*
     * Keep the conversation at the top of the list.
     * If RLS prevents this update, the message itself is still sent.
     */
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedConversation.id);

    if (updateError) {
      console.error("Update conversation timestamp:", updateError);
    }

    setText("");
    setSending(false);

    await loadConversations();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const getOtherUserId = (conversation: Conversation) => {
    if (!userId) {
      return "";
    }

    return conversation.renter_id === userId ? conversation.landlord_id : conversation.renter_id;
  };

  return (
    <Page>
      <div className="mx-auto flex h-[calc(100vh-140px)] max-w-7xl overflow-hidden rounded-2xl border bg-background shadow-sm">
        {/* Conversation list */}
        <aside
          className={`w-full border-r border-border md:w-[340px] ${
            selectedId ? "hidden md:block" : "block"
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
                    const isSelected = conversation.id === selectedId;
                    const otherUserId = getOtherUserId(conversation);

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setSelectedId(conversation.id)}
                        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50 ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
                          <UserRound className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {conversation.renter_id === userId ? "Property Owner" : "Room Seeker"}
                          </p>

                          <p className="truncate text-xs text-muted-foreground">
                            {otherUserId || "Conversation"}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(conversation.updated_at).toLocaleDateString()}
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
          className={`flex min-w-0 flex-1 flex-col ${!selectedId ? "hidden md:flex" : "flex"}`}
        >
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <header className="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedId(null)}
                  title="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <UserRound className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    {selectedConversation.renter_id === userId ? "Property Owner" : "Room Seeker"}
                  </h2>

                  <p className="text-xs text-muted-foreground">Direct conversation</p>
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
                      Send a message to discuss the property, visit timing, rent, or anything else.
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
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>

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

              {/* Message input */}
              <div className="border-t bg-background p-3 sm:p-4">
                <div className="mx-auto flex max-w-3xl gap-2">
                  <Input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    disabled={sending}
                    className="h-11 rounded-xl"
                  />

                  <Button
                    type="button"
                    onClick={() => void sendMessage()}
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
                </div>
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
