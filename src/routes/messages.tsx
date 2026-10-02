import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MessageSquare, Send, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  validateSearch: (s: Record<string, unknown>) => ({
    propertyId: typeof s.propertyId === "string" ? s.propertyId : undefined,
    landlordId: typeof s.landlordId === "string" ? s.landlordId : undefined,
  }),

  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({
        to: "/login",
      });
    }
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  // ---------------------------------------------------------
  // LOAD CONVERSATIONS
  // ---------------------------------------------------------
  const loadConversations = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
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
      //data = [];
    }

    let rows = (data ?? []) as Conversation[];

    // -------------------------------------------------------
    // START DIRECT CONVERSATION FROM PROPERTY PAGE
    // -------------------------------------------------------
    if (search.propertyId && search.landlordId && user.id !== search.landlordId) {
      const propertyId = Number(search.propertyId);

      if (Number.isFinite(propertyId)) {
        const existing = rows.find(
          (conversation) =>
            conversation.property_id === propertyId &&
            conversation.renter_id === user.id &&
            conversation.landlord_id === search.landlordId,
        );

        // Existing conversation
        if (existing) {
          setSelectedId(existing.id);
        } else {
          // Create new conversation
          const { data: created, error: createError } = await supabase
            .from("conversations")
            .insert({
              property_id: propertyId,
              renter_id: user.id,
              landlord_id: search.landlordId,
            })
            .select("id, property_id, renter_id, landlord_id, created_at, updated_at")
            .single();

          if (!createError && created) {
            const newConversation = created as Conversation;

            rows = [newConversation, ...rows];

            setSelectedId(newConversation.id);
          } else if (createError) {
            console.error("Create conversation:", createError);
          }
        }
      }
    }

    setConversations(rows);

    // Select first conversation if nothing is selected
    if (selectedId === null && rows.length > 0) {
      setSelectedId(rows[0].id);
    }

    setLoading(false);
  };

  // ---------------------------------------------------------
  // LOAD MESSAGES
  // ---------------------------------------------------------
  const loadMessages = async (conversationId: number) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Messages:", error);
      setMessages([]);
      return;
    }

    setMessages((data ?? []) as MessageRow[]);

    // -------------------------------------------------------
    // MARK RECEIVED MESSAGES AS READ
    // -------------------------------------------------------
    if (userId) {
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
    }
  };

  // ---------------------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------------------
  useEffect(() => {
    void loadConversations();
  }, [search.propertyId, search.landlordId]);

  // ---------------------------------------------------------
  // LOAD SELECTED CONVERSATION + REALTIME
  // ---------------------------------------------------------
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedId);

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
        (payload) => {
          const message = payload.new as MessageRow;

          setMessages((current) => {
            if (current.some((item) => item.id === message.id)) {
              return current;
            }

            return [...current, message];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedId, userId]);

  // ---------------------------------------------------------
  // SEND MESSAGE
  // ---------------------------------------------------------
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
    } else if (data) {
      const newMessage = data as MessageRow;

      setMessages((current) => {
        if (current.some((item) => item.id === newMessage.id)) {
          return current;
        }

        return [...current, newMessage];
      });

      setText("");

      // Move conversation to the top
      setConversations((current) =>
        current
          .map((conversation) =>
            conversation.id === selectedConversation.id
              ? {
                  ...conversation,
                  updated_at: new Date().toISOString(),
                }
              : conversation,
          )
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      );
    }

    setSending(false);
  };

  // ---------------------------------------------------------
  // FORMAT TIME
  // ---------------------------------------------------------
  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------
  return (
    <Page>
      <div className="container-page py-6 sm:py-10">
        {/* PAGE HEADER */}
        <div className="mb-5">
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Chat directly with property owners and room seekers.
          </p>
        </div>

        {loading ? (
          <div className="card-surface flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading messages...
          </div>
        ) : (
          <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[280px_1fr]">
            {/* =================================================
                CONVERSATION LIST
            ================================================== */}
            <aside className={`border-r border-border ${selectedId ? "hidden md:block" : "block"}`}>
              <div className="border-b border-border p-4 font-semibold">Conversations</div>

              {conversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <MessageSquare className="mx-auto h-7 w-7" />

                  <p className="mt-3">No conversations yet.</p>

                  <p className="mt-1 text-xs">
                    Open a property and contact the owner to start chatting.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations.map((conversation) => {
                    const isRenter = conversation.renter_id === userId;

                    const isSelected = selectedId === conversation.id;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setSelectedId(conversation.id)}
                        className={`w-full p-4 text-left transition-colors ${
                          isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <UserRound className="h-4 w-4 text-primary" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {isRenter ? "Property Owner" : "Room Seeker"}
                            </p>

                            <p className="truncate text-xs text-muted-foreground">
                              Property #{conversation.property_id ?? "—"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            {/* =================================================
                CHAT SECTION
            ================================================== */}
            <section
              className={`flex min-h-[620px] flex-col ${!selectedId ? "hidden md:flex" : "flex"}`}
            >
              {!selectedId ? (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground" />

                  <h2 className="mt-4 font-semibold">Select a conversation</h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Your conversations will appear here.
                  </p>
                </div>
              ) : (
                <>
                  {/* CHAT HEADER */}
                  <div className="flex items-center gap-3 border-b border-border p-4">
                    <button
                      type="button"
                      className="rounded-md p-1 hover:bg-muted md:hidden"
                      onClick={() => setSelectedId(null)}
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <UserRound className="h-4 w-4 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold">
                        {selectedConversation?.renter_id === userId
                          ? "Property Owner"
                          : "Room Seeker"}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Property #{selectedConversation?.property_id ?? "—"}
                      </p>
                    </div>
                  </div>

                  {/* =================================================
                      MESSAGES
                  ================================================== */}
                  <div className="flex-1 space-y-3 overflow-y-auto p-4">
                    {messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center">
                        <div>
                          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />

                          <p className="mt-3 text-sm text-muted-foreground">
                            Start the conversation.
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Send a message to the{" "}
                            {selectedConversation?.renter_id === userId
                              ? "property owner"
                              : "room seeker"}
                            .
                          </p>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isMine = message.sender_id === userId;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                                isMine
                                  ? "rounded-br-md bg-primary text-primary-foreground"
                                  : "rounded-bl-md bg-muted"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{message.body}</p>

                              <p className="mt-1 text-[10px] opacity-70">
                                {formatMessageTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* =================================================
                      MESSAGE INPUT
                  ================================================== */}
                  <div className="border-t border-border p-3">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void sendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Write a message..."
                        maxLength={5000}
                        disabled={sending}
                        autoComplete="off"
                      />

                      <Button
                        type="submit"
                        disabled={!text.trim() || sending}
                        className="rounded-xl"
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
              )}
            </section>
          </div>
        )}
      </div>
    </Page>
  );
}
