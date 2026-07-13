import ChatList from "@/components/ChatList";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Persistent conversation list on desktop */}
      <ChatList className="hidden w-[350px] shrink-0 md:flex" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
